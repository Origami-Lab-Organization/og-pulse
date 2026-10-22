/**
 * Transcrição de reunião (ADR-0039): a gravação do Teams fica no OneDrive, o texto fica no
 * Pulse, na aba Reuniões do projeto.
 */

/** Estado do trabalho, como o enum `meeting_transcription_status` do banco. */
export const MEETING_TRANSCRIPTION_STATUS = {
  PENDENTE: 'pendente',
  PROCESSANDO: 'processando',
  CONCLUIDA: 'concluida',
  FALHOU: 'falhou',
} as const;

export type MeetingTranscriptionStatus =
  (typeof MEETING_TRANSCRIPTION_STATUS)[keyof typeof MEETING_TRANSCRIPTION_STATUS];

/**
 * De onde veio o texto: a transcrição do próprio Teams, que chega sozinha (ADR-0052), ou uma
 * gravação enviada para o worker do WhisperX (ADR-0039, plano B).
 */
export const MEETING_TRANSCRIPTION_SOURCE = {
  TEAMS: 'teams',
  GRAVACAO: 'gravacao',
} as const;

export type MeetingTranscriptionSource =
  (typeof MEETING_TRANSCRIPTION_SOURCE)[keyof typeof MEETING_TRANSCRIPTION_SOURCE];

/** Uma fala, como o WhisperX devolve. `speaker` é o rótulo da voz (SPEAKER_00), sem nome. */
export interface TranscriptSegment {
  start: number;
  end: number;
  speaker: string | null;
  text: string;
}

/** Falas seguidas da mesma voz, juntas como numa ata. */
export interface TranscriptBlock {
  speaker: string | null;
  start: number;
  text: string;
}

/** Nome que quem participou deu a uma voz. */
export interface SpeakerName {
  label: string;
  name: string;
}

export interface MeetingTranscriptionListItem {
  id: string;
  projectId: string;
  source: MeetingTranscriptionSource;
  icalUid: string | null;
  eventSubject: string;
  occurredAt: string | null;
  /** Reunião do Teams de onde veio ('teams'); liga a transcrição à reunião vinculada. */
  onlineMeetingId: string | null;
  recordingDriveId: string | null;
  recordingItemId: string | null;
  recordingWebUrl: string | null;
  status: MeetingTranscriptionStatus;
  lastError: string | null;
  durationSeconds: number | null;
  requestedById: string;
  requestedByName: string | null;
  createdAt: string;
  updatedAt: string;
  claimedAt: string | null;
  finishedAt: string | null;
}

export interface MeetingTranscriptionDetail extends MeetingTranscriptionListItem {
  language: string | null;
  transcriptText: string | null;
  segments: TranscriptSegment[];
  speakers: SpeakerName[];
}

/** Gravação do OneDrive que pode virar transcrição. */
export interface RecordingFile {
  driveId: string;
  itemId: string;
  name: string;
  webUrl: string | null;
  lastModifiedAt: string;
  size: number;
}

/** Rito do projeto, usado para reconhecer a gravação de uma reunião dele. */
export interface ProjectRitoEvent {
  icalUid: string;
  eventTitle: string;
}

export interface RequestTranscriptionInput {
  projectId: string;
  recording: Pick<RecordingFile, 'driveId' | 'itemId' | 'webUrl'>;
  eventSubject: string;
  occurredAt: string | null;
  icalUid: string | null;
}

/** Corpo da Edge Function `transcription-enqueue`. A URL de download nunca volta. */
export interface EnqueueTranscriptionPayload {
  projectId: string;
  icalUid: string | null;
  eventSubject: string;
  occurredAt: string | null;
  recordingDriveId: string;
  recordingItemId: string;
  recordingWebUrl: string | null;
  downloadUrl: string;
  expiresAt: string;
}

/** Reunião do Teams que o projeto acompanha: a transcrição dela chega sozinha. */
export interface ProjectTeamsMeeting {
  id: string;
  projectId: string;
  projectName: string | null;
  onlineMeetingId: string;
  eventSubject: string;
  icalUid: string | null;
  /** Numa série, da ocorrência usada para vincular. Null em vínculo anterior a 22/10/2026. */
  startsAt: string | null;
  endsAt: string | null;
  isSeries: boolean;
  registeredById: string;
  registeredByName: string | null;
  lastCheckedAt: string | null;
  /** Já escrito para a tela pela sincronização. */
  lastError: string | null;
  createdAt: string;
}

/** Depois de criar ou vincular uma reunião do Teams: gravar sozinha e/ou trazer para o projeto. */
export interface TeamsMeetingSetupInput {
  joinUrl: string;
  eventSubject: string;
  icalUid: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isSeries: boolean;
  recordAutomatically: boolean;
  /** Projeto que recebe a transcrição; null não vincula. */
  projectId: string | null;
}

export interface TeamsMeetingSetupResult {
  /** Idioma falado definido como português — sem ele o Teams transcreve como inglês. */
  languageSet: boolean;
  recordingTurnedOn: boolean;
  linkedToProject: boolean;
}

/** Corpo da Edge Function `teams-meeting-register`. */
export interface RegisterTeamsMeetingPayload {
  projectId: string;
  onlineMeetingId: string;
  joinWebUrl: string | null;
  icalUid: string | null;
  eventSubject: string;
  startsAt: string | null;
  endsAt: string | null;
  isSeries: boolean;
  idToken: string;
}

/** Situação de uma reunião vinculada, do ponto de vista da transcrição dela. */
export const LINKED_MEETING_STATUS = {
  AGENDADA: 'agendada',
  AGUARDANDO: 'aguardando',
  TRANSCRITA: 'transcrita',
  SEM_TRANSCRICAO: 'sem_transcricao',
  COM_PROBLEMA: 'com_problema',
} as const;

export type LinkedMeetingStatus = (typeof LINKED_MEETING_STATUS)[keyof typeof LINKED_MEETING_STATUS];

/** Reunião vinculada com as transcrições que já chegaram dela (uma por ocorrência). */
export interface LinkedMeetingGroup {
  meeting: ProjectTeamsMeeting;
  transcriptions: MeetingTranscriptionListItem[];
  status: LinkedMeetingStatus;
}
