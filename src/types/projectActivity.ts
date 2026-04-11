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

export interface ProjectActivityCardWithRelations extends ProjectActivityCardDB {
  assignee?: {
    id: string;
    nome: string;
    foto_url: string | null;
  } | null;
  card_tags?: ProjectActivityCardTagWithTag[];
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
