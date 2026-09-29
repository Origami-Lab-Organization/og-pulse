import type { BudgetStatus } from '@/types/budget';

/** Orçamento vinculado ao contato (`budgets.prospect_id`, 29/09/2026). */
export interface ProspectBudgetLite {
  id: string;
  budget_number: string;
  title: string;
  final_total: number;
  status: BudgetStatus;
}

/** Projeto criado a partir do Ganho do contato (`projects.prospect_id`). */
export interface ProspectProjectLite {
  id: string;
  name: string;
  status: string;
}
