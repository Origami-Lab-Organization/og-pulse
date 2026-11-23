import { useMemo } from 'react';
import { useBudget } from '@/hooks/useBudgets';
import { useProjectCostSummary } from '@/hooks/useProjectCostSummary';
import type { ProjectWithRelations } from '@/types/project';

/**
 * Fonte ÚNICA da margem planejada do projeto exibida na Visão Geral e usada pela simulação
 * de alocação: (receita − comissão do orçamento − custo planejado) ÷ receita, sem impostos.
 * O custo vem da regra única do custo do projeto (`useProjectCostSummary`, US-0025):
 * mão de obra + todas as categorias do ledger de custos.
 */
export function useProjectPlannedMargin(project: ProjectWithRelations) {
  const { data: budget } = useBudget(project.budget_id);
  const costSummary = useProjectCostSummary(project);

  return useMemo(() => {
    const revenue = Number(project.total_value || 0);
    const commissionPlanned = budget ? (budget.commission_percent / 100) * budget.total_with_fees : 0;
    const costPlanned = costSummary.totalPlanned;
    const marginPlanned = revenue > 0 ? ((revenue - commissionPlanned - costPlanned) / revenue) * 100 : 0;

    return { revenue, commissionPlanned, costPlanned, marginPlanned, costSummary };
  }, [project.total_value, budget, costSummary]);
}
