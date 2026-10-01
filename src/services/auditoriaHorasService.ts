import { supabase } from '@/integrations/supabase/client';
import type { AuditInputs } from '@/types/auditoriaHoras';

/**
 * Busca da auditoria de horas de UMA pessoa num mês (decisão do Italo, 01/10/2026). Tudo sob a
 * RLS de quem pede: a tela fica na Custo x Hora e o botão só aparece com `timesheet-terceiro:ler`.
 * Uma pessoa num mês fica muito abaixo das 1000 linhas do PostgREST — não precisa paginar.
 */

const FATIA = 200;

function fatiar<T>(itens: T[]): T[][] {
  const fatias: T[][] = [];
  for (let i = 0; i < itens.length; i += FATIA) fatias.push(itens.slice(i, i + FATIA));
  return fatias;
}

function monthBounds(monthKey: string) {
  const [y, m] = monthKey.split('-').map(Number);
  return { year: y, month: m, start: `${monthKey}-01`, end: `${monthKey}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}` };
}

async function must<T>(promise: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw error;
  return (data ?? []) as T;
}

async function projectEntriesOf(employeeId: string, start: string, end: string) {
  const members = await must<{ id: string; project_id: string }[]>(
    supabase.from('project_members').select('id, project_id').eq('employee_id', employeeId),
  );
  if (members.length === 0) return [];
  return must<AuditInputs['projectEntries']>(
    supabase
      .from('project_timesheets')
      .select('id, project_id, work_date, hours, created_at')
      .in('project_member_id', members.map((m) => m.id))
      .gte('work_date', start)
      .lte('work_date', end),
  );
}

const LOG_COLUMNS = 'previous_hours, new_hours, reason_code, justification, edited_by, edited_at';

async function projectLogsOf(ids: string[]): Promise<AuditInputs['projectLogs']> {
  const all: AuditInputs['projectLogs'] = [];
  for (const fatia of fatiar(ids)) {
    const { data, error } = await supabase.from('timesheet_edit_logs').select(`id, timesheet_id, ${LOG_COLUMNS}`).in('timesheet_id', fatia); // harness-ok: uma fatia por volta
    if (error) throw error;
    all.push(...((data ?? []) as AuditInputs['projectLogs']));
  }
  return all;
}

async function activityLogsOf(ids: string[]): Promise<AuditInputs['activityLogs']> {
  const all: AuditInputs['activityLogs'] = [];
  for (const fatia of fatiar(ids)) {
    const { data, error } = await supabase.from('activity_timesheet_edit_logs').select(`id, activity_timesheet_id, ${LOG_COLUMNS}`).in('activity_timesheet_id', fatia); // harness-ok: uma fatia por volta
    if (error) throw error;
    all.push(...((data ?? []) as AuditInputs['activityLogs']));
  }
  return all;
}

async function namesOf(table: 'projects' | 'activity_types', ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await must<{ id: string; name: string }[]>(supabase.from(table).select('id, name').in('id', ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}

async function editorNamesOf(authIds: string[]): Promise<Map<string, string>> {
  if (authIds.length === 0) return new Map();
  const rows = await must<{ auth_id: string; nome: string }[]>(supabase.from('employees').select('auth_id, nome').in('auth_id', authIds));
  return new Map(rows.map((r) => [r.auth_id, r.nome]));
}

export async function fetchAuditInputs(employeeId: string, monthKey: string): Promise<AuditInputs> {
  const { year, month, start, end } = monthBounds(monthKey);
  const [person, projectEntries, activityEntries, planned, vacations] = await Promise.all([
    supabase.from('employees').select('nome, jornada_diaria, data_admissao').eq('id', employeeId).maybeSingle(),
    projectEntriesOf(employeeId, start, end),
    must<AuditInputs['activityEntries']>(
      supabase.from('activity_timesheets').select('id, activity_type_id, work_date, hours, created_at').eq('employee_id', employeeId).gte('work_date', start).lte('work_date', end),
    ),
    must<{ project_id: string; planned_hours: number | null }[]>(
      supabase.from('project_role_allocations').select('project_id, planned_hours').eq('employee_id', employeeId).eq('year', year).eq('month', month),
    ),
    must<AuditInputs['vacations']>(
      supabase.from('vacation_requests').select('start_date, end_date').eq('employee_id', employeeId).eq('status', 'approved').lte('start_date', end).gte('end_date', start),
    ),
  ]);
  if (person.error) throw person.error;

  const [projectNames, activityNames, projectLogs, activityLogs] = await Promise.all([
    namesOf('projects', [...new Set(projectEntries.map((e) => e.project_id))]),
    namesOf('activity_types', [...new Set(activityEntries.map((e) => e.activity_type_id))]),
    projectLogsOf(projectEntries.map((e) => e.id)),
    activityLogsOf(activityEntries.map((e) => e.id)),
  ]);
  const editorNames = await editorNamesOf([...new Set([...projectLogs, ...activityLogs].map((l) => l.edited_by))]);

  const plannedByProject = new Map<string, number>();
  for (const p of planned) plannedByProject.set(p.project_id, (plannedByProject.get(p.project_id) ?? 0) + Number(p.planned_hours ?? 0));

  return {
    employeeName: (person.data?.nome as string | undefined) ?? 'Pessoa',
    jornadaDiaria: Number(person.data?.jornada_diaria) || 8,
    dataAdmissao: (person.data?.data_admissao as string | null) ?? null,
    projectEntries,
    activityEntries,
    projectNames,
    activityNames,
    plannedByProject,
    vacations,
    projectLogs,
    activityLogs,
    editorNames,
  };
}
