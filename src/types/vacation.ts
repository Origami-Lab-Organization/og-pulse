import { ContractType } from './employee';

export type VacationRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type VacationApprovalStatus = 'pending' | 'approved' | 'rejected';

export const VACATION_REQUEST_STATUS_LABELS: Record<VacationRequestStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Recusada',
  cancelled: 'Cancelada',
};

/** Dias de férias concedidos a cada aniversário completo de 12 meses (ver ADR-0003). */
export const VACATION_DAYS_PER_YEAR = 30;

/** Tipos de contrato com direito a solicitar férias (ver ADR-0003). */
export const VACATION_ELIGIBLE_CONTRACTS: readonly ContractType[] = ['CLT', 'MENOR_APRENDIZ'];

export function isVacationEligible(contractType: ContractType): boolean {
  return VACATION_ELIGIBLE_CONTRACTS.includes(contractType);
}

// ---- DB shapes (snake_case, espelham as tabelas) ----

export interface VacationRequestDB {
  id: string;
  tenant_id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  status: VacationRequestStatus;
  auto_approved: boolean;
  notes: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VacationApprovalDB {
  id: string;
  request_id: string;
  approver_id: string;
  project_id: string | null;
  status: VacationApprovalStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ---- Frontend shapes (com joins resolvidos) ----

export interface VacationApproval extends VacationApprovalDB {
  approver_name?: string;
  project_name?: string;
}

export interface VacationRequest extends VacationRequestDB {
  employee_name?: string;
  approvals?: VacationApproval[];
}

export interface CreateVacationRequestInput {
  startDate: string;
  endDate: string;
  daysRequested: number;
  notes?: string;
}

/** Resultado do cálculo de saldo de férias de um funcionário. */
export interface VacationBalance {
  /** Anos completos desde a admissão. */
  completedYears: number;
  /** Total acumulado de dias ganhos (completedYears * 30). */
  earnedDays: number;
  /** Dias em pedidos aprovados. */
  usedDays: number;
  /** Dias em pedidos pendentes (reservados). */
  pendingDays: number;
  /** Dias livres para solicitar (earned - used - pending), nunca negativo. */
  availableDays: number;
}
