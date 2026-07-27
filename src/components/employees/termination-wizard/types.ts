import { TerminationType, ReasonCategory } from '@/types/termination';

export interface ManualAdjustment {
  id: string;
  type: string;
  description: string;
  amount: number;
  isCredit: boolean;
}

export interface TerminationWizardData {
  // Step 1
  notification_date: string;
  termination_date: string;
  termination_type: TerminationType;
  reason_category: ReasonCategory;
  reason: string;
  is_just_cause: boolean;
  /** Só relevante quando `termination_type === 'early_contract_termination'` — decide
   *  Art. 479 CLT (empresa, crédito) vs Art. 480 CLT (funcionário, débito). */
  early_termination_initiated_by: 'company' | 'employee' | null;
  exit_interview_completed: boolean;
  exit_interview_notes: string;
  // Step 2
  notice_period_days: number;
  notice_worked: boolean;
  notice_indemnified_by_company: boolean;
  notice_notes: string;
  // Step 3
  manual_adjustments: ManualAdjustment[];
  // Step 4 — chave = `DocItem.key` do checklist do tipo de contratação; um arquivo por item
  document_files: Record<string, File | null>;
}

export function getDefaultWizardData(): TerminationWizardData {
  const today = new Date().toISOString().split('T')[0];
  return {
    notification_date: today,
    termination_date: '',
    termination_type: 'voluntary',
    reason_category: 'other',
    reason: '',
    is_just_cause: false,
    early_termination_initiated_by: null,
    exit_interview_completed: false,
    exit_interview_notes: '',
    notice_period_days: 30,
    notice_worked: false,
    notice_indemnified_by_company: true,
    notice_notes: '',
    manual_adjustments: [],
    document_files: {},
  };
}
