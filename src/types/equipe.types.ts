// ─── Budget roles (from the project's linked budget) ─────────────────────────

export interface BudgetRoleDB {
  id: string;
  budget_id: string;
  role_name: string;
  seniority: string;
  hourly_rate: number;
  created_at: string;
}

export interface BudgetRoleMonthDB {
  id: string;
  budget_role_id: string;
  month_number: number; // 1-indexed from project start
  hours: number;
}

export interface BudgetRoleWithMonths extends BudgetRoleDB {
  months: BudgetRoleMonthDB[];
  filled: boolean; // computed: true if any allocation in this project references this role
}

// ─── Project role allocations ─────────────────────────────────────────────────

export interface ProjectAllocationDB {
  id: string;
  project_id: string;
  tenant_id: string;
  employee_id: string;
  budget_role_id: string | null;
  custom_role_name: string | null;
  year: number;
  month: number;
  planned_hours: number;
}

export interface ProjectAllocationWithEmployee extends ProjectAllocationDB {
  employee: {
    id: string;
    nome: string;
    cargo: string;
    foto_url?: string | null;
  };
  budget_role?: BudgetRoleDB | null;
}

// ─── Frontend aggregate ───────────────────────────────────────────────────────

export interface MonthlyHours {
  year: number;
  month: number; // 1-12
  plannedHours: number;
}

/** One row in the Equipe table = one employee in the project */
export interface ProjectAllocation {
  employeeId: string;
  employee: {
    id: string;
    nome: string;
    cargo: string;
    foto_url?: string | null;
  };
  budgetRoleId: string | null;
  budgetRole: BudgetRoleDB | null;
  customRoleName: string | null;
  roleName: string; // computed: budgetRole?.role_name ?? customRoleName ?? '—'
  monthlyHours: MonthlyHours[];
  totalHours: number;
}

// ─── Mutation payloads ────────────────────────────────────────────────────────

export interface AddAllocationPayload {
  projectId: string;
  tenantId: string;
  employeeId: string;
  budgetRoleId?: string;
  customRoleName?: string;
  monthlyHours: { year: number; month: number; plannedHours: number }[];
}

// ─── Project Roles (team composition) ─────────────────────────────────────────

export type EmploymentType = 'CLT' | 'PJ' | 'FREELANCER';
export type PaymentType = 'hourly' | 'monthly' | 'delivery';

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
