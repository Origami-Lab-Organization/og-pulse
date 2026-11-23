import { addMonths, format, parseISO, startOfMonth } from 'date-fns';
import type { ProjectCostCategory, ProjectCostDB, ProjectWithRelations } from '@/types/project';
import type { CostBucket, DatedCost, ProjectCostMonth } from '@/types/projectCostSummary';

/**
 * Custo do projeto mês a mês de CALENDÁRIO (US-0026), para o gráfico e a rosca da aba
 * Despesas. Regras:
 *
 * - Os meses vão do mês de início ao mês de fim do projeto, mesmo sem mês cheio (19/10 a
 *   17/11 = out e nov). Projeto contínuo: 12 meses; sem data de fim: só o mês de início.
 * - Nada é descartado nem empurrado de mês: lançamento fora do período abre um mês extra,
 *   marcado `outOfPeriod`, e entra no total (decisão de 23/11/2026).
 * - Hora lançada: mês da data da hora. Custo avulso: mês da `cost_date` (sem ela, o mês
 *   relativo legado). Custo recorrente: os meses de `project_cost_months`, como em
 *   `projectCostsService` (realizado pela data da nota, planejado pelo mês relativo).
 * - A soma dos meses é igual aos totais de `useProjectCostSummary`: custo recorrente cujos
 *   meses não fecham com o total do custo leva a diferença para o mês inicial dele.
 */

type PeriodProject = Pick<ProjectWithRelations, 'start_date' | 'end_date' | 'is_continuous'>;
type MonthlyCost = Pick<
  ProjectCostDB,
  | 'category'
  | 'cost_date'
  | 'planned_amount_brl'
  | 'actual_amount_brl'
  | 'is_recurring'
  | 'start_month'
  | 'end_month'
  | 'month_number'
  | 'months'
>;
type Kind = 'planned' | 'realized';

const CENTS = 0.005;

export const monthKeyOf = (date: Date): string => format(date, 'yyyy-MM');

const emptyBucket = (): CostBucket => ({ labor: 0, byCategory: {} });

/** Primeiro e último mês do período do projeto. */
export function projectMonthRange(project: PeriodProject): { first: Date; last: Date } {
  const first = startOfMonth(parseISO(project.start_date));
  if (project.is_continuous) return { first, last: addMonths(first, 11) };
  if (!project.end_date) return { first, last: first };
  const last = startOfMonth(parseISO(project.end_date));
  return { first, last: last < first ? first : last };
}

class MonthAccumulator {
  private months = new Map<string, ProjectCostMonth>();

  constructor(private firstKey: string, private lastKey: string) {}

  month(date: Date): ProjectCostMonth {
    const key = monthKeyOf(date);
    let month = this.months.get(key);
    if (!month) {
      month = {
        key,
        date: startOfMonth(date),
        outOfPeriod: key < this.firstKey || key > this.lastKey,
        planned: emptyBucket(),
        realized: emptyBucket(),
      };
      this.months.set(key, month);
    }
    return month;
  }

  addLabor(kind: Kind, entry: DatedCost) {
    this.month(entry.date)[kind].labor += entry.cost;
  }

  addCategory(kind: Kind, category: ProjectCostCategory, entry: DatedCost) {
    const bucket = this.month(entry.date)[kind].byCategory;
    bucket[category] = (bucket[category] ?? 0) + entry.cost;
  }

  sorted(): ProjectCostMonth[] {
    return Array.from(this.months.values()).sort((a, b) => a.key.localeCompare(b.key));
  }
}

const relativeMonth = (projectStart: Date, monthNumber: number) => addMonths(projectStart, monthNumber - 1);

/** Mês de um custo avulso: data do custo; sem ela, mês relativo legado; sem ele, o início. */
function oneOffCostDate(cost: MonthlyCost, projectStart: Date): Date {
  if (cost.cost_date) return parseISO(cost.cost_date);
  return relativeMonth(projectStart, cost.month_number || 1);
}

/** Leva ao mês inicial a diferença entre o total do custo e a soma dos meses dele. */
function withRemainder(entries: DatedCost[], total: number, startDate: Date): DatedCost[] {
  const remainder = total - entries.reduce((sum, entry) => sum + entry.cost, 0);
  return Math.abs(remainder) < CENTS ? entries : [...entries, { date: startDate, cost: remainder }];
}

