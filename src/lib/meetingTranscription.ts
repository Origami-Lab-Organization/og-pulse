import {
  MEETING_TRANSCRIPTION_STATUS,
  type MeetingTranscriptionListItem,
  type MeetingTranscriptionStatus,
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
export function speakerDisplayName(
  label: string | null,
  speakers: readonly SpeakerName[],
  labels: readonly string[],
): string {
  if (!label) return 'Fala';
  const named = speakers.find((speaker) => speaker.label === label)?.name;
  if (named) return named;
  const position = labels.indexOf(label);
  return position < 0 ? 'Voz' : `Voz ${position + 1}`;
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
): string {
  const labels = speakerLabels(segments);
  return groupSegments(segments)
    .map((block) => {
      const who = speakerDisplayName(block.speaker, speakers, labels);
      return `[${formatTimestamp(block.start)}] ${who}: ${block.text}`;
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
