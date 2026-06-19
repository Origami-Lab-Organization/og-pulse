/**
 * Cálculo do custo de folha (payroll) da empresa.
 *
 * Soma o custo mensal estimado de cada funcionário ATIVO. O custo por
 * funcionário (`totalMonthlyCostEstimated`) já é calculado e persistido no
 * cadastro (ver employeeCostCalculator), incluindo salário/encargos/benefícios/
 * ferramentas conforme o tipo de contratação — aqui apenas consolidamos.
 *
 * Considera apenas `status === 'ativo'`: desligados, arquivados, em desligamento,
 * aguardando confirmação e bloqueados não compõem a folha vigente.
 */

export interface PayrollEmployeeInput {
  status: string;
  totalMonthlyCostEstimated: number;
}

export interface PayrollCost {
  /** Custo mensal total da folha (soma dos ativos). */
  totalMonthlyCost: number;
  /** Nº de funcionários ativos considerados. */
  headcount: number;
}

export function calculatePayrollCost(
  employees: PayrollEmployeeInput[],
): PayrollCost {
  const active = employees.filter((e) => e.status === 'ativo');

  const totalMonthlyCost = active.reduce(
    (sum, e) => sum + (Number(e.totalMonthlyCostEstimated) || 0),
    0,
  );

  return { totalMonthlyCost, headcount: active.length };
}
