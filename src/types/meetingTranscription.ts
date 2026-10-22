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
  /** Quem falou: nomes no Teams, rótulos SPEAKER_NN na gravação. Derivado no banco. */
  participants: string[];
  /** Nome dado a cada voz da gravação (no Teams, vazio: o nome já vem). */
  speakers: SpeakerName[];
  /** Primeiras falas, para reconhecer a reunião sem abrir. */
  preview: string | null;
  /** Resumo trazido pela equipe — gerado na IA de cada um e colado ou importado. */
  summary: string | null;
  summaryUpdatedAt: string | null;
  summaryUpdatedByName: string | null;
}

export interface MeetingTranscriptionDetail extends MeetingTranscriptionListItem {
  language: string | null;
  transcriptText: string | null;
  segments: TranscriptSegment[];
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
  /** Pauta antes, ata manual se o Teams não transcreveu. */
  notes: string | null;
  notesUpdatedAt: string | null;
  notesUpdatedByName: string | null;
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


/** Tipo de entrada da linha do tempo: a transcrição, ou a reunião vinculada ainda sem texto. */
export const MEETING_TIMELINE_ENTRY_KIND = {
  TRANSCRICAO: 'transcription',
  REUNIAO: 'meeting',
} as const;

/** Uma reunião na linha do tempo da aba: a que foi transcrita, ou a vinculada que ainda não tem texto. */
export type MeetingTimelineEntry =
  | {
      kind: typeof MEETING_TIMELINE_ENTRY_KIND.TRANSCRICAO;
      key: string;
      when: string;
      item: MeetingTranscriptionListItem;
      /** Reunião do Teams vinculada de onde veio, se ainda acompanhada. */
      meeting: ProjectTeamsMeeting | null;
    }
  | {
      kind: typeof MEETING_TIMELINE_ENTRY_KIND.REUNIAO;
      key: string;
      when: string;
      meeting: ProjectTeamsMeeting;
      status: LinkedMeetingStatus;
    };

export interface MeetingTimelineDay {
  /** "Hoje", "Ontem", "Amanhã" ou a data por extenso. */
  label: string;
  entries: MeetingTimelineEntry[];
}

/** Filtros da aba Reuniões. */
export const MEETING_TIMELINE_FILTER = {
  TODAS: 'todas',
  TRANSCRITAS: 'transcritas',
  SEM_RESUMO: 'sem_resumo',
  PENDENTES: 'pendentes',
} as const;

export type MeetingTimelineFilter = (typeof MEETING_TIMELINE_FILTER)[keyof typeof MEETING_TIMELINE_FILTER];

/** O que vai junto das instruções no "Copiar para a IA". */
export interface SummaryPromptInput {
  subject: string;
  when: string;
  durationSeconds: number | null;
  participants: string[];
  transcript: string;
}
