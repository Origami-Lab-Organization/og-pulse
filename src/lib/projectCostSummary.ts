import { addMonths, parseISO, startOfMonth } from 'date-fns';
import { getFallbackHourlyCost } from '@/lib/employeeCost';
import type { Holiday } from '@/types/holiday';
import type { ProjectCostDB, ProjectMemberMonthDB, ProjectWithRelations } from '@/types/project';
import type { ProjectCostSummary } from '@/types/projectCostSummary';

/**
 * Regra ÚNICA do custo do projeto (US-0025): planejado e realizado de mão de obra mais
 * TODAS as categorias do ledger `project_costs` (fornecedor, assinatura, aluguel de
 * equipamento, material, viagem, outros). Visão Geral, aba Despesas, aba Financeiro e
 * simulador de alocação leem daqui — nenhuma tela recalcula custo por conta própria.
 */

type ProjectMember = NonNullable<ProjectWithRelations['members']>[number];

type LedgerCost = Pick<ProjectCostDB, 'planned_amount_brl' | 'actual_amount_brl'>;

interface RealizedTimesheet {
  project_member_id: string;
  work_date: string;
  hours: number;
  cost_per_hour: number | null;
}

/** Custo/hora de fallback do membro no mês, quando a hora não traz snapshot de custo. */
export function memberFallbackHourlyCost(
  member: ProjectMember,
  year: number,
  monthIndex: number,
  holidays: Holiday[],
): number {
  if (!member.employee) return Number(member.hourly_rate) || 0;
  return getFallbackHourlyCost(
    member.employee.total_monthly_cost_estimated || 0,
    member.employee.jornada_diaria || 8,
    year,
    monthIndex,
    holidays,
  );
}

/** Soma do ledger: planejado e realizado em BRL. Custo sem realizado conta zero no realizado. */
export function sumLedgerCosts(costs: LedgerCost[]): { planned: number; actual: number } {
  return costs.reduce(
    (acc, cost) => ({
      planned: acc.planned + Number(cost.planned_amount_brl || 0),
      actual: acc.actual + Number(cost.actual_amount_brl || 0),
    }),
    { planned: 0, actual: 0 },
  );
}

function timesheetHourlyCost(
  timesheet: RealizedTimesheet,
  memberMap: Map<string, ProjectMember>,
  holidays: Holiday[],
): number {
  if (timesheet.cost_per_hour != null) return Number(timesheet.cost_per_hour);
  const member = memberMap.get(timesheet.project_member_id);
  if (!member) return 0;
  const date = parseISO(timesheet.work_date);
  return memberFallbackHourlyCost(member, date.getFullYear(), date.getMonth(), holidays);
}

/**
 * Mão de obra realizada: horas × custo/hora gravado na própria hora lançada; sem snapshot,
 * o custo/hora estimado do membro no mês da hora.
 */
export function sumRealizedLabor(
  timesheets: RealizedTimesheet[],
  members: ProjectMember[],
  holidays: Holiday[],
): number {
  const memberMap = new Map(members.map((member) => [member.id, member]));
  return timesheets.reduce(
    (sum, timesheet) => sum + timesheetHourlyCost(timesheet, memberMap, holidays) * Number(timesheet.hours),
    0,
  );
}

function legacyMemberLaborPlanned(
  member: ProjectMember,
  entries: ProjectMemberMonthDB[],
  project: Pick<ProjectWithRelations, 'start_date' | 'duration_months'>,
  holidays: Holiday[],
): number {
  const projectStart = startOfMonth(parseISO(project.start_date));
  if (entries.length === 0) {
    const fallback = memberFallbackHourlyCost(member, projectStart.getFullYear(), projectStart.getMonth(), holidays);
    return fallback * Number(member.hours_per_month || 0) * project.duration_months;
  }
  return entries.reduce((sum, entry) => {
    if (entry.cost_per_hour != null) return sum + Number(entry.cost_per_hour) * Number(entry.hours);
    const monthDate = addMonths(projectStart, entry.month_number - 1);
    const fallback = memberFallbackHourlyCost(member, monthDate.getFullYear(), monthDate.getMonth(), holidays);
    return sum + fallback * Number(entry.hours);
  }, 0);
}

/** Mão de obra planejada no modelo legado por membro/mês (projetos sem alocação por papel). */
export function sumLegacyLaborPlanned(
  project: Pick<ProjectWithRelations, 'start_date' | 'duration_months' | 'members'>,
  memberMonths: ProjectMemberMonthDB[],
  holidays: Holiday[],
): number {
  return (project.members || []).reduce((acc, member) => {
    const entries = memberMonths.filter((entry) => entry.project_member_id === member.id);
    return acc + legacyMemberLaborPlanned(member, entries, project, holidays);
  }, 0);
}

export function buildProjectCostSummary(input: {
  laborPlanned: number;
  laborActual: number;
  costs: LedgerCost[];
}): ProjectCostSummary {
  const ledger = sumLedgerCosts(input.costs);
  return {
    laborPlanned: input.laborPlanned,
    laborActual: input.laborActual,
    otherPlanned: ledger.planned,
    otherActual: ledger.actual,
    totalPlanned: input.laborPlanned + ledger.planned,
    totalActual: input.laborActual + ledger.actual,
  };
}