/** Sem detalhe mensal: o total dividido igualmente entre o mês inicial e o final do custo. */
function evenlySplit(total: number, startDate: Date, startMonth: number, endMonth: number | null | undefined): DatedCost[] {
  const count = Math.max((endMonth || startMonth) - startMonth + 1, 1);
  return Array.from({ length: count }, (_, i) => ({ date: addMonths(startDate, i), cost: total / count }));
}

function recurringPlanned(cost: MonthlyCost, projectStart: Date): DatedCost[] {
  const total = Number(cost.planned_amount_brl || 0);
  const startMonth = cost.start_month || 1;
  const startDate = relativeMonth(projectStart, startMonth);
  const entries = (cost.months ?? [])
    .filter((m) => m.planned_value != null)
    .map((m) => ({ date: relativeMonth(projectStart, m.month_number), cost: Number(m.planned_value) }));
  return entries.length > 0
    ? withRemainder(entries, total, startDate)
    : evenlySplit(total, startDate, startMonth, cost.end_month);
}

function recurringRealized(cost: MonthlyCost, projectStart: Date): DatedCost[] {
  const entries = (cost.months ?? [])
    .filter((m) => m.actual_value != null)
    .map((m) => ({
      date: m.invoice_date ? parseISO(m.invoice_date) : relativeMonth(projectStart, m.month_number),
      cost: Number(m.actual_value),
    }));
  const startDate = relativeMonth(projectStart, cost.start_month || 1);
  return withRemainder(entries, Number(cost.actual_amount_brl || 0), startDate);
}

function addLedgerCost(acc: MonthAccumulator, cost: MonthlyCost, projectStart: Date) {
  if (cost.is_recurring) {
    recurringPlanned(cost, projectStart).forEach((entry) => acc.addCategory('planned', cost.category, entry));
    recurringRealized(cost, projectStart).forEach((entry) => acc.addCategory('realized', cost.category, entry));
    return;
  }
  const date = oneOffCostDate(cost, projectStart);
  acc.addCategory('planned', cost.category, { date, cost: Number(cost.planned_amount_brl || 0) });
  if (cost.actual_amount_brl != null) {
    acc.addCategory('realized', cost.category, { date, cost: Number(cost.actual_amount_brl) });
  }
}

export function buildProjectMonthlyCosts(input: {
  project: PeriodProject;
  laborPlanned: DatedCost[];
  laborRealized: DatedCost[];
  costs: MonthlyCost[];
}): ProjectCostMonth[] {
  const { first, last } = projectMonthRange(input.project);
  const acc = new MonthAccumulator(monthKeyOf(first), monthKeyOf(last));

  for (let date = first; date <= last; date = addMonths(date, 1)) acc.month(date);
  input.laborPlanned.forEach((entry) => acc.addLabor('planned', entry));
  input.laborRealized.forEach((entry) => acc.addLabor('realized', entry));
  input.costs.forEach((cost) => addLedgerCost(acc, cost, first));

  return acc.sorted();
}

/** Soma das categorias do ledger num mês. */
export const bucketOthers = (bucket: CostBucket): number =>
  Object.values(bucket.byCategory).reduce((sum, value) => sum + (value ?? 0), 0);

export const bucketTotal = (bucket: CostBucket): number => bucket.labor + bucketOthers(bucket);

const hasValue = (cost: Pick<ProjectCostDB, 'planned_amount_brl' | 'actual_amount_brl'>) =>
  Number(cost.planned_amount_brl || 0) > 0 || Number(cost.actual_amount_brl || 0) > 0;

/** Categorias com algum valor: Mão de Obra conta uma, e cada categoria do ledger conta uma. */
export function countActiveCostCategories(
  labor: { planned: number; actual: number },
  costs: Pick<ProjectCostDB, 'category' | 'planned_amount_brl' | 'actual_amount_brl'>[],
): number {
  const ledgerCategories = new Set(costs.filter(hasValue).map((cost) => cost.category));
  const laborCounts = labor.planned > 0 || labor.actual > 0 ? 1 : 0;
  return laborCounts + ledgerCategories.size;
}
