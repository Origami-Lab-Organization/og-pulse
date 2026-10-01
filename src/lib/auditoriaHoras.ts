import { addDays, format, isWeekend, parseISO } from 'date-fns';
import { isHoliday } from '@/hooks/useHolidays';
import { AuditEntryKind, DayFlag } from '@/types/auditoriaHoras';
import type { AuditDay, AuditEntry, AuditInputs, AuditWeek, CorrectionRecord, HoursAudit, UnplannedItem } from '@/types/auditoriaHoras';
import type { Holiday } from '@/types/holiday';

/**
 * Auditoria das horas de uma pessoa no mês (decisão do Italo, 01/10/2026), sem I/O.
 *
 * Esperado do dia: a jornada em dia útil; zero em fim de semana, feriado, férias aprovadas, antes
 * da admissão e no futuro do mês aberto. "Sem lançamento" só vale para dia útil que já passou —
 * mesmo critério de Horas não lançadas (PUL-182), para o mês aberto não acusar o que ainda não
 * aconteceu. Lançamento atrasado: lançado mais de LATE_AFTER_DAYS dias depois do dia trabalhado.
 */

export const LATE_AFTER_DAYS = 7;
const DAY_MS = 86_400_000;
const EPSILON = 0.01;

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

function lateDaysOf(workDate: string, createdAt: string): number | null {
  const days = Math.floor((parseISO(createdAt.slice(0, 10)).getTime() - parseISO(workDate).getTime()) / DAY_MS);
  return days > LATE_AFTER_DAYS ? days : null;
}

function entriesOf(inputs: AuditInputs): AuditEntry[] {
  const editedProject = new Set(inputs.projectLogs.map((l) => l.timesheet_id));
  const editedActivity = new Set(inputs.activityLogs.map((l) => l.activity_timesheet_id));
  const fromProjects = inputs.projectEntries.map((e) => ({
    key: `p:${e.id}`,
    kind: AuditEntryKind.Project,
    itemId: e.project_id,
    itemName: inputs.projectNames.get(e.project_id) ?? 'Projeto',
    hours: Number(e.hours),
    workDate: e.work_date,
    lateDays: lateDaysOf(e.work_date, e.created_at),
    edited: editedProject.has(e.id),
  }));
  const fromActivities = inputs.activityEntries.map((e) => ({
    key: `a:${e.id}`,
    kind: AuditEntryKind.Activity,
    itemId: e.activity_type_id,
    itemName: inputs.activityNames.get(e.activity_type_id) ?? 'Atividade interna',
    hours: Number(e.hours),
    workDate: e.work_date,
    lateDays: lateDaysOf(e.work_date, e.created_at),
    edited: editedActivity.has(e.id),
  }));
  return [...fromProjects, ...fromActivities].filter((e) => e.hours > 0);
}

const onVacationOn = (date: string, vacations: AuditInputs['vacations']) =>
  vacations.some((v) => v.start_date <= date && date <= v.end_date);

interface DayContext {
  inputs: AuditInputs;
  holidays: Holiday[];
  today: string;
}

function expectedOn(day: Date, date: string, ctx: DayContext, vacation: boolean): number {
  const beforeAdmission = Boolean(ctx.inputs.dataAdmissao && date < ctx.inputs.dataAdmissao);
  const offDay = isWeekend(day) || Boolean(isHoliday(day, ctx.holidays));
  return offDay || vacation || beforeAdmission || date > ctx.today ? 0 : ctx.inputs.jornadaDiaria;
}

/** Hora em dia que não é de trabalho: feriado tem precedência sobre fim de semana. */
function offDayFlag(day: Date, logged: number, holidays: Holiday[]): DayFlag | null {
  if (logged <= EPSILON) return null;
  if (isHoliday(day, holidays)) return DayFlag.Holiday;
  return isWeekend(day) ? DayFlag.Weekend : null;
}

function journeyFlag(expected: number, logged: number): DayFlag | null {
  if (expected <= 0) return null;
  if (logged <= EPSILON) return DayFlag.Missing;
  return logged > expected + EPSILON ? DayFlag.OverJourney : null;
}

function flagsOf(day: Date, audit: Omit<AuditDay, 'flags'>, ctx: DayContext): DayFlag[] {
  const late = audit.entries.some((e) => e.lateDays != null) ? DayFlag.Late : null;
  return [offDayFlag(day, audit.logged, ctx.holidays), journeyFlag(audit.expected, audit.logged), late].filter(
    (f): f is DayFlag => f != null,
  );
}

