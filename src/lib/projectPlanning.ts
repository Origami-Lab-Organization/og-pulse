import { format, parseISO } from 'date-fns';
import { PLANNING_APPROVAL_STATUS } from '@/lib/projectPlanning.constants';
import type { BudgetWithDetails } from '@/types/budget';
import type { PortfolioAlert } from '@/types/portfolio';
import type {
  PlanningApproval,
  PlanningBreakdown,
  PlanningChecklist,
  PlanningComparison,
  PlanningCounts,
  PlanningCta,
  PlanningCtaInput,
  PlanningPeriod as Period,
  PlanningReadiness,
  PlanningSources,
  PlanningItem,
  PlanningResult,
} from '@/types/projectPlanning';

/**
 * Regra única do planejamento guiado por checklist (US-0039): o que conta como pronto, o
 * resultado planejado contra o orçado e o que o fim do checklist oferece. A página do projeto
 * e o card do portfólio usam as mesmas funções, para nunca darem números diferentes.
 */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);
const formatHours = (hours: number) => `${Math.round(hours).toLocaleString('pt-BR')} h`;
const toBR = (iso: string) => format(parseISO(iso), 'dd/MM/yyyy');
const CANCELLED_COST = 'cancelled';

// ─── Período ────────────────────────────────────────────────────────────────────────────


/** Data `yyyy-MM-dd` dentro do período do projeto. */
export function isInPeriod(date: string, period: Period): boolean {
  if (date < period.start) return false;
  return !period.end || date <= period.end;
}

function periodLabel(period: Period): string {
  return period.end ? `${toBR(period.start)} a ${toBR(period.end)}` : `a partir de ${toBR(period.start)}`;
}

/** Início e fim do item dentro do período; senão, a mensagem que diz o período (cenário 5). */
export function periodViolation(start: string, end: string, period: Period): string | null {
  if (isInPeriod(start, period) && isInPeriod(end, period)) return null;
  return `As datas precisam estar dentro do período do projeto (${periodLabel(period)}).`;
}

/** Mês `yyyy-MM` dentro do período do projeto. */
function monthInPeriod(year: number, month: number, period: Period): boolean {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  if (key < period.start.slice(0, 7)) return false;
  return !period.end || key <= period.end.slice(0, 7);
}

/** Quantos meses de calendário o período cobre (início e fim inclusive). */
export function periodMonths(period: Period): number | null {
  if (!period.end) return null;
  const start = parseISO(period.start);
  const end = parseISO(period.end);
  return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1;
}

// ─── Contagens a partir dos dados salvos ──────────────────────────────────────────────

/** Data de referência do marco: a do fim (marco pontual tem início = fim). */
const milestoneDate = (milestone: PlanningSources['milestones'][number]) =>
  milestone.end_date || milestone.start_date;


function hoursPerPerson(allocations: PlanningSources['allocations'], period: Period): number[] {
  const byPerson = new Map<string, number>();
  allocations.forEach((allocation) => {
    const hours = allocation.monthlyHours
      .filter((month) => monthInPeriod(month.year, month.month, period))
      .reduce((acc, month) => acc + Number(month.plannedHours || 0), 0);
    byPerson.set(allocation.employeeId, (byPerson.get(allocation.employeeId) ?? 0) + hours);
  });
  return Array.from(byPerson.values());
}

/** Junta o que foi carregado das abas nas contagens que o checklist lê. */
export function planningCountsFrom(sources: PlanningSources): PlanningCounts {
  return {
    keyResultsPerObjective: sources.keyResultsPerObjective,
    milestoneDatesInPeriod: sources.milestones
      .map(milestoneDate)
      .filter((date) => isInPeriod(date, sources.period)),
    hoursPerPersonInPeriod: hoursPerPerson(sources.allocations, sources.period),
    stakeholderCount: sources.stakeholderCount,
    costValues: sources.costs
      .filter((cost) => cost.status !== CANCELLED_COST)
      .map((cost) => Number(cost.planned_amount_brl || 0)),
    hasClient: sources.hasClient,
    clientName: sources.clientName,
  };
}

// ─── Itens do checklist (cenário 3) ───────────────────────────────────────────────────

