export type BillingType = 'fixed_scope' | 'recurring' | 'success_fee' | 'no_revenue';

export const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  fixed_scope: 'Escopo Fixo',
  recurring: 'Receita Recorrente',
  success_fee: 'Taxa de Sucesso',
  no_revenue: 'Sem Receita',
};

// Backward-compat alias (used in some older components)
export const PROJECT_TYPE_LABELS = BILLING_TYPE_LABELS;
export type ProjectType = BillingType;

export interface ServiceDB {
  id: string;
  tenant_id: string;
  name: string;
  billing_type: BillingType;
  description: string | null;
  default_value: number | null;
  billing_unit: string | null;
  has_default_value: boolean;
  is_active: boolean;
  template_budget_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  billingType: BillingType;
  description: string | null;
  defaultValue: number | null;
  billingUnit: string | null;
  hasDefaultValue: boolean;
  isActive: boolean;
  templateBudgetId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceInput {
  name: string;
  billingType: BillingType;
  description?: string;
  hasDefaultValue: boolean;
  defaultValue?: number;
  billingUnit?: string;
}

export const dbToService = (db: ServiceDB): Service => ({
  id: db.id,
  tenantId: db.tenant_id,
  name: db.name,
  billingType: db.billing_type,
  description: db.description,
  defaultValue: db.default_value,
  billingUnit: db.billing_unit,
  hasDefaultValue: db.has_default_value,
  isActive: db.is_active,
  templateBudgetId: db.template_budget_id ?? null,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export const DEFAULT_SERVICES: CreateServiceInput[] = [
  { name: 'Consultoria de Projeto', billingType: 'fixed_scope', hasDefaultValue: false },
  { name: 'Desenvolvimento de Software', billingType: 'fixed_scope', hasDefaultValue: false },
  { name: 'Suporte Técnico Mensal', billingType: 'recurring', hasDefaultValue: false },
  { name: 'Gestão Contínua', billingType: 'recurring', hasDefaultValue: false },
  { name: 'Consultoria em Incentivos Fiscais (Lei do Bem)', billingType: 'success_fee', hasDefaultValue: false },
  { name: 'Captação de Recursos', billingType: 'success_fee', hasDefaultValue: false },
  { name: 'Discovery / Pré-venda', billingType: 'no_revenue', hasDefaultValue: false },
  { name: 'Prospecção', billingType: 'no_revenue', hasDefaultValue: false },
];
