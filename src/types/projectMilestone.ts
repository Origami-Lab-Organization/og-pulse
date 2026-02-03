export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  planned_date: string;
  completed_date: string | null;
  status: MilestoneStatus;
  order_index: number;
  created_at: string;
}

export interface CreateMilestoneInput {
  projectId: string;
  title: string;
  description?: string;
  plannedDate: string;
  orderIndex?: number;
}

export interface UpdateMilestoneInput {
  title?: string;
  description?: string;
  plannedDate?: string;
  completedDate?: string;
  status?: MilestoneStatus;
  orderIndex?: number;
}

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  delayed: 'Atrasado',
};

export const MILESTONE_STATUS_ICONS: Record<MilestoneStatus, string> = {
  pending: '○',
  in_progress: '🔄',
  completed: '✓',
  delayed: '⚠',
};
