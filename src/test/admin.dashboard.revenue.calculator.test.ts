import { describe, it, expect } from 'vitest';
import {
  calculateAdminDashboardRevenue,
  type AdminDashboardRevenueInput,
} from '@/lib/adminDashboardRevenueCalculator';

function input(overrides: Partial<AdminDashboardRevenueInput> = {}): AdminDashboardRevenueInput {
  return {
    faturamentoTotal: 0,
    projectCostsExLabor: 0,
    personnelCostMonthly: 0,
    monthsInPeriod: 1,
    ...overrides,
  };
}

describe('calculateAdminDashboardRevenue', () => {
  it('multiplica a folha mensal pelos meses do período', () => {
    const r = calculateAdminDashboardRevenue(input({ personnelCostMonthly: 10_000, monthsInPeriod: 3 }));
    expect(r.personnelCostForPeriod).toBe(30_000);
  });

  it('soma custos de projeto (sem labor) com a folha do período', () => {
    const r = calculateAdminDashboardRevenue(
      input({ projectCostsExLabor: 5_000, personnelCostMonthly: 10_000, monthsInPeriod: 2 }),
    );
    // 5.000 + (10.000 × 2)
    expect(r.totalCosts).toBe(25_000);
  });

  it('Receita = Faturamento − todos os custos', () => {
    const r = calculateAdminDashboardRevenue(
      input({
        faturamentoTotal: 100_000,
        projectCostsExLabor: 20_000,
        personnelCostMonthly: 30_000,
        monthsInPeriod: 1,
      }),
    );
    // 100.000 − (20.000 + 30.000)
    expect(r.receita).toBe(50_000);
  });

  it('Margem real = Receita ÷ Faturamento × 100', () => {
    const r = calculateAdminDashboardRevenue(
      input({ faturamentoTotal: 100_000, projectCostsExLabor: 20_000, personnelCostMonthly: 30_000 }),
    );
    expect(r.margemReal).toBeCloseTo(50, 5);
  });

  it('Receita pode ser negativa quando os custos superam o faturamento', () => {
    const r = calculateAdminDashboardRevenue(
      input({ faturamentoTotal: 40_000, projectCostsExLabor: 20_000, personnelCostMonthly: 30_000 }),
    );
    expect(r.receita).toBe(-10_000);
    expect(r.margemReal).toBeCloseTo(-25, 5);
  });

  it('Margem é null (não 0%) quando não há faturamento no período', () => {
    const r = calculateAdminDashboardRevenue(input({ faturamentoTotal: 0, personnelCostMonthly: 5_000 }));
    expect(r.margemReal).toBeNull();
  });

  it('trata monthsInPeriod < 1 como 1 mês (guarda contra divisão temporal inválida)', () => {
    const r = calculateAdminDashboardRevenue(input({ personnelCostMonthly: 8_000, monthsInPeriod: 0 }));
    expect(r.personnelCostForPeriod).toBe(8_000);
  });

  it('não conta mão de obra em dobro: labor de timesheet não entra no cálculo', () => {
    // projectCostsExLabor já exclui o laborCost; a folha é a única fonte de custo de pessoal.
    const r = calculateAdminDashboardRevenue(
      input({
        faturamentoTotal: 100_000,
        projectCostsExLabor: 10_000, // fornecedores + materiais + comissões + reembolsos
        personnelCostMonthly: 40_000,
        monthsInPeriod: 1,
      }),
    );
    expect(r.totalCosts).toBe(50_000);
    expect(r.receita).toBe(50_000);
  });
});
