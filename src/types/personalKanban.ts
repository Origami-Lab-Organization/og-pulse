import type { ActivityColumnName, ActivityCardType } from './projectActivity';

// Etapa da coluna (ADR-0050). É ela, e não o nome, que diz onde entram as atividades de
// projeto e o que conta como concluído — o nome da coluna é livre.
export type PersonalKanbanStage = 'todo' | 'doing' | 'done';

// Chave de token do tema, nunca hex (ver COLUMN_COLORS em src/lib/personalKanban.ts).
export type PersonalKanbanColor =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'slate'
  | 'palm';

export interface PersonalKanbanColumnDB {
  id: string;
  employee_id: string;
  tenant_id: string;
  name: string;
  position: number;
  stage: PersonalKanbanStage;
  color: PersonalKanbanColor;
  created_at: string;
}

export interface PersonalKanbanTagDB {
  id: string;
  employee_id: string;
  tenant_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface PersonalKanbanCardTagDB {
  id: string;
  card_id: string;
  tag_id: string;
  created_at: string;
}

export interface PersonalKanbanCardTagWithTag extends PersonalKanbanCardTagDB {
  tag: PersonalKanbanTagDB;
}

export interface PersonalKanbanCardDB {
  id: string;
  column_id: string;
  employee_id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  /** Hora local 'HH:mm:ss'. Sem hora, o card é do dia inteiro. */
  due_time: string | null;
  /** Antecedência do lembrete em minutos, a partir do prazo. */
  reminder_minutes: number | null;
  remind_at: string | null;
  reminder_sent_at: string | null;
  completed_at: string | null;
  archived_at: string | null;
  /** Atividade de projeto que este card acompanha (ADR-0050, vínculo com projeto). */
  project_activity_card_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

/** A atividade de projeto vista do card pessoal vinculado. */
export interface LinkedProjectActivity {
  id: string;
  title: string;
  column_name: ActivityColumnName;
  card_number: number | null;
  is_blocked: boolean;
  is_archived: boolean;
  sprint_id: string | null;
  project_id: string;
  project: { id: string; name: string } | null;
}

export interface PersonalKanbanCardWithTags extends PersonalKanbanCardDB {
  card_tags: PersonalKanbanCardTagWithTag[];
  project_activity: LinkedProjectActivity | null;
}

/** Resultado de mover uma atividade de projeto pelo Meu Kanban: coluna nova ou motivo do bloqueio. */
export type ActivityMovePlan =
  | { kind: 'unchanged' }
  | { kind: 'blocked'; reason: string }
  | { kind: 'move'; column: ActivityColumnName; confirmDod: boolean };

/** Filtro do board: todos, só cards sem projeto, ou um projeto. */
export type ProjectFilter = { kind: 'all' } | { kind: 'none' } | { kind: 'project'; projectId: string };

export interface ProjectOption {
  id: string;
  name: string;
}

export type BoardSummary = { pending: number } & Partial<Record<DueTone, number>>;

export interface ActivityMove {
  activityId: string;
  projectId: string;
  column: ActivityColumnName;
}

/** Movimento para Feito aguardando confirmação: o checklist de Done da atividade está incompleto. */
export interface PendingDodMove {
  cardId: string;
  cardTitle: string;
  columnId: string;
  position: number;
  activityMove: ActivityMove;
}

export interface PersonalKanbanSettingsDB {
  employee_id: string;
  tenant_id: string;
  default_reminder_minutes: number | null;
  /** 0 = nunca arquivar. */
  archive_done_after_days: number;
  email_reminders: boolean;
  updated_at: string;
}

export type UpdatePersonalKanbanSettingsInput = Partial<
  Pick<PersonalKanbanSettingsDB, 'default_reminder_minutes' | 'archive_done_after_days' | 'email_reminders'>
>;

export type CreatePersonalKanbanColumnInput = {
  name: string;
  position: number;
  stage: PersonalKanbanStage;
  color: PersonalKanbanColor;
};

export type UpdatePersonalKanbanColumnInput = Partial<
  Pick<PersonalKanbanColumnDB, 'name' | 'stage' | 'color'>
>;

export type CreatePersonalKanbanCardInput = {
  column_id: string;
  title: string;
  description?: string;
  project_activity_card_id?: string;
};

export type UpdatePersonalKanbanCardInput = Partial<
  Pick<
    PersonalKanbanCardDB,
    | 'title'
    | 'description'
    | 'column_id'
    | 'position'
    | 'due_date'
    | 'due_time'
    | 'reminder_minutes'
    | 'remind_at'
    | 'completed_at'
    | 'archived_at'
    | 'project_activity_card_id'
  >
>;

export interface ReminderOption {
  value: number;
  label: string;
}

export type DueTone = 'overdue' | 'today' | 'upcoming' | 'done';

export interface AssignedProjectCard {
  id: string;
  projectCardId: string;
  project_id: string;
  tenant_id: string;
  title: string;
  user_story: string | null;
  card_type: ActivityCardType;
  points: number | null;
  column_name: ActivityColumnName;
  is_blocked: boolean;
  project: { id: string; name: string } | null;
}
