import { useMemo } from 'react';
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectTimesheets } from '@/hooks/useProjectTimesheets';
import { useProjectCostItems } from '@/hooks/useProjectCostItems';
import { useProjectPlannedLaborCost } from '@/hooks/useProjectPlannedLaborCost';
import { useHolidays } from '@/hooks/useHolidays';
import {
  buildProjectCostSummary,
  legacyLaborPlannedEntries,
  realizedLaborEntries,
} from '@/lib/projectCostSummary';
import { buildProjectMonthlyCosts } from '@/lib/projectMonthlyCosts';
import type { ProjectWithRelations } from '@/types/project';
import type { DatedCost } from '@/types/projectCostSummary';

const sumCosts = (entries: DatedCost[]) => entries.reduce((sum, entry) => sum + entry.cost, 0);

/**
 * Custo planejado e realizado do projeto pela regra única (US-0025), também mês a mês de
 * calendário (US-0026). Toda tela que mostra custo, margem ou desvio do projeto lê daqui,
 * para os números baterem entre as abas — e a soma dos meses bate com os totais.
 *
 * - Mão de obra planejada: alocações por papel (ADR-0006); sem elas, o modelo legado por
 *   membro/mês.
 * - Mão de obra realizada: horas lançadas no projeto (por `project_id`, não pela equipe
 *   atual), ao custo/hora gravado na hora.
 * - Demais custos: todas as categorias do ledger `project_costs`, em BRL (ADR-0004).
 */
export function useProjectCostSummary(project: ProjectWithRelations) {
  const memberIds = useMemo(() => (project.members || []).map((member) => member.id), [project.members]);

  const memberMonthsQuery = useProjectMemberMonths(memberIds);
  const timesheetsQuery = useProjectTimesheets(project.id);
  const costItemsQuery = useProjectCostItems(project.id);
  const { data: holidays = [] } = useHolidays();
  const plannedLabor = useProjectPlannedLaborCost(project, project.duration_months);

  const memberMonths = memberMonthsQuery.data;
  const timesheets = timesheetsQuery.data;
  const costItems = costItemsQuery.data;

  const result = useMemo(() => {
    const laborPlannedEntries = plannedLabor.hasRoleAllocations
      ? plannedLabor.byCalendarMonth
      : legacyLaborPlannedEntries(project, memberMonths ?? [], holidays);
    const laborRealizedEntries = realizedLaborEntries(timesheets ?? [], project.members || [], holidays);
    const costs = costItems ?? [];

    const summary = buildProjectCostSummary({
      laborPlanned: plannedLabor.hasRoleAllocations ? plannedLabor.total : sumCosts(laborPlannedEntries),
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
  }, [
    project,
    plannedLabor.hasRoleAllocations,
    plannedLabor.total,
    plannedLabor.byCalendarMonth,
    memberMonths,
    timesheets,
    costItems,
    holidays,
  ]);

  const isLoading =
    plannedLabor.isLoading || timesheetsQuery.isLoading || costItemsQuery.isLoading || memberMonthsQuery.isLoading;

  return useMemo(() => ({ ...result, isLoading }), [result, isLoading]);
}
