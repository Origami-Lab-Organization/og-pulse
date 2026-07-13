export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'delayed';

export type MilestoneType = 'marco' | 'release' | 'epico' | 'entrega_interna';

// Tipos pontuais (uma única data) vs. tipos de período (início + fim) — usado
// pelo dialog (quais campos mostrar), pela timeline (diamante vs. barra) e
// pelo cálculo de status efetivo (atraso).
export const POINT_MILESTONE_TYPES: readonly MilestoneType[] = ['marco', 'entrega_interna'];
export const isPointType = (type: MilestoneType) => POINT_MILESTONE_TYPES.includes(type);

// Itens que não são relevantes/visíveis para o cliente — hoje só entrega_interna.
export const isInternalOnly = (type: MilestoneType) => type === 'entrega_interna';

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  deliverables: string | null;
  start_date: string;
  end_date: string;
  completed_date: string | null;
  status: MilestoneStatus;
  milestone_type: MilestoneType;
  created_at: string;
}

export interface CreateMilestoneInput {
  projectId: string;
  title: string;
  deliverables?: string;
  startDate: string;
  endDate: string;
  milestoneType: MilestoneType;
}

export interface UpdateMilestoneInput {
  title?: string;
  deliverables?: string;
  startDate?: string;
  endDate?: string;
  completedDate?: string;
  status?: MilestoneStatus;
  milestoneType?: MilestoneType;
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

export const MILESTONE_TYPE_LABELS: Record<MilestoneType, string> = {
  marco: 'Marco',
  release: 'Release',
  epico: 'Épico',
  entrega_interna: 'Entrega Interna',
};

export const MILESTONE_TYPE_DESCRIPTIONS: Record<MilestoneType, string> = {
  marco: 'Data pontual, visível para o cliente',
  release: 'Período de entrega ao cliente',
  epico: 'Período de trabalho interno da equipe',
  entrega_interna: 'Data pontual, apenas controle interno do GP',
};
