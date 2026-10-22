import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  acquireGraphTokenForScopes,
  acquireMicrosoftIdToken,
  MicrosoftNotConnectedError,
} from '@/integrations/microsoft/msalClient';
import {
  FILES_SCOPES,
  GraphError,
  ONLINE_MEETING_SCOPES,
  enableAutomaticRecording,
  findOnlineMeetingId,
  findRecordingsFolder,
  getDriveDownloadUrl,
  getMyDriveRoot,
} from '@/services/microsoftGraphService';
import { meetingTranscriptionService } from '@/services/meetingTranscriptionService';
import { describeGraphError } from '@/hooks/useMicrosoftGraph';
import { DOWNLOAD_URL_LIFETIME_MS, normalizeSpeakers, normalizeSubject } from '@/lib/meetingTranscription';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import {
  MEETING_TRANSCRIPTION_STATUS,
  type MeetingTranscriptionListItem,
  type RequestTranscriptionInput,
  type SpeakerName,
  type TeamsMeetingSetupInput,
  type TeamsMeetingSetupResult,
} from '@/types/meetingTranscription';

const TRANSCRIPTIONS_KEY = 'meeting-transcriptions';
const TRANSCRIPTION_KEY = 'meeting-transcription';
const TEAMS_MEETINGS_KEY = 'project-teams-meetings';

/** Enquanto houver trabalho andando, a lista se atualiza sozinha. */
const IN_PROGRESS_REFRESH_MS = 30_000;

function hasWorkInProgress(items: MeetingTranscriptionListItem[] | undefined): boolean {
  return (items ?? []).some(
    (item) =>
      item.status === MEETING_TRANSCRIPTION_STATUS.PENDENTE ||
      item.status === MEETING_TRANSCRIPTION_STATUS.PROCESSANDO,
  );
}

/** Transcrições do projeto, da mais recente para a mais antiga. */
export function useMeetingTranscriptions(projectId: string, search: string) {
  return useQuery({
    queryKey: [TRANSCRIPTIONS_KEY, projectId, search],
    queryFn: () => meetingTranscriptionService.listByProject(projectId, search),
    refetchInterval: (query) =>
      hasWorkInProgress(query.state.data) ? IN_PROGRESS_REFRESH_MS : false,
  });
}

/** Transcrição aberta, com o texto e as falas. */
export function useMeetingTranscriptionDetail(id: string | null) {
  return useQuery({
    queryKey: [TRANSCRIPTION_KEY, id],
    enabled: Boolean(id),
    queryFn: () => meetingTranscriptionService.getById(id as string),
  });
}

export function useProjectRitoEvents(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['project-rito-events', projectId],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: () => meetingTranscriptionService.listProjectRitos(projectId),
  });
}

/**
 * Pasta por onde o seletor começa: a de gravações do Teams no OneDrive da pessoa, ou a
 * raiz, se ela ainda não tem nenhuma gravação.
 */
export function useRecordingStartFolder(enabled: boolean) {
  return useQuery({
    queryKey: ['recording-start-folder'],
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const token = await acquireGraphTokenForScopes(FILES_SCOPES);
      const recordings = await findRecordingsFolder(token);
      return { folder: recordings ?? (await getMyDriveRoot(token)), isRecordings: Boolean(recordings) };
    },
  });
}

function requestErrorMessage(error: unknown): string {
  if (error instanceof MicrosoftNotConnectedError || error instanceof GraphError) {
    return describeGraphError(error);
  }
  return mensagemParaUsuario(error);
}

/**
 * Resolve no navegador a URL de download da gravação — com o token da própria pessoa — e
 * envia para a fila. O worker nunca recebe credencial do Graph (ADR-0039).
 */
export function useRequestTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RequestTranscriptionInput) => {
      const token = await acquireGraphTokenForScopes(FILES_SCOPES);
      const downloadUrl = await getDriveDownloadUrl(
        token,
        input.recording.driveId,
        input.recording.itemId,
      );

      await meetingTranscriptionService.enqueue({
        projectId: input.projectId,
        icalUid: input.icalUid,
        eventSubject: normalizeSubject(input.eventSubject),
        occurredAt: input.occurredAt,
        recordingDriveId: input.recording.driveId,
        recordingItemId: input.recording.itemId,
        recordingWebUrl: input.recording.webUrl,
        downloadUrl,
        expiresAt: new Date(Date.now() + DOWNLOAD_URL_LIFETIME_MS).toISOString(),
      });
    },
    onSuccess: (_, input) => {
      queryClient.invalidateQueries({ queryKey: [TRANSCRIPTIONS_KEY, input.projectId] });
      toast.success('Gravação enviada para transcrição.', {
        description: 'Você recebe um aviso no sino quando ela ficar pronta.',
      });
    },
    onError: (error) => {
      toast.error(requestErrorMessage(error));
    },
  });
}

export function useUpdateTranscriptionSpeakers(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; speakers: SpeakerName[] }) =>
      meetingTranscriptionService.updateSpeakers(variables.id, normalizeSpeakers(variables.speakers)),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TRANSCRIPTION_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [TRANSCRIPTIONS_KEY, projectId] });
      toast.success('Nomes das vozes salvos.');
    },
    onError: (error) => {
      toast.error(mensagemParaUsuario(error));
    },
  });
}