function okrItem(counts: PlanningCounts): PlanningItem {
  const objectives = counts.keyResultsPerObjective.length;
  const keyResults = sum(counts.keyResultsPerObjective);
  const withoutKr = counts.keyResultsPerObjective.filter((n) => n === 0).length;
  let summary = 'Pelo menos 1 objetivo com 1 resultado-chave';
  if (objectives > 0 && keyResults === 0) summary = `${plural(objectives, 'objetivo', 'objetivos')} sem resultado-chave`;
  if (keyResults > 0) {
    summary = `${plural(objectives, 'objetivo', 'objetivos')} · ${plural(keyResults, 'resultado-chave', 'resultados-chave')}`;
    if (withoutKr) summary += ` · ${withoutKr} sem resultado-chave`;
  }
  return { key: 'okrs', label: 'Objetivos', required: true, done: keyResults > 0, summary };
}

function roadmapItem(counts: PlanningCounts): PlanningItem {
  const dates = [...counts.milestoneDatesInPeriod].sort();
  const done = dates.length > 0;
  return {
    key: 'roadmap',
    label: 'Roadmap',
    required: true,
    done,
    summary: done
      ? `${plural(dates.length, 'marco', 'marcos')} · último em ${toBR(dates[dates.length - 1])}`
      : 'Pelo menos 1 marco dentro do período',
  };
}

function teamItem(counts: PlanningCounts): PlanningItem {
  const people = counts.hoursPerPersonInPeriod.filter((hours) => hours > 0);
  const done = people.length > 0;
  return {
    key: 'team',
    label: 'Equipe',
    required: true,
    done,
    summary: done
      ? `${plural(people.length, 'pessoa', 'pessoas')} · ${formatHours(sum(people))} no período`
      : 'Pelo menos 1 pessoa com horas',
  };
}

function stakeholderItem(counts: PlanningCounts): PlanningItem {
  const done = counts.stakeholderCount > 0;
  const people = plural(counts.stakeholderCount, 'pessoa', 'pessoas');
  let summary = counts.hasClient ? 'Pelo menos 1 pessoa do cliente' : 'Projeto sem cliente: informe se houver';
  if (done) summary = counts.hasClient && counts.clientName ? `${people} da ${counts.clientName}` : people;
  // Projeto sem cliente (ADR-0049): Stakeholders vira opcional (cenário 18).
  return { key: 'stakeholders', label: 'Stakeholders', required: counts.hasClient, done, summary };
}

function costItem(counts: PlanningCounts, money: (value: number) => string): PlanningItem {
  const done = counts.costValues.length > 0;
  return {
    key: 'costs',
    label: 'Custos',
    required: false,
    done,
    summary: done
      ? `${plural(counts.costValues.length, 'custo', 'custos')} · ${money(sum(counts.costValues))}`
      : 'Fornecedores, licenças, viagens…',
  };
}

/** O checklist do planejamento: obrigatórios primeiro, opcionais depois. */
export function planningChecklist(counts: PlanningCounts, money: (value: number) => string): PlanningChecklist {
  const items = [okrItem(counts), roadmapItem(counts), teamItem(counts), stakeholderItem(counts), costItem(counts, money)];
  const required = items.filter((item) => item.required);
  const requiredDone = required.filter((item) => item.done).length;
  return {
    items,
    requiredDone,
    requiredTotal: required.length,
    allRequiredDone: requiredDone === required.length,
  };
}

/** Total de horas da equipe no período (resumo da aba Equipe, cenário 6). */
export const teamHoursInPeriod = (counts: PlanningCounts) => sum(counts.hoursPerPersonInPeriod);
export const teamPeopleInPeriod = (counts: PlanningCounts) =>
  counts.hoursPerPersonInPeriod.filter((hours) => hours > 0).length;

// ─── Orçado × planejado (cenário 9) ───────────────────────────────────────────────────

const MONTHLY_BILLING = 'recurring';

/** Orçamento cobrado por mês guarda as horas de um mês só; o total é esse mês × duração. */
function budgetLabor(budget: BudgetWithDetails): number {
  const monthly = budget.is_recurring || budget.billing_type === MONTHLY_BILLING;
  return budget.roles.reduce((acc, role) => {
    const hours = monthly
      ? Number(role.months[0]?.hours ?? 0) * budget.duration_months
      : sum(role.months.map((month) => Number(month.hours || 0)));
    return acc + hours * Number(role.hourly_rate || 0);
  }, 0);
}

function budgetCosts(budget: BudgetWithDetails): number {
  const suppliers = sum(budget.suppliers.map((s) => Number(s.monthly_value || 0) * budget.duration_months));
  const materials = sum(budget.materials.map((m) => Number(m.value || 0)));
  return suppliers + materials;
}

