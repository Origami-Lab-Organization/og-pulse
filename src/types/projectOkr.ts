export type OKRStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type KeyResultStatus = 'pending' | 'in_progress' | 'completed';

export interface ProjectOKR {
  id: string;
  project_id: string;
  objective: string;
  description: string | null;
  target_date: string | null;
  status: OKRStatus;
  progress_percent: number;
  created_at: string;
  updated_at: string;
  key_results?: ProjectKeyResult[];
}

export interface ProjectKeyResult {
  id: string;
  okr_id: string;
  description: string;
  target_value: number | null;
  current_value: number;
  unit: string | null;
  status: KeyResultStatus;
  created_at: string;
}

export interface CreateOKRInput {
  projectId: string;
  objective: string;
  description?: string;
  targetDate?: string;
  status?: OKRStatus;
}

export interface UpdateOKRInput {
  objective?: string;
  description?: string;
  targetDate?: string;
  status?: OKRStatus;
  progressPercent?: number;
}

export interface CreateKeyResultInput {
  okrId: string;
  description: string;
  targetValue?: number;
  unit?: string;
}

export interface UpdateKeyResultInput {
  description?: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  status?: KeyResultStatus;
}

export const OKR_STATUS_LABELS: Record<OKRStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const KEY_RESULT_STATUS_LABELS: Record<KeyResultStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
};
