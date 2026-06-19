/**
 * Cálculo do custo de folha (payroll) exibido no Dashboard.
 *
 * Regra (decisão de negócio): soma o SALÁRIO BASE de cada colaborador com
 * `status === 'ativo'`, independentemente do papel no sistema (admin, gerente,
 * usuário) ou do tipo de contratação. Desligados, arquivados, em desligamento,
 * aguardando confirmação e bloqueados não compõem a folha vigente.
 *
 * "Salário base" é a remuneração-base de cada tipo de contratação (sem encargos,
 * provisões, benefícios ou ferramentas) — espelhando o `baseAmount` do
 * employeeCostCalculator para manter coerência com as telas de cadastro:
 *   - CLT / Menor Aprendiz: salário bruto mensal
 *   - Estágio:              bolsa-auxílio
 *   - PJ:                   valor mensal do contrato
 *   - Sócio:                pró-labore + dividendos
 */
import type { ContractType } from '@/types/employee';

export interface PayrollEmployeeInput {
  status: string;
  tipoContratacao: ContractType;
  /** Salário bruto mensal (base de CLT/Menor Aprendiz). */
  salarioMensal: number;
  /** Bolsa-auxílio (base de Estágio). */
  bolsaAuxilio: number;
  /** Valor mensal do contrato (base de PJ). */
  valorContratoPj: number;
  /** Pró-labore (base de Sócio). */
  proLabore: number;
  /** Dividendos (compõe a base de Sócio). */
  dividendos: number;
}

export interface PayrollCost {
  /** Soma dos salários base dos colaboradores ativos. */
  totalMonthlyCost: number;
  /** Nº de colaboradores ativos considerados. */
  headcount: number;
}

/** Salário base do colaborador conforme o tipo de contratação. */
export function getBaseSalary(e: PayrollEmployeeInput): number {
  switch (e.tipoContratacao) {
    case 'ESTAGIO':
      return e.bolsaAuxilio || 0;
    case 'PJ':
      return e.valorContratoPj || 0;
    case 'SOCIO':
      return (e.proLabore || 0) + (e.dividendos || 0);
    case 'CLT':
    case 'MENOR_APRENDIZ':
    default:
      return e.salarioMensal || 0;
  }
}

export function calculatePayrollCost(
  employees: PayrollEmployeeInput[],
): PayrollCost {
  const active = employees.filter((e) => e.status === 'ativo');

  const totalMonthlyCost = active.reduce((sum, e) => sum + getBaseSalary(e), 0);

  return { totalMonthlyCost, headcount: active.length };
}

// ─── Custo CHEIO de pessoal ─────────────────────────────────────────────────
// Diferente da folha base, é o custo total de cada colaborador: salário base +
// encargos + provisões + benefícios + ferramentas (o `total_monthly_cost_estimated`,
// calculado por employeeCostCalculator). Usado no cálculo de Receita do Dashboard,
// onde TODOS os custos de pessoal precisam ser abatidos do faturamento.

export interface LoadedPersonnelEmployeeInput extends PayrollEmployeeInput {
  /**
   * Custo cheio mensal estimado (salário + encargos + provisões + benefícios +
   * ferramentas). Vem de `total_monthly_cost_estimated`.
   */
  totalMonthlyCostEstimated: number;
}

/**
 * Custo mensal CHEIO do colaborador. Usa o total estimado quando disponível;
 * se estiver zerado (dado legado ainda não recalculado), cai para o salário base
 * como piso — para nunca subestimar o custo de pessoal abaixo da folha.
 */
export function getLoadedMonthlyCost(e: LoadedPersonnelEmployeeInput): number {
  const loaded = Number(e.totalMonthlyCostEstimated) || 0;
  return loaded > 0 ? loaded : getBaseSalary(e);
}

/** Soma do custo cheio mensal dos colaboradores com status 'ativo'. */
export function calculateLoadedPersonnelCost(
  employees: LoadedPersonnelEmployeeInput[],
): PayrollCost {
  const active = employees.filter((e) => e.status === 'ativo');

  const totalMonthlyCost = active.reduce((sum, e) => sum + getLoadedMonthlyCost(e), 0);

  return { totalMonthlyCost, headcount: active.length };
}
