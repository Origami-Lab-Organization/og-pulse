export type ActivityCardType = 'story' | 'bug' | 'tech_debt' | 'task';
export type ActivityColumnName =
  | 'product_backlog'
  | 'sprint_backlog'
  | 'in_dev'
  | 'in_test'
  | 'in_deploy'
  | 'done';

export interface ProjectActivityCardDB {
  id: string;
  project_id: string;
  tenant_id: string;
  title: string;
  card_type: ActivityCardType;
  card_number: number | null;
  user_story: string | null;
  acceptance_criteria: string | null;
  points: number | null;
  assignee_id: string | null;
  column_name: ActivityColumnName;
  position: number;
  sprint_id: string | null;
  is_blocked: boolean;
  blocked_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ChecklistType = 'dor' | 'dod';

export interface ChecklistTemplateDB {
  id: string;
  project_id: string;
  tenant_id: string;
  type: ChecklistType;
  /** null = applies to all card types; non-null = specific card type only */
  card_type: ActivityCardType | null;
  items: { text: string }[];
  created_at: string;
}

export interface CardChecklistItemDB {
  id: string;
  card_id: string;
  type: ChecklistType;
  item_text: string;
  is_checked: boolean;
  position: number;
  created_at: string;
}

// ── Tasks ────────────────────────────────────────────────────────────────────

export interface ActivityTaskDB {
  id: string;
  card_id: string;
  tenant_id: string;
  description: string;
  assignee_id: string | null;
  due_date: string | null;      // YYYY-MM-DD
  completed_at: string | null;  // ISO timestamp
  created_by: string;
  position: number;
  created_at: string;
}

export interface ActivityTaskWithRelations extends ActivityTaskDB {
  assignee?: {
    id: string;
    nome: string;
    foto_url: string | null;
  } | null;
}

// ── Card with relations ───────────────────────────────────────────────────────

export interface ProjectActivityCardWithRelations extends ProjectActivityCardDB {
  assignee?: {
    id: string;
    nome: string;
    foto_url: string | null;
  } | null;
  card_tags?: ProjectActivityCardTagWithTag[];
  card_checklist?: Pick<CardChecklistItemDB, 'id' | 'type' | 'is_checked'>[];
  card_tasks?: Pick<ActivityTaskDB, 'id' | 'completed_at'>[];
}

export interface CreateActivityInput {
  projectId: string;
  title: string;
  cardType?: ActivityCardType;
  userStory?: string;
  acceptanceCriteria?: string;
  points?: number;
  assigneeId?: string;
  columnName?: ActivityColumnName;
  sprintId?: string;
  isBlocked?: boolean;
  blockedReason?: string;
}

export interface UpdateActivityInput {
  title?: string;
  cardType?: ActivityCardType;
  userStory?: string;
  acceptanceCriteria?: string;
  points?: number;
  assigneeId?: string | null;
  columnName?: ActivityColumnName;
  position?: number;
  sprintId?: string | null;
  isBlocked?: boolean;
  blockedReason?: string | null;
}

export const CARD_TYPE_LABELS: Record<ActivityCardType, string> = {
  story: 'História',
  bug: 'Bug',
  tech_debt: 'Dívida Técnica',
  task: 'Tarefa',
};

export const CARD_TYPE_OPTIONS: { value: ActivityCardType; label: string }[] = [
  { value: 'story', label: 'História' },
  { value: 'bug', label: 'Bug' },
  { value: 'tech_debt', label: 'Dívida Técnica' },
  { value: 'task', label: 'Tarefa' },
];

export const COLUMN_LABELS: Record<ActivityColumnName, string> = {
  product_backlog: 'Product Backlog',
  sprint_backlog: 'Sprint Backlog',
  in_dev: 'In Dev',
  in_test: 'In Test',
  in_deploy: 'In Deploy',
  done: 'Done',
};

export const ACTIVITY_COLUMNS: ActivityColumnName[] = [
  'product_backlog',
  'sprint_backlog',
  'in_dev',
  'in_test',
  'in_deploy',
  'done',
];

// ── Sprints ──────────────────────────────────────────────────────────────────

export type SprintStatus = 'planned' | 'active' | 'completed';
export type SprintNamingMode = 'auto' | 'manual';

export interface ActivitySprintDB {
  id: string;
  project_id: string;
  tenant_id: string;
  name: string;
  number: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  goal: string | null;
  status: SprintStatus;
  created_at: string;
  updated_at: string;
}

export interface ActivitySettingsDB {
  id: string;
  project_id: string;
  tenant_id: string;
  sprint_duration_weeks: number;
  sprint_naming_mode: SprintNamingMode;
  wip_in_dev: number | null;
  wip_in_test: number | null;
  wip_in_deploy: number | null;
}

/** Returns a preview list of sprints without hitting the database. */
export function generateSprints(
  startDate: Date,
  durationWeeks: number,
  count: number
): { name: string; number: number; start_date: string; end_date: string; status: SprintStatus }[] {
  const msPerDay  = 24 * 60 * 60 * 1000;
  const msPerWeek = 7 * msPerDay;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fmt = (d: Date): string => {
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return Array.from({ length: count }, (_, i) => {
    const sprintStart = new Date(startDate.getTime() + i * durationWeeks * msPerWeek);
    const sprintEnd   = new Date(startDate.getTime() + (i + 1) * durationWeeks * msPerWeek - msPerDay);
    const number      = i + 1;
    const name        = `Sprint ${number}`;
    const status: SprintStatus =
      sprintStart <= today && today <= sprintEnd ? 'active' : 'planned';

    return { name, number, start_date: fmt(sprintStart), end_date: fmt(sprintEnd), status };
  });
}

// ── Tags ────────────────────────────────────────────────────────────────────

export interface ProjectActivityTagDB {
  id: string;
  project_id: string;
  tenant_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface ProjectActivityCardTagDB {
  id: string;
  card_id: string;
  tag_id: string;
  created_at: string;
}

export interface ProjectActivityCardTagWithTag extends ProjectActivityCardTagDB {
  tag: ProjectActivityTagDB;
}
