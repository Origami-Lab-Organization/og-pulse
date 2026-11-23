import { useMemo } from 'react';
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectTimesheets } from '@/hooks/useProjectTimesheets';
import { useProjectCostItems } from '@/hooks/useProjectCostItems';
import { useProjectAllocations } from '@/hooks/useProjectRoles';
import { useHolidays } from '@/hooks/useHolidays';
import { computeProjectCosts } from '@/lib/projectCostMonths';
import type { ProjectWithRelations } from '@/types/project';

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
  const allocationsQuery = useProjectAllocations(project.id, true);

  const memberMonths = memberMonthsQuery.data;
  const timesheets = timesheetsQuery.data;
  const costItems = costItemsQuery.data;
  const allocations = allocationsQuery.data;

  // A conta é `computeProjectCosts`, a mesma que o portfólio usa para vários projetos (US-0034).
  const result = useMemo(
    () =>
      computeProjectCosts({
        project,
        allocations: allocations ?? [],
        memberMonths: memberMonths ?? [],
        timesheets: timesheets ?? [],
        costs: costItems ?? [],
        holidays,
      }),
    [project, allocations, memberMonths, timesheets, costItems, holidays],
  );

  const isLoading =
    allocationsQuery.isLoading || timesheetsQuery.isLoading || costItemsQuery.isLoading || memberMonthsQuery.isLoading;

  return useMemo(() => ({ ...result, isLoading }), [result, isLoading]);
}
