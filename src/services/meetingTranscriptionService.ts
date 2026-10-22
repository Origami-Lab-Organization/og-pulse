import { supabase } from '@/integrations/supabase/client';
import type { Json, Tables } from '@/integrations/supabase/types';
import { fetchEmployeeDirectory } from '@/services/employeeDirectoryService';
import { sanitizeTranscriptSearch } from '@/lib/meetingTranscription';
import type {
  EnqueueTranscriptionPayload,
  MeetingTranscriptionDetail,
  MeetingTranscriptionListItem,
  ProjectRitoEvent,
  ProjectTeamsMeeting,
  RegisterTeamsMeetingPayload,
  SpeakerName,
  TranscriptSegment,
} from '@/types/meetingTranscription';

/**
 * Transcrições de reunião do projeto (ADR-0039).
 *
 * A autorização é da RLS (`transcription_readable_project_ids` /
 * `can_request_meeting_transcription`). A lista não traz o texto: uma hora de reunião passa
 * de 50 mil caracteres, e só é lida quando alguém abre a transcrição.
 */
const transcriptions = () => supabase.from('meeting_transcriptions');

const LIST_COLUMNS =
  'id, project_id, source, ical_uid, event_subject, occurred_at, online_meeting_id, recording_drive_id, recording_item_id, recording_web_url, status, last_error, duration_seconds, requested_by, created_at, updated_at, claimed_at, finished_at, participants, speakers, preview, summary, summary_updated_at, summary_updated_by';

type TranscriptionRow = Tables<'meeting_transcriptions'>;
type ListRow = Pick<
  TranscriptionRow,
  | 'id'
  | 'project_id'
  | 'source'
  | 'ical_uid'
  | 'event_subject'
  | 'occurred_at'
  | 'online_meeting_id'
  | 'recording_drive_id'
  | 'recording_item_id'
  | 'recording_web_url'
  | 'status'
  | 'last_error'
  | 'duration_seconds'
  | 'requested_by'
  | 'created_at'
  | 'updated_at'
  | 'claimed_at'
  | 'finished_at'
  | 'participants'
  | 'speakers'
  | 'preview'
  | 'summary'
  | 'summary_updated_at'
  | 'summary_updated_by'
>;

function nameOf(names: Map<string, string>, id: string | null): string | null {
  return id ? names.get(id) ?? null : null;
}

function toListItem(row: ListRow, names: Map<string, string>): MeetingTranscriptionListItem {
  return {
    id: row.id,
    projectId: row.project_id,
    source: row.source,
    icalUid: row.ical_uid,
    eventSubject: row.event_subject,
    occurredAt: row.occurred_at,
    onlineMeetingId: row.online_meeting_id,
    recordingDriveId: row.recording_drive_id,
    recordingItemId: row.recording_item_id,
    recordingWebUrl: row.recording_web_url,
    status: row.status,
    lastError: row.last_error,
    durationSeconds: row.duration_seconds,
    requestedById: row.requested_by,
    requestedByName: names.get(row.requested_by) ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    claimedAt: row.claimed_at,
    finishedAt: row.finished_at,
    participants: row.participants ?? [],
    speakers: jsonList<SpeakerName>(row.speakers),
    preview: row.preview,
    summary: row.summary,
    summaryUpdatedAt: row.summary_updated_at,
    summaryUpdatedByName: nameOf(names, row.summary_updated_by),
  };
}

/** Forma garantida pelo worker e pela tela; o banco só confere que é lista. */
function jsonList<T>(value: Json | null): T[] {
  return Array.isArray(value) ? (value as unknown as T[]) : [];
}

/**
 * Nome de quem pediu vem do diretório (PUL-162): `employees(...)` aninhado não retorna
 * colegas para quem não é admin/gerente.
 */
async function requesterNames(): Promise<Map<string, string>> {
  const directory = await fetchEmployeeDirectory();
  return new Map(directory.map((entry) => [entry.id, entry.nome]));
}

/**
 * `functions.invoke` embrulha resposta não-2xx num erro genérico e deixa o corpo em
 * `context`. A mensagem da função foi escrita para a tela, então vale desembrulhar.
 */
async function readFunctionError(error: unknown, fallback: string): Promise<Error> {
  const response = (error as { context?: Response })?.context;
  try {
    const body = await response?.json();
    if (typeof body?.error === 'string') return new Error(body.error);
  } catch {
    // Corpo ilegível — cai na mensagem genérica.
  }
  return new Error(fallback);
}

async function invokeFunction(name: string, body: object, fallback: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw await readFunctionError(error, fallback);
  if (data?.error) throw new Error(data.error);
}

const TEAMS_MEETING_COLUMNS =
  'id, project_id, online_meeting_id, event_subject, ical_uid, starts_at, ends_at, is_series, registered_by, last_checked_at, last_error, created_at, notes, notes_updated_at, notes_updated_by, projects(name)';

type TeamsMeetingRow = Pick<
  Tables<'project_online_meetings'>,
  | 'id'
  | 'project_id'
  | 'online_meeting_id'
  | 'event_subject'
  | 'ical_uid'
  | 'starts_at'
  | 'ends_at'
  | 'is_series'
  | 'registered_by'
  | 'last_checked_at'
  | 'last_error'
  | 'created_at'
  | 'notes'
  | 'notes_updated_at'
  | 'notes_updated_by'
> & { projects: { name: string } | null };