function buildDay(day: Date, byDate: Map<string, AuditEntry[]>, ctx: DayContext): AuditDay {
  const date = iso(day);
  const entries = byDate.get(date) ?? [];
  const onVacation = onVacationOn(date, ctx.inputs.vacations);
  const base = {
    date,
    expected: expectedOn(day, date, ctx, onVacation),
    logged: entries.reduce((s, e) => s + e.hours, 0),
    entries: [...entries].sort((a, b) => b.hours - a.hours),
    onVacation,
  };
  return { ...base, flags: flagsOf(day, base, ctx) };
}

/** Semanas de segunda a domingo, recortadas no mês. */
function weeksOf(days: AuditDay[]): AuditWeek[] {
  const weeks = new Map<string, AuditWeek>();
  for (const day of days) {
    const d = parseISO(day.date);
    const monday = iso(addDays(d, d.getDay() === 0 ? -6 : 1 - d.getDay()));
    const week = weeks.get(monday) ?? { monday, days: [], logged: 0, expected: 0 };
    week.days.push(day);
    week.logged += day.logged;
    week.expected += day.expected;
    weeks.set(monday, week);
  }
  return [...weeks.values()];
}

function unplannedOf(entries: AuditEntry[], inputs: AuditInputs): UnplannedItem[] {
  const byProject = new Map<string, UnplannedItem>();
  for (const e of entries) {
    if (e.kind !== AuditEntryKind.Project || (inputs.plannedByProject.get(e.itemId) ?? 0) > 0) continue;
    const item = byProject.get(e.itemId) ?? { projectId: e.itemId, name: e.itemName, hours: 0 };
    item.hours += e.hours;
    byProject.set(e.itemId, item);
  }
  return [...byProject.values()].sort((a, b) => b.hours - a.hours);
}

function correctionsOf(inputs: AuditInputs): CorrectionRecord[] {
  const projectById = new Map(inputs.projectEntries.map((e) => [e.id, e]));
  const activityById = new Map(inputs.activityEntries.map((e) => [e.id, e]));
  const fromProjects = inputs.projectLogs.map((l) => {
    const entry = projectById.get(l.timesheet_id);
    return { log: l, itemName: entry ? inputs.projectNames.get(entry.project_id) ?? 'Projeto' : 'Projeto', workDate: entry?.work_date ?? '' };
  });
  const fromActivities = inputs.activityLogs.map((l) => {
    const entry = activityById.get(l.activity_timesheet_id);
    return { log: l, itemName: entry ? inputs.activityNames.get(entry.activity_type_id) ?? 'Atividade interna' : 'Atividade interna', workDate: entry?.work_date ?? '' };
  });
  return [...fromProjects, ...fromActivities]
    .map(({ log, itemName, workDate }) => ({
      key: log.id,
      editedAt: log.edited_at,
      editorName: inputs.editorNames.get(log.edited_by) ?? 'Pessoa não identificada',
      itemName,
      workDate,
      previousHours: Number(log.previous_hours),
      newHours: Number(log.new_hours),
      reasonCode: log.reason_code,
      justification: log.justification,
    }))
    .sort((a, b) => b.editedAt.localeCompare(a.editedAt));
}

export function buildAudit(inputs: AuditInputs, monthKey: string, holidays: Holiday[], today: Date): HoursAudit {
  const [y, m] = monthKey.split('-').map(Number);
  const entries = entriesOf(inputs);
  const byDate = new Map<string, AuditEntry[]>();
  for (const e of entries) byDate.set(e.workDate, [...(byDate.get(e.workDate) ?? []), e]);
  const ctx: DayContext = { inputs, holidays, today: iso(today) };
  const days: AuditDay[] = [];
  for (let d = new Date(y, m - 1, 1); d.getMonth() === m - 1; d = addDays(d, 1)) days.push(buildDay(d, byDate, ctx));
  const unplanned = unplannedOf(entries, inputs);
  const corrections = correctionsOf(inputs);
  return {
    employeeName: inputs.employeeName,
    weeks: weeksOf(days),
    unplanned,
    corrections,
    summary: {
      logged: days.reduce((s, d) => s + d.logged, 0),
      expected: days.reduce((s, d) => s + d.expected, 0),
      daysWithFlags: days.filter((d) => d.flags.length > 0).length,
      unplannedHours: unplanned.reduce((s, u) => s + u.hours, 0),
      corrections: corrections.length,
      lateEntries: entries.filter((e) => e.lateDays != null).length,
    },
  };
}

export const DAY_FLAG_LABEL: Record<DayFlag, string> = {
  [DayFlag.OverJourney]: 'Acima da jornada',
  [DayFlag.Weekend]: 'Fim de semana',
  [DayFlag.Holiday]: 'Feriado',
  [DayFlag.Missing]: 'Sem lançamento',
  [DayFlag.Late]: 'Lançado com atraso',
};
