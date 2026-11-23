import {
  calculatePlannedLaborCost,
  calculatePlannedLaborCostByEmployeeMonth,
  type EmployeeFallbackCost,
} from '@/lib/roleAllocationCosts';
import {
  buildProjectCostSummary,
  legacyLaborPlannedEntries,
  realizedLaborEntries,
} from '@/lib/projectCostSummary';
import { buildProjectMonthlyCosts } from '@/lib/projectMonthlyCosts';
import type { Holiday } from '@/types/holiday';
import type { ProjectAllocation } from '@/types/equipe.types';
import type { ProjectWithRelations } from '@/types/project';
import type { DatedCost, ProjectCostInputs, ProjectCostMonth, ProjectCostSummary } from '@/types/projectCostSummary';

/**
 * Custo do projeto — totais e meses — a partir dos dados já carregados (US-0025/US-0026).
 * É a mesma conta de `useProjectCostSummary`, sem hook: o portfólio a usa para calcular vários
 * projetos de uma vez (US-0034), e as abas do projeto e o portfólio dão o mesmo número.
 */

type Member = NonNullable<ProjectWithRelations['members']>[number];

function fallbackByEmployee(members: Member[]): Record<string, EmployeeFallbackCost> {
  const result: Record<string, EmployeeFallbackCost> = {};
  members.forEach((member) => {
    result[member.employee_id] = {
      jornadaDiaria: member.employee?.jornada_diaria || 8,
      monthlyCostEstimated: member.employee?.total_monthly_cost_estimated || 0,
    };
  });
  return result;
}

/** Mão de obra planejada pelas alocações por papel: total e mês a mês de calendário. */
export function plannedLaborFromAllocations(allocations: ProjectAllocation[], members: Member[], holidays: Holiday[]) {
  const fallback = fallbackByEmployee(members);
  const entries: DatedCost[] = Array.from(calculatePlannedLaborCostByEmployeeMonth(allocations, fallback, holidays).values())
    .map((entry) => ({ date: new Date(entry.year, entry.month - 1, 1), cost: entry.cost }));
  return {
    hasRoleAllocations: allocations.length > 0,
    total: allocations.length > 0 ? calculatePlannedLaborCost(allocations, fallback, holidays).laborCost : 0,
    entries,
  };
}

const sumCosts = (entries: DatedCost[]) => entries.reduce((sum, entry) => sum + entry.cost, 0);

/** Totais e meses do custo do projeto. */
export function computeProjectCosts(input: ProjectCostInputs): ProjectCostSummary & { months: ProjectCostMonth[] } {
  const { project, allocations, memberMonths, timesheets, costs, holidays } = input;
  const members = project.members || [];
  const planned = plannedLaborFromAllocations(allocations, members, holidays);
  const laborPlannedEntries = planned.hasRoleAllocations
    ? planned.entries
    : legacyLaborPlannedEntries(project, memberMonths, holidays);
  const laborRealizedEntries = realizedLaborEntries(timesheets, members, holidays);

  const summary = buildProjectCostSummary({
    laborPlanned: planned.hasRoleAllocations ? planned.total : sumCosts(laborPlannedEntries),
    laborActual: sumCosts(laborRealizedEntries),
    costs,
  });
  const months = buildProjectMonthlyCosts({
    project,
    laborPlanned: laborPlannedEntries,
    laborRealized: laborRealizedEntries,
    costs,
  });
  return { ...summary, months };
}
