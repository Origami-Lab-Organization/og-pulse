import { describe, it, expect } from 'vitest';
import {
  calculatePayrollCost,
  calculateLoadedPersonnelCost,
  getBaseSalary,
  getLoadedMonthlyCost,
  type PayrollEmployeeInput,
  type LoadedPersonnelEmployeeInput,
} from '@/lib/payrollCalculator';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emp(overrides: Partial<PayrollEmployeeInput> = {}): PayrollEmployeeInput {
  return {
    status: 'ativo',
    tipoContratacao: 'CLT',
    salarioMensal: 0,
    bolsaAuxilio: 0,
    valorContratoPj: 0,
    proLabore: 0,
    dividendos: 0,
    ...overrides,
  };
}

function empLoaded(
  overrides: Partial<LoadedPersonnelEmployeeInput> = {},
): LoadedPersonnelEmployeeInput {
  return {
    ...emp(overrides),
    totalMonthlyCostEstimated: 0,
    ...overrides,
  };
}

// ─── getBaseSalary ──────────────────────────────────────────────────────────

describe('getBaseSalary', () => {
  it('CLT e Menor Aprendiz usam o salário mensal', () => {
    expect(getBaseSalary(emp({ tipoContratacao: 'CLT', salarioMensal: 5000 }))).toBe(5000);
    expect(
      getBaseSalary(emp({ tipoContratacao: 'MENOR_APRENDIZ', salarioMensal: 1200 })),
    ).toBe(1200);
  });

  it('Estágio usa a bolsa-auxílio', () => {
    expect(getBaseSalary(emp({ tipoContratacao: 'ESTAGIO', bolsaAuxilio: 1500 }))).toBe(1500);
  });

  it('PJ usa o valor do contrato', () => {
    expect(getBaseSalary(emp({ tipoContratacao: 'PJ', valorContratoPj: 9000 }))).toBe(9000);
  });

  it('Sócio soma pró-labore e dividendos', () => {
    expect(
      getBaseSalary(emp({ tipoContratacao: 'SOCIO', proLabore: 3000, dividendos: 7000 })),
    ).toBe(10000);
  });
});

// ─── calculatePayrollCost ─────────────────────────────────────────────────────

describe('calculatePayrollCost', () => {
  it('retorna zero quando não há colaboradores', () => {
    expect(calculatePayrollCost([])).toEqual({ totalMonthlyCost: 0, headcount: 0 });
  });

  it('soma o salário base de todos os ativos, independente do tipo de contratação', () => {
    const employees = [
      emp({ tipoContratacao: 'CLT', salarioMensal: 5000 }),
      emp({ tipoContratacao: 'PJ', valorContratoPj: 9000 }),
      emp({ tipoContratacao: 'SOCIO', proLabore: 3000, dividendos: 7000 }),
      emp({ tipoContratacao: 'ESTAGIO', bolsaAuxilio: 1500 }),
    ];
    const r = calculatePayrollCost(employees);
    // 5000 + 9000 + (3000 + 7000) + 1500 = 25500
    expect(r.totalMonthlyCost).toBe(25500);
    expect(r.headcount).toBe(4);
  });

  it('inclui admins e gerentes (papel no sistema não filtra)', () => {
    // O input não tem systemRole — a função não filtra por papel, então qualquer
    // colaborador ativo entra. Este teste documenta a regra de negócio.
    const employees = [
      emp({ tipoContratacao: 'SOCIO', proLabore: 20000 }), // admin/sócio
      emp({ tipoContratacao: 'CLT', salarioMensal: 8000 }), // gerente CLT
    ];
    expect(calculatePayrollCost(employees).totalMonthlyCost).toBe(28000);
  });

  it('ignora colaboradores não-ativos', () => {
    const employees = [
      emp({ status: 'ativo', salarioMensal: 5000 }),
      emp({ status: 'arquivado', salarioMensal: 9999 }),
      emp({ status: 'bloqueado', salarioMensal: 9999 }),
      emp({ status: 'aguardando_confirmacao', salarioMensal: 9999 }),
      emp({ status: 'desligado', salarioMensal: 9999 }),
    ];
    const r = calculatePayrollCost(employees);
    expect(r.totalMonthlyCost).toBe(5000);
    expect(r.headcount).toBe(1);
  });
});

// ─── getLoadedMonthlyCost / calculateLoadedPersonnelCost ───────────────────────

describe('getLoadedMonthlyCost', () => {
  it('usa o custo cheio estimado quando disponível (inclui encargos/benefícios/ferramentas)', () => {
    expect(
      getLoadedMonthlyCost(empLoaded({ salarioMensal: 5000, totalMonthlyCostEstimated: 8200 })),
    ).toBe(8200);
  });

  it('cai para o salário base quando o custo cheio está zerado (dado legado)', () => {
    expect(
      getLoadedMonthlyCost(empLoaded({ salarioMensal: 5000, totalMonthlyCostEstimated: 0 })),
    ).toBe(5000);
  });
});

describe('calculateLoadedPersonnelCost', () => {
  it('retorna zero quando não há colaboradores', () => {
    expect(calculateLoadedPersonnelCost([])).toEqual({ totalMonthlyCost: 0, headcount: 0 });
  });

  it('soma o custo CHEIO dos ativos — maior que a folha base', () => {
    const employees = [
      empLoaded({ salarioMensal: 5000, totalMonthlyCostEstimated: 8200 }),
      empLoaded({ tipoContratacao: 'PJ', valorContratoPj: 9000, totalMonthlyCostEstimated: 9000 }),
    ];
    const loaded = calculateLoadedPersonnelCost(employees);
    const base = calculatePayrollCost(employees);
    expect(loaded.totalMonthlyCost).toBe(17200); // 8200 + 9000
    expect(loaded.totalMonthlyCost).toBeGreaterThan(base.totalMonthlyCost); // 17200 > 14000
    expect(loaded.headcount).toBe(2);
  });

  it('ignora colaboradores não-ativos', () => {
    const employees = [
      empLoaded({ status: 'ativo', totalMonthlyCostEstimated: 8000 }),
      empLoaded({ status: 'desligado', totalMonthlyCostEstimated: 9999 }),
    ];
    const r = calculateLoadedPersonnelCost(employees);
    expect(r.totalMonthlyCost).toBe(8000);
    expect(r.headcount).toBe(1);
  });
});
