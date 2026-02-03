export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  deliverables: string | null;
  start_date: string;
  end_date: string;
  completed_date: string | null;
  status: MilestoneStatus;
  created_at: string;
}

export interface CreateMilestoneInput {
  projectId: string;
  title: string;
  deliverables?: string;
  startDate: string;
  endDate: string;
}

export interface UpdateMilestoneInput {
  title?: string;
  deliverables?: string;
  startDate?: string;
  endDate?: string;
  completedDate?: string;
  status?: MilestoneStatus;
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
