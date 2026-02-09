export type OKRStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type KeyResultConfidenceLevel = 'very_high' | 'high' | 'medium' | 'low' | 'very_low';

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
  confidence_level: KeyResultConfidenceLevel;
  created_at: string;
}

export interface KeyResultHistory {
  id: string;
  key_result_id: string;
  current_value: number | null;
  confidence_level: string | null;
  changed_at: string;
  changed_by: string | null;
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
  confidenceLevel?: KeyResultConfidenceLevel;
}

export interface UpdateKeyResultInput {
  description?: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  confidenceLevel?: KeyResultConfidenceLevel;
}

export const OKR_STATUS_LABELS: Record<OKRStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const CONFIDENCE_LEVEL_LABELS: Record<KeyResultConfidenceLevel, string> = {
  very_high: 'Muito Alto',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
  very_low: 'Muito Baixo',
};

export const CONFIDENCE_LEVEL_COLORS: Record<KeyResultConfidenceLevel, string> = {
  very_high: 'bg-green-700/10 text-green-700 border-green-700/20',
  high: 'bg-green-500/10 text-green-600 border-green-500/20',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  low: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  very_low: 'bg-red-500/10 text-red-600 border-red-500/20',
};
