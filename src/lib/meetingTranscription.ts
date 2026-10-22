import {
  LINKED_MEETING_STATUS,
  MEETING_TRANSCRIPTION_STATUS,
  type LinkedMeetingGroup,
  type LinkedMeetingStatus,
  type MeetingTranscriptionListItem,
  type MeetingTranscriptionStatus,
  type ProjectTeamsMeeting,
  type ProjectRitoEvent,
  type SpeakerName,
  type TranscriptBlock,
  type TranscriptSegment,
} from '@/types/meetingTranscription';

export const MEETING_TRANSCRIPTION_STATUS_LABEL: Record<MeetingTranscriptionStatus, string> = {
  [MEETING_TRANSCRIPTION_STATUS.PENDENTE]: 'Na fila',
  [MEETING_TRANSCRIPTION_STATUS.PROCESSANDO]: 'Transcrevendo',
  [MEETING_TRANSCRIPTION_STATUS.CONCLUIDA]: 'Pronta',
  [MEETING_TRANSCRIPTION_STATUS.FALHOU]: 'Não concluída',
};

/**
 * Quanto tempo a URL de download resolvida pelo navegador é tratada como válida. A
 * Microsoft não promete prazo para `@microsoft.graph.downloadUrl`; com folga, o worker
 * desiste antes de baixar pela metade e a pessoa só pede de novo (ADR-0039).
 */
export const DOWNLOAD_URL_LIFETIME_MS = 50 * 60 * 1000;

/** Acima disto, trabalho parado indica worker fora do ar, não fila cheia. */
const STUCK_PENDING_MS = 2 * 60 * 60 * 1000;
const STUCK_PROCESSING_MS = 3 * 60 * 60 * 1000;

const RECORDING_EXTENSIONS = ['mp4', 'm4a', 'mp3', 'wav', 'webm', 'mov', 'mkv', 'ogg', 'aac'];

/** Sufixos que o Teams põe no nome do arquivo de gravação, nos idiomas do time. */
const TEAMS_RECORDING_SUFFIX = /-(meeting recording|gravação de reunião|gravação da reunião)$/i;
const TEAMS_RECORDING_STAMP = /-\d{8}_\d{6}(utc)?$/i;

const MAX_SPEAKER_NAME = 120;
const MAX_SUBJECT = 400;

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/** Arquivo de áudio ou vídeo que o worker sabe transcrever. */
export function isRecordingFile(name: string): boolean {
  return RECORDING_EXTENSIONS.includes(extensionOf(name));
}

function withoutExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? name : name.slice(0, dot);
}

/** "Daily Cobrança-20261020_140312-Gravação de Reunião.mp4" → "Daily Cobrança". */
export function titleFromRecordingName(name: string): string {
  const title = withoutExtension(name)
    .trim()
    .replace(TEAMS_RECORDING_SUFFIX, '')
    .replace(TEAMS_RECORDING_STAMP, '')
    .trim();
  return (title || withoutExtension(name).trim() || 'Reunião').slice(0, MAX_SUBJECT);
}

