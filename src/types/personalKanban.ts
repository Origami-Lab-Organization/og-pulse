export interface PersonalKanbanColumnDB {
  id: string;
  employee_id: string;
  tenant_id: string;
  name: string;
  position: number;
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
  position: number;
  created_at: string;
  updated_at: string;
}

export interface PersonalKanbanCardWithTags extends PersonalKanbanCardDB {
  card_tags: PersonalKanbanCardTagWithTag[];
}

export type CreatePersonalKanbanColumnInput = {
  name: string;
  position: number;
};

export type CreatePersonalKanbanCardInput = {
  column_id: string;
  title: string;
  description?: string;
};

export type UpdatePersonalKanbanCardInput = Partial<
  Pick<PersonalKanbanCardDB, 'title' | 'description' | 'column_id' | 'position' | 'due_date'>
>;

import type { ActivityColumnName, ActivityCardType } from './projectActivity';

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

export type PersonalColumnSlot = 'To do' | 'Doing' | 'Done';

export const PROJECT_TO_PERSONAL_COLUMN: Record<ActivityColumnName, PersonalColumnSlot> = {
  product_backlog: 'To do',
  sprint_backlog: 'To do',
  in_dev: 'Doing',
  in_test: 'Doing',
  in_deploy: 'Doing',
  done: 'Done',
};
