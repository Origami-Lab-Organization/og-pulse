export type EmploymentType = 'CLT' | 'PJ' | 'FREELANCER';
export type PaymentType = 'hourly' | 'monthly' | 'delivery';

export interface ProjectRoleDB {
  id: string;
  project_id: string;
  tenant_id: string;
  role_name: string;
  employee_id: string | null;
  freelancer_name: string | null;
  freelancer_email: string | null;
  employment_type: EmploymentType;
  payment_type: PaymentType;
  hourly_rate: number | null;
  monthly_rate: number | null;
  clt_encargos_multiplier: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ProjectRoleWithEmployee extends ProjectRoleDB {
  employee?: {
    id: string;
    nome: string;
    cargo: string;
    foto_url?: string | null;
  } | null;
}

export interface CreateProjectRolePayload {
  projectId: string;
  roleName: string;
  employmentType: EmploymentType;
  paymentType: PaymentType;
  employeeId?: string;
  freelancerName?: string;
  freelancerEmail?: string;
  hourlyRate?: number;
  monthlyRate?: number;
  cltEncargosMultiplier?: number;
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  CLT: 'CLT',
  PJ: 'PJ',
  FREELANCER: 'Freelancer',
};

export const EMPLOYMENT_TYPE_BADGE_COLORS: Record<EmploymentType, string> = {
  CLT: 'bg-blue-100 text-blue-700 border-blue-200',
  PJ: 'bg-purple-100 text-purple-700 border-purple-200',
  FREELANCER: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};
