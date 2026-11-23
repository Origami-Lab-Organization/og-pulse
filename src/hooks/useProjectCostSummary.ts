import { useMemo } from 'react';
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectTimesheets } from '@/hooks/useProjectTimesheets';
import { useProjectCostItems } from '@/hooks/useProjectCostItems';
import { useProjectPlannedLaborCost } from '@/hooks/useProjectPlannedLaborCost';
import { useHolidays } from '@/hooks/useHolidays';
import {
  buildProjectCostSummary,
  sumLegacyLaborPlanned,
  sumRealizedLabor,
} from '@/lib/projectCostSummary';
import type { ProjectWithRelations } from '@/types/project';

/**
 * Custo planejado e realizado do projeto pela regra única (US-0025). Toda tela que mostra
 * custo, margem ou desvio do projeto lê daqui, para os números baterem entre as abas.
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

  const summary = useMemo(() => {
    const laborPlanned = plannedLabor.hasRoleAllocations
      ? plannedLabor.total
      : sumLegacyLaborPlanned(project, memberMonths ?? [], holidays);
    const laborActual = sumRealizedLabor(timesheets ?? [], project.members || [], holidays);
    return buildProjectCostSummary({ laborPlanned, laborActual, costs: costItems ?? [] });
  }, [project, plannedLabor.hasRoleAllocations, plannedLabor.total, memberMonths, timesheets, costItems, holidays]);

  const isLoading =
    plannedLabor.isLoading || timesheetsQuery.isLoading || costItemsQuery.isLoading || memberMonthsQuery.isLoading;

  return useMemo(() => ({ ...summary, isLoading }), [summary, isLoading]);
}
