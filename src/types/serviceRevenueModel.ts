export type RevenueModelType =
  | 'fixed'
  | 'recurring'
  | 'success_fee'
  | 'indication'
  | 'equity'
  | 'fixed_success_fee'
  | 'fixed_recurring'
  | 'recurring_success_fee';

export const REVENUE_MODEL_TYPES: RevenueModelType[] = [
  'fixed',
  'recurring',
  'success_fee',
  'indication',
  'equity',
  'fixed_success_fee',
  'fixed_recurring',
  'recurring_success_fee',
];

export const REVENUE_MODEL_LABELS: Record<RevenueModelType, string> = {
  fixed: 'Escopo Fixo',
  recurring: 'Recorrente',
  success_fee: 'Taxa de Sucesso',
  indication: 'Indicação',
  equity: 'Equity',
  fixed_success_fee: 'Escopo Fixo + Taxa de Sucesso',
  fixed_recurring: 'Escopo Fixo + Recorrência',
  recurring_success_fee: 'Recorrência + Taxa de Sucesso',
};

// Modelos cujo valor base é percentual (ex.: % sobre captação / resultado).
export const PERCENT_MODEL_TYPES: RevenueModelType[] = ['success_fee', 'equity'];

export const isPercentModel = (type: RevenueModelType): boolean =>
  PERCENT_MODEL_TYPES.includes(type);

export interface ServiceRevenueModelDB {
  id: string;
  tenant_id: string;
  service_id: string;
  name: string;
  model_type: RevenueModelType;
  base_value: number | null;
  billing_unit: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceRevenueModel {
  id: string;
  tenantId: string;
  serviceId: string;
  name: string;
  modelType: RevenueModelType;
  baseValue: number | null;
  billingUnit: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceRevenueModelInput {
  serviceId: string;
  name: string;
  modelType: RevenueModelType;
  baseValue?: number | null;
  billingUnit?: string | null;
}

// Mapeia o billing_type legado de `services` para o model_type da hierarquia.
// Espelha exatamente o backfill da migration 20260619120000 (HU-001).
export const billingTypeToModelType = (billingType: string): RevenueModelType => {
  switch (billingType) {
    case 'recurring':
      return 'recurring';
    case 'success_fee':
      return 'success_fee';
    case 'fixed_scope':
    default:
      return 'fixed';
  }
};

const PERIOD_LABELS: Record<string, string> = {
  monthly: '/mês',
  quarterly: '/trimestre',
  semiannual: '/semestre',
  annual: '/ano',
};

// Texto de exibição do valor base de um modelo de receita.
export const modelValueText = (model: Pick<ServiceRevenueModel, 'baseValue' | 'billingUnit'>): string => {
  if (model.baseValue == null) return 'Valor definido no lead';
  if (model.billingUnit === '%') {
    return `${model.baseValue.toFixed(2).replace('.', ',')}%`;
  }
  const formatted = model.baseValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  const suffix = model.billingUnit ? PERIOD_LABELS[model.billingUnit] ?? '' : '';
  return `${formatted}${suffix}`;
};

export const dbToServiceRevenueModel = (db: ServiceRevenueModelDB): ServiceRevenueModel => ({
  id: db.id,
  tenantId: db.tenant_id,
  serviceId: db.service_id,
  name: db.name,
  modelType: db.model_type,
  baseValue: db.base_value,
  billingUnit: db.billing_unit,
  isActive: db.is_active,
  sortOrder: db.sort_order ?? 0,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});
