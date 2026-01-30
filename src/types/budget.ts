export type BudgetStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

export interface BudgetDB {
  id: string;
  tenant_id: string;
  budget_number: string;
  title: string;
  status: BudgetStatus;
  valid_until: string | null;
  client_id: string | null;
  lead_name: string | null;
  lead_contact: string | null;
  start_date: string;
  duration_months: number;
  admin_expenses_percent: number;
  taxes_percent: number;
  commission_percent: number;
  discount_percent: number;
  subtotal: number;
  total_with_fees: number;
  final_total: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetRoleDB {
  id: string;
  budget_id: string;
  role_rate_id: string | null;
  role_name: string;
  seniority: string;
  hourly_rate: number;
  created_at: string;
}

export interface BudgetRoleMonthDB {
  id: string;
  budget_role_id: string;
  month_number: number;
  hours: number;
}

export interface BudgetMaterialDB {
  id: string;
  budget_id: string;
  description: string;
  value: number;
  created_at: string;
}

export interface BudgetSupplierDB {
  id: string;
  budget_id: string;
  name: string;
  description: string | null;
  monthly_value: number;
  created_at: string;
}

export interface BudgetWithDetails extends BudgetDB {
  client?: {
    id: string;
    company_name: string;
    trading_name: string | null;
  } | null;
  roles: BudgetRoleWithMonths[];
  materials: BudgetMaterialDB[];
  suppliers: BudgetSupplierDB[];
}

export interface BudgetRoleWithMonths extends BudgetRoleDB {
  months: BudgetRoleMonthDB[];
}

// Form types for creating/updating budgets
export interface BudgetMaterialInput {
  tempId: string;
  description: string;
  value: number;
}

export interface BudgetSupplierInput {
  tempId: string;
  name: string;
  description: string;
  monthlyValue: number;
}

export interface BudgetRoleInput {
  tempId: string;
  roleRateId: string;
  roleName: string;
  seniority: string;
  hourlyRate: number;
  months: { monthNumber: number; hours: number }[];
}

export interface CreateBudgetInput {
  title: string;
  validUntil?: string;
  clientId?: string;
  leadName?: string;
  leadContact?: string;
  startDate: string;
  durationMonths: number;
  adminExpensesPercent: number;
  taxesPercent: number;
  commissionPercent: number;
  netMarginPercent: number;
  discountPercent: number;
  notes?: string;
  roles: BudgetRoleInput[];
  materials: BudgetMaterialInput[];
  suppliers: BudgetSupplierInput[];
}

export interface UpdateBudgetInput extends Partial<CreateBudgetInput> {
  status?: BudgetStatus;
}

// Calculation helpers
export interface BudgetCalculation {
  laborCost: number;
  suppliersTotal: number;
  materialsTotal: number;
  totalCost: number;
  taxes: number;
  adminExpenses: number;
  commission: number;
  netMargin: number;
  sellingPrice: number;
  discount: number;
  finalTotal: number;
}

/**
 * Calcula os totais do orçamento usando fórmula de markup divisor.
 * Preço de Venda = Custo Total / (1 - soma_percentuais)
 */
export function calculateBudgetTotals(
  roles: BudgetRoleInput[],
  materials: BudgetMaterialInput[],
  suppliers: BudgetSupplierInput[],
  durationMonths: number,
  adminExpensesPercent: number,
  taxesPercent: number,
  commissionPercent: number,
  netMarginPercent: number,
  discountPercent: number
): BudgetCalculation {
  // Calculate labor cost from all roles and their hours
  const laborCost = roles.reduce((acc, role) => {
    const roleHours = role.months.reduce((h, m) => h + m.hours, 0);
    return acc + roleHours * role.hourlyRate;
  }, 0);

  // Calculate suppliers total (monthly value * duration)
  const suppliersTotal = suppliers.reduce((acc, s) => acc + (s.monthlyValue || 0) * durationMonths, 0);

  // Calculate materials total
  const materialsTotal = materials.reduce((acc, m) => acc + (m.value || 0), 0);

  // Total cost
  const totalCost = laborCost + suppliersTotal + materialsTotal;

  // Sum of all percentage fees
  const totalPercentages = (taxesPercent + adminExpensesPercent + commissionPercent + netMarginPercent) / 100;

  // Markup formula: Selling Price = Cost / (1 - sum_percentages)
  const markupDivisor = 1 - totalPercentages;
  const sellingPrice = markupDivisor > 0 ? totalCost / markupDivisor : totalCost;

  // Calculate each component based on selling price
  const taxes = sellingPrice * (taxesPercent / 100);
  const adminExpenses = sellingPrice * (adminExpensesPercent / 100);
  const commission = sellingPrice * (commissionPercent / 100);
  const netMargin = sellingPrice * (netMarginPercent / 100);

  // Discount applies to selling price
  const discount = sellingPrice * (discountPercent / 100);
  const finalTotal = sellingPrice - discount;

  return {
    laborCost,
    suppliersTotal,
    materialsTotal,
    totalCost,
    taxes,
    adminExpenses,
    commission,
    netMargin,
    sellingPrice,
    discount,
    finalTotal,
  };
}

export const BUDGET_STATUS_OPTIONS = [
  { value: 'draft', label: 'Rascunho', color: 'bg-muted text-muted-foreground' },
  { value: 'sent', label: 'Enviado', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'approved', label: 'Aprovado', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'rejected', label: 'Rejeitado', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'expired', label: 'Expirado', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
] as const;

export function getBudgetStatusOption(status: BudgetStatus) {
  return BUDGET_STATUS_OPTIONS.find((s) => s.value === status) || BUDGET_STATUS_OPTIONS[0];
}
