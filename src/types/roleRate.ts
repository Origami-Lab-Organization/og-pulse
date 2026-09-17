/** Estado de um papel na tabela de preços. Comparar sempre pelo membro (ADR-030). */
export const RoleRateStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
} as const;
export type RoleRateStatus = (typeof RoleRateStatus)[keyof typeof RoleRateStatus];

/** O filtro da lista é o estado mais "todos" — que não é estado de papel nenhum. */
export const RoleRateStatusFilter = {
  ALL: 'all',
  ACTIVE: RoleRateStatus.ACTIVE,
  INACTIVE: RoleRateStatus.INACTIVE,
  ARCHIVED: RoleRateStatus.ARCHIVED,
} as const;
export type RoleRateStatusFilter = (typeof RoleRateStatusFilter)[keyof typeof RoleRateStatusFilter];

export const ROLE_RATE_STATUS_OPTIONS = [
  { value: RoleRateStatus.ACTIVE, label: 'Ativo' },
  { value: RoleRateStatus.INACTIVE, label: 'Inativo' },
  { value: RoleRateStatus.ARCHIVED, label: 'Arquivado' },
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