export function useUpdateTranscriptionSubject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { id: string; eventSubject: string }) =>
      meetingTranscriptionService.updateSubject(variables.id, normalizeSubject(variables.eventSubject)),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TRANSCRIPTION_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [TRANSCRIPTIONS_KEY, projectId] });
      toast.success('Título atualizado.');
    },
    onError: (error) => {
      toast.error(mensagemParaUsuario(error));
    },
  });
}

export function useDeleteTranscription(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => meetingTranscriptionService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRANSCRIPTIONS_KEY, projectId] });
      toast.success('Transcrição removida. A gravação continua no OneDrive.');
    },
    onError: (error) => {
      toast.error(
        mensagemParaUsuario(error, 'Não foi possível remover a transcrição. Tente de novo em instantes.'),
      );
    },
  });
}

/** Reuniões do Teams que o projeto acompanha — a transcrição delas chega sozinha. */
export function useProjectTeamsMeetings(projectId: string) {
  return useQuery({
    queryKey: [TEAMS_MEETINGS_KEY, 'project', projectId],
    queryFn: () => meetingTranscriptionService.listTeamsMeetingsByProject(projectId),
  });
}

/** Projetos que recebem a transcrição desta reunião da Agenda. */
export function useEventTeamsMeetings(icalUid: string | null) {
  return useQuery({
    queryKey: [TEAMS_MEETINGS_KEY, 'event', icalUid],
    enabled: Boolean(icalUid),
    queryFn: () => meetingTranscriptionService.listTeamsMeetingsByIcalUid(icalUid as string),
  });
}

export function useStopFollowingTeamsMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => meetingTranscriptionService.removeTeamsMeeting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEAMS_MEETINGS_KEY] });
      toast.success('A transcrição desta reunião deixa de vir para o projeto. As que já vieram ficam.');
    },
    onError: (error) => {
      toast.error(mensagemParaUsuario(error, 'Não foi possível parar de acompanhar. Tente de novo em instantes.'));
    },
  });
}

async function linkToProject(input: TeamsMeetingSetupInput, onlineMeetingId: string): Promise<void> {
  const idToken = await acquireMicrosoftIdToken();
  await meetingTranscriptionService.registerTeamsMeeting({
    projectId: input.projectId as string,
    onlineMeetingId,
    joinWebUrl: input.joinUrl,
    icalUid: input.icalUid,
    eventSubject: normalizeSubject(input.eventSubject),
    idToken,
  });
}

/** Cada passo falha sozinho: a gravação não ligar não impede a transcrição de ir para o projeto. */
async function attempt(step: () => Promise<void>, failures: unknown[]): Promise<boolean> {
  try {
    await step();
    return true;
  } catch (error) {
    failures.push(error);
    return false;
  }
}

/**
 * Depois de criar ou vincular uma reunião do Teams: liga "gravar e transcrever
 * automaticamente" e/ou vincula ao projeto, para a transcrição chegar sozinha (ADR-0052).
 * O escopo de reuniões é pedido só aqui.
 */
async function setUpTeamsMeeting(input: TeamsMeetingSetupInput) {
  const failures: unknown[] = [];
  const token = await acquireGraphTokenForScopes(ONLINE_MEETING_SCOPES);
  const onlineMeetingId = await findOnlineMeetingId(token, input.joinUrl);

  const recordingTurnedOn =
    input.recordAutomatically && (await attempt(() => enableAutomaticRecording(token, onlineMeetingId), failures));
  const linkedToProject =
    Boolean(input.projectId) && (await attempt(() => linkToProject(input, onlineMeetingId), failures));

  return { recordingTurnedOn, linkedToProject, failures };
}

function warnAboutSetup(input: TeamsMeetingSetupInput, result: TeamsMeetingSetupResult, failures: unknown[]) {
  if (input.recordAutomatically && !result.recordingTurnedOn) {
    toast.warning('A gravação automática não foi ligada.', {
      description: 'Lembre de gravar e transcrever pelo Teams quando a reunião começar.',
    });
  }
  if (input.projectId && !result.linkedToProject) {
    toast.warning('A transcrição desta reunião não vai vir sozinha para o projeto.', {
      description: requestErrorMessage(failures[failures.length - 1]),
    });
  }
}

export function useSetUpTeamsMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TeamsMeetingSetupInput): Promise<TeamsMeetingSetupResult> => {
      const { failures, ...result } = await setUpTeamsMeeting(input);
      warnAboutSetup(input, result, failures);
      return result;
    },
    onSuccess: (result) => {
      if (!result.linkedToProject) return;
      queryClient.invalidateQueries({ queryKey: [TEAMS_MEETINGS_KEY] });
      toast.success('A transcrição desta reunião vai aparecer sozinha na aba Reuniões do projeto.');
    },
    onError: (error) => {
      toast.warning('Não foi possível preparar a reunião do Teams.', {
        description: requestErrorMessage(error),
      });
    },
  });
}
