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
  exit_interview_completed: boolean;
  exit_interview_notes: string;
  // Step 2
  notice_period_days: number;
  notice_worked: boolean;
  notice_indemnified_by_company: boolean;
  notice_notes: string;
  // Step 3
  manual_adjustments: ManualAdjustment[];
  // Step 4
  uploaded_files: File[];
  document_checklist: Record<string, boolean>;
}

export function getDefaultWizardData(): TerminationWizardData {
  const today = new Date().toISOString().split('T')[0];
  return {
    notification_date: today,
    termination_date: '',
    termination_type: 'voluntary',
    reason_category: 'other',
    reason: '',
    exit_interview_completed: false,
    exit_interview_notes: '',
    notice_period_days: 30,
    notice_worked: false,
    notice_indemnified_by_company: true,
    notice_notes: '',
    manual_adjustments: [],
    uploaded_files: [],
    document_checklist: {},
  };
}
