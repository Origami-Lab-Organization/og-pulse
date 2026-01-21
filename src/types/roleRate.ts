export interface RoleRateDB {
  id: string;
  tenant_id: string;
  role_name: string;
  seniority: string;
  hourly_rate: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRoleRateInput {
  roleName: string;
  seniority: string;
  hourlyRate: number;
  description?: string;
  isActive?: boolean;
}

export interface UpdateRoleRateInput {
  roleName?: string;
  seniority?: string;
  hourlyRate?: number;
  description?: string;
  isActive?: boolean;
}

export const SENIORITY_OPTIONS = [
  { value: 'junior', label: 'Júnior' },
  { value: 'pleno', label: 'Pleno' },
  { value: 'senior', label: 'Sênior' },
];
