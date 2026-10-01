/** Sinal de atenção num dia da auditoria de horas (decisão do Italo, 01/10/2026). */
export enum DayFlag {
  OverJourney = 'acima_da_jornada',
  Weekend = 'fim_de_semana',
  Holiday = 'feriado',
  Missing = 'sem_lancamento',
  Late = 'lancado_com_atraso',
}

export enum AuditEntryKind {
  Project = 'projeto',
  Activity = 'atividade',
}

export interface AuditEntry {
  key: string;
  kind: AuditEntryKind;
  itemId: string;
  itemName: string;
  hours: number;
  workDate: string;
  /** Dias entre o dia trabalhado e o dia do lançamento, quando passa do limite. */
  lateDays: number | null;
  edited: boolean;
}

export interface AuditDay {
  date: string;
  expected: number;
  logged: number;
  entries: AuditEntry[];
  flags: DayFlag[];
  /** Férias aprovadas: não se espera hora, e dia vazio não é alerta. */
  onVacation: boolean;
}

export interface AuditWeek {
  /** Segunda-feira da semana (yyyy-MM-dd), para abrir a correção nela. */
  monday: string;
  days: AuditDay[];
  logged: number;
  expected: number;
}

export interface UnplannedItem {
  projectId: string;
  name: string;
  hours: number;
}

export interface CorrectionRecord {
  key: string;
  editedAt: string;
  editorName: string;
  itemName: string;
  workDate: string;
  previousHours: number;
  newHours: number;
  reasonCode: string | null;
  justification: string;
}

export interface AuditSummary {
  logged: number;
  expected: number;
  daysWithFlags: number;
  unplannedHours: number;
  corrections: number;
  lateEntries: number;
}

export interface HoursAudit {
  employeeName: string;
  weeks: AuditWeek[];
  unplanned: UnplannedItem[];
  corrections: CorrectionRecord[];
  summary: AuditSummary;
}

/** O que a busca traz do banco para a auditoria de uma pessoa num mês. */
export interface AuditInputs {
  employeeName: string;
  jornadaDiaria: number;
  dataAdmissao: string | null;
  projectEntries: { id: string; project_id: string; work_date: string; hours: number; created_at: string }[];
  activityEntries: { id: string; activity_type_id: string; work_date: string; hours: number; created_at: string }[];
  projectNames: Map<string, string>;
  activityNames: Map<string, string>;
  plannedByProject: Map<string, number>;
  vacations: { start_date: string; end_date: string }[];
  projectLogs: { id: string; timesheet_id: string; previous_hours: number; new_hours: number; reason_code: string | null; justification: string; edited_by: string; edited_at: string }[];
  activityLogs: { id: string; activity_timesheet_id: string; previous_hours: number; new_hours: number; reason_code: string | null; justification: string; edited_by: string; edited_at: string }[];
  editorNames: Map<string, string>;
}
