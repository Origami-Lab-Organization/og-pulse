import { describe, it, expect } from 'vitest';
import { dbToServiceLine, ServiceLineDB } from '@/types/serviceLine';
import {
  dbToServiceRevenueModel,
  ServiceRevenueModelDB,
  billingTypeToModelType,
  modelValueText,
  isPercentModel,
  REVENUE_MODEL_LABELS,
  REVENUE_MODEL_TYPES,
} from '@/types/serviceRevenueModel';
import { dbToService, ServiceDB } from '@/types/service';

// ─── dbToServiceLine ────────────────────────────────────────────────────────────

describe('dbToServiceLine', () => {
  it('converte snake_case → camelCase', () => {
    const db: ServiceLineDB = {
      id: 'l1',
      tenant_id: 't1',
      name: 'Ventures',
      description: 'Linha de ventures',
      is_active: true,
      sort_order: 2,
      created_at: '2026-06-19T00:00:00Z',
      updated_at: '2026-06-19T00:00:00Z',
    };
    const line = dbToServiceLine(db);
    expect(line).toMatchObject({
      id: 'l1',
      tenantId: 't1',
      name: 'Ventures',
      description: 'Linha de ventures',
      isActive: true,
      sortOrder: 2,
    });
  });

  it('faz fallback de sort_order ausente para 0', () => {
    const db = { sort_order: undefined } as unknown as ServiceLineDB;
    expect(dbToServiceLine({ ...db, id: 'x', tenant_id: 't', name: 'n', description: null, is_active: true, created_at: '', updated_at: '' }).sortOrder).toBe(0);
  });
});

// ─── dbToService (serviceLineId) ─────────────────────────────────────────────────

describe('dbToService', () => {
  it('mapeia service_line_id → serviceLineId', () => {
    const db = {
      id: 's1',
      tenant_id: 't1',
      service_line_id: 'l1',
      name: 'App MVP',
      billing_type: 'fixed_scope',
      description: null,
      default_value: null,
      billing_unit: null,
      has_default_value: false,
      is_active: true,
      template_budget_id: null,
      created_at: '',
      updated_at: '',
    } as unknown as ServiceDB;
    expect(dbToService(db).serviceLineId).toBe('l1');
  });

  it('faz fallback de service_line_id nulo para null', () => {
    const db = {
      id: 's1',
      tenant_id: 't1',
      service_line_id: null,
      name: 'Legado',
      billing_type: 'fixed_scope',
      description: null,
      default_value: null,
      billing_unit: null,
      has_default_value: false,
      is_active: true,
      template_budget_id: null,
      created_at: '',
      updated_at: '',
    } as unknown as ServiceDB;
    expect(dbToService(db).serviceLineId).toBeNull();
  });
});

// ─── dbToServiceRevenueModel ─────────────────────────────────────────────────────

describe('dbToServiceRevenueModel', () => {
  it('converte snake_case → camelCase', () => {
    const db: ServiceRevenueModelDB = {
      id: 'm1',
      tenant_id: 't1',
      service_id: 's1',
      name: 'Escopo Fixo',
      model_type: 'fixed',
      base_value: 1000,
      billing_unit: 'R$',
      is_active: true,
      sort_order: 0,
      created_at: '',
      updated_at: '',
    };
    expect(dbToServiceRevenueModel(db)).toMatchObject({
      id: 'm1',
      serviceId: 's1',
      modelType: 'fixed',
      baseValue: 1000,
      billingUnit: 'R$',
      isActive: true,
    });
  });
});

// ─── billingTypeToModelType (espelha o backfill da migration) ─────────────────────

describe('billingTypeToModelType', () => {
  it('mapeia fixed_scope → fixed', () => {
    expect(billingTypeToModelType('fixed_scope')).toBe('fixed');
  });
  it('mapeia recurring → recurring', () => {
    expect(billingTypeToModelType('recurring')).toBe('recurring');
  });
  it('mapeia success_fee → success_fee', () => {
    expect(billingTypeToModelType('success_fee')).toBe('success_fee');
  });
  it('faz fallback de valores desconhecidos para fixed', () => {
    expect(billingTypeToModelType('no_revenue')).toBe('fixed');
    expect(billingTypeToModelType('qualquer')).toBe('fixed');
  });
});

// ─── isPercentModel ──────────────────────────────────────────────────────────────

describe('isPercentModel', () => {
  it('é percentual para success_fee e equity', () => {
    expect(isPercentModel('success_fee')).toBe(true);
    expect(isPercentModel('equity')).toBe(true);
  });
  it('não é percentual para fixed, recurring, indication', () => {
    expect(isPercentModel('fixed')).toBe(false);
    expect(isPercentModel('recurring')).toBe(false);
    expect(isPercentModel('indication')).toBe(false);
  });
});

// ─── REVENUE_MODEL_LABELS / TYPES ────────────────────────────────────────────────

describe('catálogo de tipos de modelo', () => {
  it('tem rótulo pt-BR para os 5 tipos da HU-001', () => {
    expect(REVENUE_MODEL_TYPES).toEqual(['fixed', 'recurring', 'success_fee', 'indication', 'equity']);
    REVENUE_MODEL_TYPES.forEach((t) => {
      expect(REVENUE_MODEL_LABELS[t]).toBeTruthy();
    });
  });
});

// ─── modelValueText ──────────────────────────────────────────────────────────────

describe('modelValueText', () => {
  it('mostra "Valor definido no lead" quando baseValue é nulo', () => {
    expect(modelValueText({ baseValue: null, billingUnit: 'R$' })).toBe('Valor definido no lead');
  });

  it('formata percentual com vírgula', () => {
    expect(modelValueText({ baseValue: 12.5, billingUnit: '%' })).toBe('12,50%');
  });

  it('adiciona sufixo de periodicidade para recorrente', () => {
    expect(modelValueText({ baseValue: 1000, billingUnit: 'monthly' })).toContain('/mês');
  });

  it('formata moeda BRL para valor fixo', () => {
    const text = modelValueText({ baseValue: 1000, billingUnit: 'R$' });
    expect(text).toContain('1.000,00');
  });
});
