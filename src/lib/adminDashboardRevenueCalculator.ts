/**
 * Cálculo de Receita e Margem real do Dashboard Executivo.
 *
 * Modelo de negócio (decisão confirmada com o time):
 *
 *   Faturamento total = todos os recebimentos da empresa no período
 *                       (parcelas com status `received`).
 *
 *   Receita           = Faturamento total − TODOS os custos do período, onde
 *                       custos = custos de projeto (fornecedores + materiais +
 *                       comissões + reembolsos) + custo CHEIO de pessoal do período.
 *
 *   Margem real (%)   = Receita ÷ Faturamento total × 100.
 *
 * IMPORTANTE — custo de pessoal é o CHEIO, não a folha base:
 * o custo de pessoal abatido aqui é o `total_monthly_cost_estimated` (salário +
 * encargos + provisões + benefícios + ferramentas), e NÃO apenas o salário base
 * exibido no card "Custo da folha". Por isso a Receita é menor que
 * `Faturamento − folha base`.
 *
 * IMPORTANTE — por que NÃO somamos o `laborCost` de timesheet:
 * o custo de mão de obra entra UMA única vez, pelo custo cheio de pessoal. O
 * `laborCost` agregado por timesheet (horas × custo/hora, já com encargos) é o
 * mesmo pessoal, então somá-lo contaria a mão de obra duas vezes. Por isso
 * `projectCostsExLabor` exclui o labor de timesheet.
 *
 * O custo de pessoal é um valor MENSAL (snapshot vigente). Para reconciliar com
 * o faturamento — agregado pelo período selecionado — multiplicamos o custo
 * mensal pela quantidade de meses do período (`monthsInPeriod`).
 */

export interface AdminDashboardRevenueInput {
  /** Faturamento total do período = soma dos recebimentos (revenueReal). */
  faturamentoTotal: number;
  /**
   * Custos de projeto do período, EXCLUINDO mão de obra de timesheet:
   * fornecedores + materiais + comissões + reembolsos.
   */
  projectCostsExLabor: number;
  /**
   * Custo CHEIO de pessoal MENSAL vigente: soma do `total_monthly_cost_estimated`
   * dos ativos (salário + encargos + provisões + benefícios + ferramentas).
   */
  personnelCostMonthly: number;
  /** Quantidade de meses contidos no período selecionado (≥ 1). */
  monthsInPeriod: number;
}

export interface AdminDashboardRevenueResult {
  /** Custo cheio de pessoal do período = custo mensal × meses do período. */
  personnelCostForPeriod: number;
  /** Soma de todos os custos do período (projeto sem labor + pessoal cheio do período). */
  totalCosts: number;
  /** Receita = Faturamento total − totalCosts. */
  receita: number;
  /**
   * Margem real (%) = Receita ÷ Faturamento total × 100.
   * `null` quando não há faturamento no período (não exibir 0% como dado real).
   */
  margemReal: number | null;
}

export function calculateAdminDashboardRevenue(
  input: AdminDashboardRevenueInput,
): AdminDashboardRevenueResult {
  const months = Math.max(1, input.monthsInPeriod);
  const personnelCostForPeriod = input.personnelCostMonthly * months;
  const totalCosts = input.projectCostsExLabor + personnelCostForPeriod;
  const receita = input.faturamentoTotal - totalCosts;
  const margemReal =
    input.faturamentoTotal > 0
      ? (receita / input.faturamentoTotal) * 100
      : null;

  return { personnelCostForPeriod, totalCosts, receita, margemReal };
}
