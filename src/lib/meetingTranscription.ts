import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LINKED_MEETING_STATUS,
  MEETING_TIMELINE_ENTRY_KIND,
  MEETING_TIMELINE_FILTER,
  MEETING_TRANSCRIPTION_SOURCE,
  MEETING_TRANSCRIPTION_STATUS,
  type MeetingTimelineDay,
  type MeetingTimelineEntry,
  type MeetingTimelineFilter,
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
  [MEETING_TRANSCRIPTION_STATUS.CONCLUIDA]: 'Transcrita',
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

/** O que a situação quer dizer, para quem olha a lista sem conhecer a sincronização. */
export const LINKED_MEETING_STATUS_HINT: Record<LinkedMeetingStatus, string | null> = {
  [LINKED_MEETING_STATUS.AGENDADA]: 'A transcrição chega alguns minutos depois de a reunião acabar.',
  [LINKED_MEETING_STATUS.AGUARDANDO]:
    'A transcrição do Teams costuma chegar em até 20 minutos depois do fim. Com pressa, use "Buscar transcrições agora".',
  [LINKED_MEETING_STATUS.TRANSCRITA]: null,
  [LINKED_MEETING_STATUS.SEM_TRANSCRICAO]:
    'A reunião aconteceu, mas nenhuma transcrição chegou. Ela pode não ter sido transcrita no Teams.',
  [LINKED_MEETING_STATUS.COM_PROBLEMA]: null,
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

/**
 * O plano B (gravação do OneDrive + WhisperX, ADR-0039) só aparece com o worker no ar. Sem ele,
 * o botão enfileira trabalho que nunca anda.
 */
export const TRANSCRIPTION_WORKER_ENABLED = import.meta.env.VITE_TRANSCRIPTION_WORKER_ENABLED === 'true';

export const MAX_SUMMARY_CHARS = 50000;
/** Resumo importado de arquivo: texto puro, então algumas centenas de KB já é muito. */
export const MAX_SUMMARY_FILE_BYTES = 500 * 1024;

/** Resumo como vai para o banco: sem espaço sobrando, vazio vira "sem resumo". */
export function normalizeMeetingSummary(text: string): string | null {
  const trimmed = text.trim().slice(0, MAX_SUMMARY_CHARS);
  return trimmed ? trimmed : null;
}

function transcriptionEntry(
  item: MeetingTranscriptionListItem,
  byMeetingId: Map<string, ProjectTeamsMeeting>,
): MeetingTimelineEntry {
  return {
    kind: MEETING_TIMELINE_ENTRY_KIND.TRANSCRICAO,
    key: `t-${item.id}`,
    when: item.occurredAt ?? item.createdAt,
    item,
    meeting: item.onlineMeetingId ? byMeetingId.get(item.onlineMeetingId) ?? null : null,
  };
}

/**
 * Uma lista só, da reunião mais adiante para a mais antiga: cada transcrição (numa série, uma
 * por ocorrência) e cada reunião vinculada que ainda não tem nenhuma — essa com a situação
 * dela, para reunião sem transcrição não parecer reunião que não houve.
 */
export function buildMeetingTimeline(
  meetings: readonly ProjectTeamsMeeting[],
  transcriptions: readonly MeetingTranscriptionListItem[],
  now = Date.now(),
): MeetingTimelineEntry[] {
  const byMeetingId = new Map(meetings.map((meeting) => [meeting.onlineMeetingId, meeting]));
  const transcribed = new Set(transcriptions.map((item) => item.onlineMeetingId).filter(Boolean));

  const entries: MeetingTimelineEntry[] = [
    ...transcriptions.map((item) => transcriptionEntry(item, byMeetingId)),
    ...meetings
      .filter((meeting) => !transcribed.has(meeting.onlineMeetingId))
      .map((meeting) => ({
        kind: MEETING_TIMELINE_ENTRY_KIND.REUNIAO,
        key: `m-${meeting.id}`,
        when: meeting.startsAt ?? meeting.createdAt,
        meeting,
        status: linkedMeetingStatus(meeting, [], now),
      })),
  ];
  return entries.sort((left, right) => right.when.localeCompare(left.when));
}

function isPendingTranscription(item: MeetingTranscriptionListItem): boolean {
  return item.status !== MEETING_TRANSCRIPTION_STATUS.CONCLUIDA;
}

const FILTER_RULE: Record<MeetingTimelineFilter, (entry: MeetingTimelineEntry) => boolean> = {
  [MEETING_TIMELINE_FILTER.TODAS]: () => true,
  [MEETING_TIMELINE_FILTER.TRANSCRITAS]: (entry) =>
    entry.kind === MEETING_TIMELINE_ENTRY_KIND.TRANSCRICAO && !isPendingTranscription(entry.item),
  [MEETING_TIMELINE_FILTER.SEM_RESUMO]: (entry) =>
    entry.kind === MEETING_TIMELINE_ENTRY_KIND.TRANSCRICAO && !isPendingTranscription(entry.item) && !entry.item.summary,
  [MEETING_TIMELINE_FILTER.PENDENTES]: (entry) =>
    entry.kind === MEETING_TIMELINE_ENTRY_KIND.REUNIAO || isPendingTranscription(entry.item),
};

export function filterMeetingTimeline(
  entries: readonly MeetingTimelineEntry[],
  filter: MeetingTimelineFilter,
): MeetingTimelineEntry[] {
  return entries.filter(FILTER_RULE[filter]);
}

function dayLabel(iso: string, now: number): string {
  const day = parseISO(iso);
  const distance = differenceInCalendarDays(day, now);
  if (distance === 0) return 'Hoje';
  if (distance === -1) return 'Ontem';
  if (distance === 1) return 'Amanhã';
  return format(day, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/** Agrupa por dia, mantendo a ordem: "Hoje", "Ontem", "Amanhã" ou a data por extenso. */
export function groupTimelineByDay(
  entries: readonly MeetingTimelineEntry[],
  now = Date.now(),
): MeetingTimelineDay[] {
  const days: MeetingTimelineDay[] = [];
  entries.forEach((entry) => {
    const label = dayLabel(entry.when, now);
    const last = days[days.length - 1];
    if (last?.label === label) last.entries.push(entry);
    else days.push({ label, entries: [entry] });
  });
  return days;
}

/** Quem falou, como a tela mostra: nomes no Teams; na gravação, o nome dado ou "Voz N". */
export function participantNames(item: MeetingTranscriptionListItem): string[] {
  if (item.source === MEETING_TRANSCRIPTION_SOURCE.TEAMS) return item.participants;
  return item.participants.map((label) => speakerDisplayName(label, item.speakers, item.participants));
}

/** Pedaços do texto com o termo buscado marcado, sem diferenciar maiúscula nem acento. */
export function highlightParts(text: string, term: string): { text: string; match: boolean }[] {
  const needle = comparable(term);
  if (!needle) return [{ text, match: false }];
  const haystack = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;
  for (let found = haystack.indexOf(needle); found >= 0; found = haystack.indexOf(needle, cursor)) {
    if (found > cursor) parts.push({ text: text.slice(cursor, found), match: false });
    parts.push({ text: text.slice(found, found + needle.length), match: true });
    cursor = found + needle.length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts;
}

/** Nome do .txt baixado: "2026-10-22 Daily Pulse.txt", sem o que o sistema de arquivos recusa. */
export function transcriptFileName(subject: string, when: string | null): string {
  const day = when ? when.slice(0, 10) : '';
  const safe = subject.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Reunião';
  return `${[day, safe].filter(Boolean).join(' ')}.txt`;
}

export function downloadTextFile(fileName: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Trecho em texto corrido de um markdown, para o cartão: sem #, listas, ênfase nem links. */
export function plainExcerpt(markdown: string, max = 240): string {
  const plain = markdown
    .replace(/^\s{0,3}(#{1,6}|[-*+]|\d+[.)]|>)\s+/gm, '')
    .replace(/[*_`~]+/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max).trimEnd()}…` : plain;
}
