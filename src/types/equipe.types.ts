/** Posição de um mês da grade em relação ao mês corrente. */
export type MonthStatus = 'past' | 'current' | 'future';

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
  cost_per_hour: number | null;
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
  id: string; // project_role_allocations.id desta linha de mês
  year: number;
  month: number; // 1-12
  plannedHours: number;
  costPerHour: number | null;
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

// ─── Team rows: vagas manuais e status de desalocação ─────────────────────────

export type TeamRowType = 'vacancy' | 'member_status';
export type TeamRowStatus = 'active' | 'deallocated';

export interface ProjectTeamRowMonthDB {
  id: string;
  row_id: string;
  year: number;
  month: number;
  planned_hours: number;
}

export interface ProjectTeamRowDB {
  id: string;
  project_id: string;
  tenant_id: string;
  row_type: TeamRowType;
  budget_role_id: string | null;
  custom_role_name: string | null;
  employee_id: string | null;
  status: TeamRowStatus;
  deallocated_at: string | null;
  deallocated_by: string | null;
  reactivated_at: string | null;
  months?: ProjectTeamRowMonthDB[];
}

/** Linha "mês×membro" pronta para a tabela — membro ativo, vaga ou desalocado. */
export type TeamAllocationRowKind = 'member' | 'vacancy' | 'deallocated';

export interface TeamMonthCell {
  year: number;
  month: number;
  allocationId: string | null; // null para vaga (não tem project_role_allocations ainda)
  plannedHours: number;
  realizedHours: number | null; // null = mês futuro, sem timesheet ainda
  isOverallocated: boolean; // soma do funcionário em TODOS os projetos no mês > jornada mensal
  /** Jornada mensal do funcionário no mês (capacidade). 0 para vagas / sem capacidade. */
  capacityHours: number;
  /** Horas do funcionário em OUTROS projetos no mês (para a mini-barra de contexto). */
  othersHours: number;
}

export interface TeamAllocationRow {
  kind: TeamAllocationRowKind;
  key: string; // employeeId (member/deallocated) ou team_row id (vaga)
  employeeId: string | null;
  employee: { id: string; nome: string; cargo: string; foto_url?: string | null } | null;
  roleName: string;
  budgetRoleId: string | null;
  isUnbudgeted: boolean; // badge "Não orçado"
  vacancyRowId: string | null; // presente só para vagas manuais (project_team_rows)
  months: Record<string, TeamMonthCell>; // chave "year-month"
  totalPlanned: number;
  totalRealized: number;
  deallocatedAt: string | null;
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

// ─── Alocação GPO (glossário → "Alocação GPO") ────────────────────────────────

export interface GpoMonthInput {
  key: string;
  label: string;
  status: MonthStatus;
  /** Dias úteis totais do mês. */
  workingDays: number;
  /** Dias úteis já decorridos — só relevante no mês corrente. */
  elapsedWorkingDays: number;
  plannedHours: number;
  realizedHours: number;
}

export interface GpoMonthBreakdown extends GpoMonthInput {
  /** Planejado que entra no acumulado — reduzido a pro-rata no mês corrente. */
  plannedConsidered: number;
  isProRata: boolean;
  /** Fração aplicada ao planejado do mês corrente (0..1). Null fora dele. */
  proRataFraction: number | null;
}

export type GpoBand = 'under' | 'healthy' | 'over' | 'unknown';

export interface GpoAllocation {
  /** Apenas meses fechados e o corrente — os futuros já saem de fora. */
  months: GpoMonthBreakdown[];
  plannedAccrued: number;
  realizedAccrued: number;
  /** Null quando não há planejado acumulado — a divisão não teria sentido. */
  percent: number | null;
  band: GpoBand;
}

// ─── Simulação de impacto na margem (aba Equipe v2, §5.3) ──────────────────────

/** Um mês da alocação em composição, enviado à RPC de simulação. */
export interface SimulationMonth {
  year: number;
  month: number; // 1-12
  hours: number;
}

export type MarginVerdict = 'fits' | 'tightens' | 'breaks' | null;

/**
 * Agregados devolvidos pela RPC simulate_allocation_margin_impact.
 * NUNCA contém salário bruto, custo/hora individual ou total_monthly_cost_estimated.
 */
export interface AllocationMarginImpact {
  custoEstimado: number;
  horasTotal: number;
  custoHoraMedio: number;
  /** Margem planejada corrente do projeto (%), null quando sem receita/non_revenue. */
  margemAtual: number | null;
  /** Margem planejada com esta alocação (%), null quando sem receita/non_revenue. */
  margemSimulada: number | null;
  /** Baseline derivada do orçamento (%), null quando o projeto não tem baseline. */
  margemBaseline: number | null;
  /** Δ = simulada − baseline em pp, null sem baseline. */
  deltaPp: number | null;
  /** Tolerância do tenant em pp (default 3). */
  tolPp: number;
  verdict: MarginVerdict;
  hasBaseline: boolean;
  isNonRevenue: boolean;
}
