export type RoleRateStatus = 'active' | 'inactive' | 'archived';

export const ROLE_RATE_STATUS_OPTIONS = [
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
  { value: 'archived', label: 'Arquivado' },
] as const;

export interface RoleRateDB {
  id: string;
  tenant_id: string;
  role_name: string;
  seniority: string;
  hourly_rate: number;
  description: string | null;
  is_active: boolean;
  status: RoleRateStatus;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleRateInput {
  roleName: string;
  seniority: string;
  hourlyRate: number;
  description?: string;
}

export interface UpdateRoleRateInput {
  roleName?: string;
  seniority?: string;
  hourlyRate?: number;
  description?: string;
}

export const SENIORITY_OPTIONS = [
  { value: 'junior', label: 'Júnior' },
  { value: 'pleno', label: 'Pleno' },
  { value: 'senior', label: 'Sênior' },
  { value: 'especialista', label: 'Especialista' },
];
