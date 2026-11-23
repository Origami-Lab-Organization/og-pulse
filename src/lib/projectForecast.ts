import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { bucketTotal, monthKeyOf } from '@/lib/projectMonthlyCosts';
import type { ContractCurvePoint } from '@/components/projects/detail/financial/ProjectContractCurveChart';
import type { ProjectCostMonth } from '@/types/projectCostSummary';
import type { ForecastInstallment, ForecastTone, ProjectForecast } from '@/types/projectForecast';

/**
 * Forecast e curva de contrato da aba Financeiro (US-0031), sobre os meses de calendário da
 * regra única do custo (`useProjectCostSummary().months`, US-0026). Decisões de 23/11/2026:
 *
 * - Custo final estimado = custo realizado + o que ainda falta. O que falta, mês a mês do mês
 *   atual até a data de fim, é o planejado menos o realizado do mês (nunca negativo).
 * - Depois da data de fim, o planejado não lançado não conta mais: o custo final é o realizado.
 * - Meses fora do período (lançamentos antigos) entram no realizado, nunca no que falta.
 */

interface PeriodEnd {
  end_date: string | null;
  is_continuous: boolean | null;
}

/** A data de fim já passou (projeto contínuo ou sem fim nunca termina). */
export function hasProjectEnded(project: PeriodEnd, today: Date): boolean {
  if (project.is_continuous || !project.end_date) return false;
  return format(today, 'yyyy-MM-dd') > project.end_date;
}

const plannedOf = (month: ProjectCostMonth) => bucketTotal(month.planned);
const realizedOf = (month: ProjectCostMonth) => bucketTotal(month.realized);

/**
 * O que ainda falta de um mês, do mês atual em diante: planejado − realizado, nunca negativo.
 * No mês atual é o resto do plano; num mês futuro, desconta o que já foi pago antecipado.
 */
function remainingOf(month: ProjectCostMonth, todayKey: string): number {
  if (month.outOfPeriod || month.key < todayKey) return 0;
  return Math.max(0, plannedOf(month) - realizedOf(month));
}

export function buildProjectForecast(input: {
  months: ProjectCostMonth[];
  project: PeriodEnd;
  contract: number;
  commissionPlanned: number;
  today: Date;
}): ProjectForecast {
  const { months, project, contract, commissionPlanned, today } = input;
  const todayKey = monthKeyOf(today);
  const projectEnded = hasProjectEnded(project, today);
  const spent = months.reduce((sum, month) => sum + realizedOf(month), 0);
  const remaining = projectEnded ? 0 : months.reduce((sum, month) => sum + remainingOf(month, todayKey), 0);
  const forecastCost = spent + remaining;
  const forecastMargin = contract > 0 ? ((contract - commissionPlanned - forecastCost) / contract) * 100 : 0;
  return { spent, remaining, forecastCost, forecastMargin, projectEnded };
}

const monthLabel = (key: string) => {
  const name = format(parseISO(`${key}-01`), 'MMM', { locale: ptBR });
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}/${key.slice(2, 4)}`;
};

interface CurveMonth {
  key: string;
  revenuePlanned: number;
  revenueReceived: number;
  costRealized: number;
  costRemaining: number;
}

/** Meses da curva: os do custo mais os das parcelas (a última parcela costuma vencer depois). */
function curveMonths(
  months: ProjectCostMonth[],
  installments: ForecastInstallment[],
  todayKey: string,
  projectEnded: boolean,
): CurveMonth[] {
  const byKey = new Map<string, CurveMonth>();
  const ensure = (key: string) => {
    let entry = byKey.get(key);
    if (!entry) {
      entry = { key, revenuePlanned: 0, revenueReceived: 0, costRealized: 0, costRemaining: 0 };
      byKey.set(key, entry);
    }
    return entry;
  };
  months.forEach((month) => {
    const entry = ensure(month.key);
    entry.costRealized += realizedOf(month);
    entry.costRemaining += projectEnded ? 0 : remainingOf(month, todayKey);
  });
  installments.forEach((installment) => {
    const entry = ensure(installment.due_date.slice(0, 7));
    entry.revenuePlanned += Number(installment.value);
    if (installment.status === 'received') entry.revenueReceived += Number(installment.value);
  });
  return Array.from(byKey.values()).sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Curva acumulada receita × custo: sólido até o mês atual (realizado), tracejado do mês
 * atual em diante (projeção). O ponto final do custo projetado é o custo final estimado.
 */
export function buildContractCurve(input: {
  months: ProjectCostMonth[];
  installments: ForecastInstallment[];
  project: PeriodEnd;
  today: Date;
}): { points: ContractCurvePoint[]; todayLabel: string | null } {
  const todayKey = monthKeyOf(input.today);
  const projectEnded = hasProjectEnded(input.project, input.today);
  const months = curveMonths(input.months, input.installments, todayKey, projectEnded);

  let revenue = 0;
  let cost = 0;
  let revenueProj = 0;
  let costProj = 0;
  const points = months.map((month) => {
    const isPast = month.key <= todayKey;
    revenue += month.revenueReceived;
    cost += month.costRealized;
    // Projeção de receita: o recebido até hoje mais todas as parcelas dos meses seguintes.
    revenueProj = isPast ? revenue : revenueProj + month.revenuePlanned;
    costProj = (isPast ? cost : costProj + month.costRealized) + month.costRemaining;
    const showProj = month.key >= todayKey;
    return {
      name: monthLabel(month.key),
      revenue: isPast ? revenue : null,
      cost: isPast ? cost : null,
      revenueProj: showProj ? revenueProj : null,
      costProj: showProj ? costProj : null,
    };
  });

  const todayMonth = months.find((month) => month.key === todayKey);
  return { points, todayLabel: todayMonth ? monthLabel(todayMonth.key) : null };
}

/** Tolerância abaixo da meta para o amarelo: 10% do valor da meta (decisão de 23/11/2026). */
export const FORECAST_WARNING_RATIO = 0.1;

/**
 * Faixa do forecast (US-0032). Ex.: meta 55% → verde a partir de 55%, amarelo de 49,5% até
 * 55%, vermelho abaixo de 49,5%.
 */
export function forecastTone(forecastMargin: number, marginTarget: number, hasCostPlanned: boolean): ForecastTone {
  if (!hasCostPlanned || marginTarget <= 0) return 'neutral';
  if (forecastMargin >= marginTarget) return 'ok';
  return marginTarget - forecastMargin <= marginTarget * FORECAST_WARNING_RATIO ? 'warning' : 'critical';
}
