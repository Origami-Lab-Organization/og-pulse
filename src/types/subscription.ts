// ─── Billing Cycle ───────────────────────────────────────────────────────────

export type BillingCycle = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

// ─── Subscription Category ───────────────────────────────────────────────────

export type SubscriptionCategory =
  | 'software'
  | 'infrastructure'
  | 'design'
  | 'marketing'
  | 'analytics'
  | 'communication'
  | 'project_management'
  | 'finance'
  | 'other';

export const SUBSCRIPTION_CATEGORY_LABELS: Record<SubscriptionCategory, string> = {
  software: 'Software',
  infrastructure: 'Infraestrutura',
  design: 'Design',
  marketing: 'Marketing',
  analytics: 'Analytics',
  communication: 'Comunicação',
  project_management: 'Gestão de Projetos',
  finance: 'Financeiro',
  other: 'Outros',
};

export const SUBSCRIPTION_CATEGORIES = [
  { value: 'software' as const, label: 'Software' },
  { value: 'infrastructure' as const, label: 'Infraestrutura' },
  { value: 'design' as const, label: 'Design' },
  { value: 'marketing' as const, label: 'Marketing' },
  { value: 'analytics' as const, label: 'Analytics' },
  { value: 'communication' as const, label: 'Comunicação' },
  { value: 'project_management' as const, label: 'Gestão de Projetos' },
  { value: 'finance' as const, label: 'Financeiro' },
  { value: 'other' as const, label: 'Outros' },
] as const;

// ─── DB Types ─────────────────────────────────────────────────────────────────

export interface SubscriptionDB {
  id: string;
  tenant_id: string;
  name: string;
  vendor: string | null;
  description: string | null;
  category: string | null;
  monthly_cost: number;
  annual_cost: number | null;
  billing_cycle: string | null;
  url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Frontend Type ────────────────────────────────────────────────────────────

export interface Subscription {
  id: string;
  tenantId: string;
  name: string;
  vendor: string | null;
  description: string | null;
  category: string | null;
  monthlyCost: number;
  annualCost: number | null;
  billingCycle: BillingCycle | null;
  url: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Converter ────────────────────────────────────────────────────────────────

export const dbToSubscription = (row: SubscriptionDB): Subscription => ({
  id: row.id,
  tenantId: row.tenant_id,
  name: row.name,
  vendor: row.vendor,
  description: row.description,
  category: row.category,
  monthlyCost: row.monthly_cost,
  annualCost: row.annual_cost,
  billingCycle: row.billing_cycle as BillingCycle | null,
  url: row.url,
  notes: row.notes,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface CreateSubscriptionInput {
  name: string;
  monthlyCost: number;
  vendor?: string;
  description?: string;
  category?: string;
  annualCost?: number;
  billingCycle?: BillingCycle;
  url?: string;
  notes?: string;
}

export interface UpdateSubscriptionInput {
  name?: string;
  monthlyCost?: number;
  vendor?: string;
  description?: string;
  category?: string;
  annualCost?: number;
  billingCycle?: BillingCycle;
  url?: string;
  notes?: string;
  isActive?: boolean;
}

// ─── Budget Subscriptions ─────────────────────────────────────────────────────

export interface BudgetSubscriptionDB {
  id: string;
  budget_id: string;
  subscription_id: string | null;
  name: string;
  description: string | null;
  monthly_value: number;
  is_recurring: boolean;
  created_at: string;
}

export interface BudgetSubscriptionInput {
  tempId: string;
  subscriptionId?: string;
  name: string;
  description?: string;
  monthlyValue: number;
  isRecurring: boolean;
}

// ─── Project Subscriptions ────────────────────────────────────────────────────

export interface ProjectSubscriptionDB {
  id: string;
  project_id: string;
  subscription_id: string | null;
  budget_subscription_id: string | null;
  name: string;
  description: string | null;
  monthly_value: number;
  is_recurring: boolean;
  start_month: number | null;
  end_month: number | null;
  is_realized: boolean;
  created_at: string;
}

export interface CreateProjectSubscriptionInput {
  projectId: string;
  subscriptionId?: string;
  budgetSubscriptionId?: string;
  name?: string;
  description?: string;
  monthlyValue?: number;
  isRecurring?: boolean;
  startMonth?: number;
  endMonth?: number;
  isRealized?: boolean;
}