function toTeamsMeeting(row: TeamsMeetingRow, names: Map<string, string>): ProjectTeamsMeeting {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    onlineMeetingId: row.online_meeting_id,
    eventSubject: row.event_subject,
    icalUid: row.ical_uid,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    isSeries: row.is_series,
    registeredById: row.registered_by,
    registeredByName: names.get(row.registered_by) ?? null,
    lastCheckedAt: row.last_checked_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    notes: row.notes,
    notesUpdatedAt: row.notes_updated_at,
    notesUpdatedByName: nameOf(names, row.notes_updated_by),
  };
}

async function listTeamsMeetingsWhere(column: 'project_id' | 'ical_uid', value: string) {
  const [{ data, error }, names] = await Promise.all([
    supabase
      .from('project_online_meetings')
      .select(TEAMS_MEETING_COLUMNS)
      .eq(column, value)
      .order('created_at', { ascending: false }),
    requesterNames(),
  ]);
  if (error) throw error;
  return ((data ?? []) as unknown as TeamsMeetingRow[]).map((row) => toTeamsMeeting(row, names));
}

export const meetingTranscriptionService = {
  async listByProject(projectId: string, search = ''): Promise<MeetingTranscriptionListItem[]> {
    let query = transcriptions()
      .select(LIST_COLUMNS)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    const term = sanitizeTranscriptSearch(search);
    if (term) {
      query = query.or(`event_subject.ilike.*${term}*,transcript_text.ilike.*${term}*,summary.ilike.*${term}*`);
    }

    const [{ data, error }, names] = await Promise.all([query, requesterNames()]);
    if (error) throw error;
    return ((data ?? []) as ListRow[]).map((row) => toListItem(row, names));
  },

  async getById(id: string): Promise<MeetingTranscriptionDetail> {
    const [{ data, error }, names] = await Promise.all([
      transcriptions().select('*').eq('id', id).single(),
      requesterNames(),
    ]);
    if (error) throw error;

    return {
      ...toListItem(data, names),
      language: data.language,
      transcriptText: data.transcript_text,
      segments: jsonList<TranscriptSegment>(data.segments),
    };
  },

  async updateSpeakers(id: string, speakers: SpeakerName[]): Promise<void> {
    const { error } = await transcriptions()
      .update({ speakers: speakers as unknown as Json })
      .eq('id', id);
    if (error) throw error;
  },

  async updateSubject(id: string, eventSubject: string): Promise<void> {
    const { error } = await transcriptions().update({ event_subject: eventSubject }).eq('id', id);
    if (error) throw error;
  },

  /** Resumo trazido pela equipe. Vazio apaga; quem e quando o banco carimba. */
  async updateSummary(id: string, summary: string | null): Promise<void> {
    const { error } = await transcriptions().update({ summary }).eq('id', id);
    if (error) throw error;
  },

  async remove(id: string): Promise<void> {
    const { error } = await transcriptions().delete().eq('id', id);
    if (error) throw error;
  },

  async enqueue(payload: EnqueueTranscriptionPayload): Promise<void> {
    await invokeFunction(
      'transcription-enqueue',
      payload,
      'Não foi possível enviar a gravação para transcrição. Tente de novo em instantes.',
    );
  },

  /** Vincula a reunião do Teams ao projeto: a transcrição dela passa a vir sozinha (ADR-0052). */
  async registerTeamsMeeting(payload: RegisterTeamsMeetingPayload): Promise<void> {
    await invokeFunction(
      'teams-meeting-register',
      payload,
      'Não foi possível vincular a reunião ao projeto. Tente de novo em instantes.',
    );
  },

  /** "Buscar transcrições agora": o que o cron faz, só para as reuniões deste projeto. */
  async syncTeamsTranscripts(projectId: string): Promise<number> {
    const { data, error } = await supabase.functions.invoke('teams-transcripts-sync', {
      body: { projectId },
    });
    if (error) {
      throw await readFunctionError(error, 'Não foi possível buscar as transcrições agora. Tente de novo em instantes.');
    }
    if (data?.error) throw new Error(data.error);
    return typeof data?.importadas === 'number' ? data.importadas : 0;
  },

  listTeamsMeetingsByProject(projectId: string): Promise<ProjectTeamsMeeting[]> {
    return listTeamsMeetingsWhere('project_id', projectId);
  },

  /** Projetos que recebem a transcrição desta reunião — o detalhe do evento na Agenda. */
  listTeamsMeetingsByIcalUid(icalUid: string): Promise<ProjectTeamsMeeting[]> {
    return listTeamsMeetingsWhere('ical_uid', icalUid);
  },

  /** Notas da reunião vinculada que ainda não tem transcrição. */
  async updateTeamsMeetingNotes(id: string, notes: string | null): Promise<void> {
    const { error } = await supabase.from('project_online_meetings').update({ notes }).eq('id', id);
    if (error) throw error;
  },

  async removeTeamsMeeting(id: string): Promise<void> {
    const { error } = await supabase.from('project_online_meetings').delete().eq('id', id);
    if (error) throw error;
  },

  /** Ritos do projeto — o título deles reconhece a gravação de uma reunião do projeto. */
  async listProjectRitos(projectId: string): Promise<ProjectRitoEvent[]> {
    const { data, error } = await supabase
      .from('project_ritos')
      .select('ical_uid, event_title')
      .eq('project_id', projectId);
    if (error) throw error;
    return (data ?? []).map((row) => ({ icalUid: row.ical_uid, eventTitle: row.event_title }));
  },
};
