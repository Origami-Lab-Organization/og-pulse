import { z } from 'zod';

// Enums
export const TERMINATION_TYPES = ['voluntary', 'involuntary', 'contract_end', 'internship_end', 'retirement', 'mutual_agreement'] as const;
export type TerminationType = typeof TERMINATION_TYPES[number];

export const TERMINATION_TYPE_LABELS: Record<TerminationType, string> = {
  voluntary: 'Voluntário',
  involuntary: 'Involuntário',
  contract_end: 'Fim de Contrato',
  internship_end: 'Fim de Estágio',
  retirement: 'Aposentadoria',
  mutual_agreement: 'Acordo Mútuo',
};

export const REASON_CATEGORIES = ['performance', 'restructuring', 'personal_request', 'contract_expiration', 'disciplinary', 'other'] as const;
export type ReasonCategory = typeof REASON_CATEGORIES[number];

export const REASON_CATEGORY_LABELS: Record<ReasonCategory, string> = {
  performance: 'Desempenho',
  restructuring: 'Reestruturação',
  personal_request: 'Pedido Pessoal',
  contract_expiration: 'Expiração de Contrato',
  disciplinary: 'Disciplinar',
  other: 'Outro',
};

export const TERMINATION_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
export type TerminationStatus = typeof TERMINATION_STATUSES[number];

export const TERMINATION_STATUS_LABELS: Record<TerminationStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const DOCUMENT_TYPES = ['resignation_letter', 'termination_letter', 'mutual_agreement', 'trct', 'homologation', 'receipt', 'other'] as const;
export type TerminationDocumentType = typeof DOCUMENT_TYPES[number];

export const DOCUMENT_TYPE_LABELS: Record<TerminationDocumentType, string> = {
  resignation_letter: 'Carta de Demissão',
  termination_letter: 'Carta de Desligamento',
  mutual_agreement: 'Acordo Mútuo',
  trct: 'TRCT',
  homologation: 'Homologação',
  receipt: 'Recibo',
  other: 'Outro',
};

export const ADJUSTMENT_TYPES = ['salary_proportional', 'vacation', 'thirteenth_salary', 'fgts', 'fgts_fine', 'overtime', 'benefits_discount', 'advance_discount', 'other'] as const;
export type PayrollAdjustmentType = typeof ADJUSTMENT_TYPES[number];

export const ADJUSTMENT_TYPE_LABELS: Record<PayrollAdjustmentType, string> = {
  salary_proportional: 'Saldo de Salário',
  vacation: 'Férias Proporcionais',
  thirteenth_salary: '13º Proporcional',
  fgts: 'FGTS',
  fgts_fine: 'Multa FGTS (40%)',
  overtime: 'Horas Extras',
  benefits_discount: 'Desconto de Benefícios',
  advance_discount: 'Desconto de Adiantamento',
  other: 'Outro',
};

// Zod Schemas
export const employeeTerminationSchema = z.object({
  employee_id: z.string().uuid(),
  termination_date: z.string().min(1, 'Data de desligamento é obrigatória'),
  notification_date: z.string().nullable().optional(),
  termination_type: z.enum(TERMINATION_TYPES),
  reason: z.string().nullable().optional(),
  reason_category: z.enum(REASON_CATEGORIES).default('other'),
  notice_period_days: z.number().int().min(0).default(0),
  notice_worked: z.boolean().default(false),
  final_payroll_adjustments: z.any().nullable().optional(),
  severance_package: z.any().nullable().optional(),
  exit_interview_completed: z.boolean().default(false),
  exit_interview_notes: z.string().nullable().optional(),
  status: z.enum(TERMINATION_STATUSES).default('pending'),
});

export const terminationDocumentSchema = z.object({
  termination_id: z.string().uuid(),
  document_name: z.string().min(1, 'Nome do documento é obrigatório'),
  document_type: z.enum(DOCUMENT_TYPES).default('other'),
  file_url: z.string().url(),
  file_size: z.number().int().nullable().optional(),
  mime_type: z.string().nullable().optional(),
});

export const payrollAdjustmentSchema = z.object({
  termination_id: z.string().uuid(),
  adjustment_type: z.enum(ADJUSTMENT_TYPES),
  description: z.string().nullable().optional(),
  amount: z.number().min(0, 'Valor deve ser positivo'),
  is_credit: z.boolean().default(true),
  calculation_details: z.any().nullable().optional(),
});

// DB Row types
export interface EmployeeTermination {
  id: string;
  employee_id: string;
  termination_date: string;
  notification_date: string | null;
  termination_type: TerminationType;
  reason: string | null;
  reason_category: ReasonCategory;
  notice_period_days: number;
  notice_worked: boolean;
  final_payroll_adjustments: Record<string, unknown> | null;
  severance_package: Record<string, unknown> | null;
  exit_interview_completed: boolean;
  exit_interview_notes: string | null;
  status: TerminationStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TerminationDocument {
  id: string;
  termination_id: string;
  document_name: string;
  document_type: TerminationDocumentType;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface PayrollAdjustment {
  id: string;
  termination_id: string;
  adjustment_type: PayrollAdjustmentType;
  description: string | null;
  amount: number;
  is_credit: boolean;
  calculation_details: Record<string, unknown> | null;
  created_at: string;
}

// Form data types
export type EmployeeTerminationFormData = z.infer<typeof employeeTerminationSchema>;
export type TerminationDocumentFormData = z.infer<typeof terminationDocumentSchema>;
export type PayrollAdjustmentFormData = z.infer<typeof payrollAdjustmentSchema>;