function comparable(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Rito do projeto cujo título abre o nome da gravação — o Teams nomeia o arquivo pelo
 * assunto da reunião. É sugestão: a pessoa confirma antes de enviar (ADR-0039).
 */
export function matchRitoForRecording(
  recordingName: string,
  ritos: readonly ProjectRitoEvent[],
): ProjectRitoEvent | null {
  const title = comparable(titleFromRecordingName(recordingName));
  const matches = ritos.filter((rito) => {
    const ritoTitle = comparable(rito.eventTitle);
    return ritoTitle.length > 0 && title.startsWith(ritoTitle);
  });
  if (!matches.length) return null;
  return matches.reduce((best, rito) => (rito.eventTitle.length > best.eventTitle.length ? rito : best));
}

/** Vozes na ordem em que falaram pela primeira vez. */
export function speakerLabels(segments: readonly TranscriptSegment[]): string[] {
  const labels = new Set<string>();
  segments.forEach((segment) => {
    if (segment.speaker) labels.add(segment.speaker);
  });
  return [...labels];
}

/** Nome dado à voz, ou "Voz N" na ordem de aparição enquanto ninguém nomeou. */
/** Rótulo de voz do WhisperX. A transcrição do Teams já traz o nome de quem falou no lugar. */
const WHISPER_SPEAKER_LABEL = /^SPEAKER_\d+$/;

export function speakerDisplayName(
  label: string | null,
  speakers: readonly SpeakerName[],
  labels: readonly string[],
): string {
  if (!label) return 'Fala';
  const named = speakers.find((speaker) => speaker.label === label)?.name;
  if (named) return named;
  if (!WHISPER_SPEAKER_LABEL.test(label)) return label;
  const position = labels.indexOf(label);
  return position < 0 ? 'Voz' : `Voz ${position + 1}`;
}

/**
 * Quando a fala aconteceu. Com o início da transcrição conhecido (Teams), a hora do relógio —
 * 08:00:15; sem ele (gravação enviada), o tempo desde o começo da gravação — 00:15.
 */
export function speechTime(startedAt: string | null, offsetSeconds: number): string {
  const start = startedAt ? Date.parse(startedAt) : Number.NaN;
  if (Number.isNaN(start)) return formatTimestamp(offsetSeconds);
  return new Date(start + Math.max(0, offsetSeconds) * 1000).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Nomes digitados, sem vazios e com tamanho limitado. */
export function normalizeSpeakers(speakers: readonly SpeakerName[]): SpeakerName[] {
  return speakers
    .map((speaker) => ({ label: speaker.label, name: speaker.name.trim().slice(0, MAX_SPEAKER_NAME) }))
    .filter((speaker) => speaker.name.length > 0);
}

/** Falas seguidas da mesma voz viram um bloco só, como numa ata. */
export function groupSegments(segments: readonly TranscriptSegment[]): TranscriptBlock[] {
  const blocks: TranscriptBlock[] = [];
  segments.forEach((segment) => {
    const text = segment.text.trim();
    if (!text) return;
    const last = blocks[blocks.length - 1];
    if (last && last.speaker === segment.speaker) {
      last.text = `${last.text} ${text}`;
      return;
    }
    blocks.push({ speaker: segment.speaker, start: segment.start, text });
  });
  return blocks;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** 83 → "01:23"; 3723 → "1:02:03". */
export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${pad(minutes)}:${pad(rest)}`;
}

/** Texto corrido com o nome dado a cada voz, para colar numa ata. */
export function transcriptAsText(
  segments: readonly TranscriptSegment[],
  speakers: readonly SpeakerName[],
  startedAt: string | null = null,
): string {
  const labels = speakerLabels(segments);
  return groupSegments(segments)
    .map((block) => {
      const who = speakerDisplayName(block.speaker, speakers, labels);
      return `[${speechTime(startedAt, block.start)}] ${who}: ${block.text}`;
    })
    .join('\n\n');
}

/** 2520 → "42 min"; 3900 → "1 h 05 min". */
export function formatDuration(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null;
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${pad(minutes % 60)} min`;
}

function elapsedSince(iso: string | null, now: number): number {
  return iso ? now - Date.parse(iso) : 0;
}

/**
 * Trabalho parado há mais tempo do que uma reunião leva para transcrever. Com o worker
 * fora do ar a fila só cresce em silêncio (ADR-0039); este é o sintoma visível.
 */
export function isTranscriptionStuck(item: MeetingTranscriptionListItem, now = Date.now()): boolean {
  if (item.status === MEETING_TRANSCRIPTION_STATUS.PENDENTE) {
    return elapsedSince(item.updatedAt, now) > STUCK_PENDING_MS;
  }
  if (item.status === MEETING_TRANSCRIPTION_STATUS.PROCESSANDO) {
    return elapsedSince(item.claimedAt, now) > STUCK_PROCESSING_MS;
  }
  return false;
}

/** Termo de busca sem os caracteres que o filtro `or` do PostgREST interpreta. */
export function sanitizeTranscriptSearch(term: string): string {
  return term.replace(/[%_*,()"\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeSubject(subject: string): string {
  return subject.trim().slice(0, MAX_SUBJECT);
}

export const LINKED_MEETING_STATUS_LABEL: Record<LinkedMeetingStatus, string> = {
  [LINKED_MEETING_STATUS.AGENDADA]: 'Agendada',
  [LINKED_MEETING_STATUS.AGUARDANDO]: 'Aguardando transcrição',
  [LINKED_MEETING_STATUS.TRANSCRITA]: 'Transcrita',
  [LINKED_MEETING_STATUS.SEM_TRANSCRICAO]: 'Sem transcrição',
  [LINKED_MEETING_STATUS.COM_PROBLEMA]: 'Com problema',
};

/**
 * Quanto esperar depois do fim antes de dizer "sem transcrição": o Teams publica em alguns
 * minutos e a sincronização roda de 10 em 10 (ADR-0052).
 */
const TRANSCRIPT_WAIT_MS = 40 * 60 * 1000;

/**
 * A situação diz se a reunião aconteceu e se a transcrição veio — sem horário, uma reunião
 * que aconteceu e não foi transcrita parecia não ter acontecido.
 */
export function linkedMeetingStatus(
  meeting: ProjectTeamsMeeting,
  transcriptions: readonly MeetingTranscriptionListItem[],
  now = Date.now(),
): LinkedMeetingStatus {
  if (transcriptions.length) return LINKED_MEETING_STATUS.TRANSCRITA;
  if (meeting.lastError) return LINKED_MEETING_STATUS.COM_PROBLEMA;
  if (!meeting.endsAt) return LINKED_MEETING_STATUS.AGUARDANDO;
  if (now < Date.parse(meeting.startsAt ?? meeting.endsAt)) return LINKED_MEETING_STATUS.AGENDADA;
  if (now < Date.parse(meeting.endsAt) + TRANSCRIPT_WAIT_MS) return LINKED_MEETING_STATUS.AGUARDANDO;
  return LINKED_MEETING_STATUS.SEM_TRANSCRICAO;
}

function meetingSortKey(meeting: ProjectTeamsMeeting): string {
  return meeting.startsAt ?? meeting.createdAt;
}

/**
 * Cada reunião vinculada com as transcrições que vieram dela (numa série, uma por ocorrência).
 * O que não pertence a nenhuma — gravação enviada, ou reunião que deixou de ser acompanhada —
 * fica em `others`.
 */
export function groupByLinkedMeeting(
  meetings: readonly ProjectTeamsMeeting[],
  transcriptions: readonly MeetingTranscriptionListItem[],
  now = Date.now(),
): { groups: LinkedMeetingGroup[]; others: MeetingTranscriptionListItem[] } {
  const linkedIds = new Set(meetings.map((meeting) => meeting.onlineMeetingId));
  const groups = [...meetings]
    .sort((left, right) => meetingSortKey(right).localeCompare(meetingSortKey(left)))
    .map((meeting) => {
      const own = transcriptions.filter((item) => item.onlineMeetingId === meeting.onlineMeetingId);
      return { meeting, transcriptions: own, status: linkedMeetingStatus(meeting, own, now) };
    });
  const others = transcriptions.filter((item) => !item.onlineMeetingId || !linkedIds.has(item.onlineMeetingId));
  return { groups, others };
}

/**
 * Horário que o Graph devolve na agenda ("2026-10-22T14:00:00.0000000"), já no fuso pedido
 * (`America/Sao_Paulo`), para instante ISO. O Brasil não tem horário de verão desde 2019,
 * então o deslocamento é fixo.
 */
export function saoPauloLocalToIso(local: string | null | undefined): string | null {
  const trimmed = (local ?? '').slice(0, 19);
  const instant = Date.parse(`${trimmed}-03:00`);
  return Number.isNaN(instant) ? null : new Date(instant).toISOString();
}