/** Comissão do orçamento: a mesma conta da margem planejada (`useProjectPlannedMargin`). */
export function budgetCommission(budget: Pick<BudgetWithDetails, 'commission_percent' | 'total_with_fees'>): number {
  return (Number(budget.commission_percent || 0) / 100) * Number(budget.total_with_fees || 0);
}

/** Equipe, custos e comissão do orçamento vendido, sobre o valor do contrato do projeto. */
export function budgetedBreakdown(budget: BudgetWithDetails, contract: number): PlanningBreakdown {
  return { contract, commission: budgetCommission(budget), labor: budgetLabor(budget), costs: budgetCosts(budget) };
}

/** resultado = contrato − comissão − equipe − custos; margem = resultado ÷ contrato. */
export function withResult(breakdown: PlanningBreakdown): PlanningBreakdown & PlanningResult {
  const result = breakdown.contract - breakdown.commission - breakdown.labor - breakdown.costs;
  return { ...breakdown, result, margin: breakdown.contract > 0 ? (result / breakdown.contract) * 100 : 0 };
}

const toCents = (value: number) => Math.round(value * 100);

export function comparePlanning(planned: PlanningBreakdown, budgeted: PlanningBreakdown | null): PlanningComparison {
  const plannedResult = withResult(planned);
  const budgetedResult = budgeted ? withResult(budgeted) : null;
  const gap = budgetedResult ? toCents(budgetedResult.result) - toCents(plannedResult.result) : 0;
  return { planned: plannedResult, budgeted: budgetedResult, shortfall: Math.max(0, gap) / 100 };
}

// ─── Aprovação e o fim do checklist (cenários 10 a 15) ────────────────────────────────

const isOpen = (approval: PlanningApproval | null) =>
  approval?.status === PLANNING_APPROVAL_STATUS.REQUESTED;

/** O resultado planejado mudou desde o pedido: o pedido cai (cenário 13). */
export function approvalIsStale(approval: PlanningApproval | null, plannedResult: number): boolean {
  if (!isOpen(approval)) return false;
  return toCents(Number(approval!.planned_result)) !== toCents(plannedResult);
}

/** Último pedido devolvido pelo admin, para mostrar o motivo ao GP (cenário 14). */
export function returnedReason(approval: PlanningApproval | null): string | null {
  return approval?.status === PLANNING_APPROVAL_STATUS.RETURNED ? approval.return_reason : null;
}


function belowBudgetCta(input: PlanningCtaInput): PlanningCta {
  if (!isOpen(input.approval)) return input.canApprove ? 'admin_concludes' : 'request_approval';
  return input.canApprove ? 'admin_decides' : 'awaiting_admin';
}

/** O que o fim do checklist oferece a quem está olhando. */
export function planningCta(input: PlanningCtaInput): PlanningCta {
  if (!input.canEdit) return 'read_only';
  if (!input.allRequiredDone) return 'blocked';
  if (input.shortfall <= 0) return 'conclude';
  return belowBudgetCta(input);
}

// ─── Topo da página (cenário 1) ────────────────────────────────────────────────────────

/** "Em planejamento há N dias · começa em dd/mm/aaaa". Conta desde a criação do projeto. */
export function planningSinceText(createdAt: string, startDate: string, today: Date): string {
  const days = Math.max(0, Math.floor((today.getTime() - parseISO(createdAt).getTime()) / 86_400_000));
  const since = days === 0 ? 'Em planejamento desde hoje' : `Em planejamento há ${plural(days, 'dia', 'dias')}`;
  return `${since} · começa em ${toBR(startDate)}`;
}

// ─── Card do portfólio (cenários 12 e 17) ─────────────────────────────────────────────

/** "N de M obrigatórios" no card da coluna Planejamento. */
export const readinessText = (readiness: PlanningReadiness) =>
  `${readiness.requiredDone} de ${readiness.requiredTotal} obrigatórios`;

/** Pendência do card enquanto o pedido de aprovação está aberto (US-0037). */
export function planningAlerts(readiness: PlanningReadiness | undefined): PortfolioAlert[] {
  if (!readiness?.awaitingApproval) return [];
  return [{ level: 'attention', text: 'Planejamento abaixo do orçado aguardando aprovação do admin' }];
}
