import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import { useBudget } from '@/hooks/useBudgets';
import { useProjectCostItems } from '@/hooks/useProjectCostItems';
import { useProjectCostSummary } from '@/hooks/useProjectCostSummary';
import { useProjectMilestones } from '@/hooks/useProjectMilestones';
import { useProjectOKRs } from '@/hooks/useProjectOKRs';
import { useProjectAllocations } from '@/hooks/useProjectRoles';
import { useProjectStakeholders } from '@/hooks/useProjectStakeholders';
import {
  budgetCommission,
  budgetedBreakdown,
  comparePlanning,
  planningChecklist,
  planningCountsFrom,
} from '@/lib/projectPlanning';
import {
  fetchLatestPlanningApproval,
  fetchWonOn,
} from '@/services/projectPlanningService';
import { fetchPlanningReadiness } from '@/services/planningReadinessService';
import type { ProjectWithRelations } from '@/types/project';
import type { PlanningReadinessProject } from '@/types/projectPlanning';

export const planningApprovalKey = (projectId: string) => ['planning-approval', projectId] as const;

const clientNameOf = (project: ProjectWithRelations) =>
  project.client?.trading_name || project.client?.company_name || '';

/**
 * Tudo o que a tela de planejamento lê (US-0039): o checklist derivado das abas, o resultado
 * planejado contra o orçado e o último pedido de aprovação. As contas estão em
 * `src/lib/projectPlanning.ts`, as mesmas do card do portfólio.
 */
export function useProjectPlanning(project: ProjectWithRelations) {
  const money = useMaskedCurrency();
  const { can } = useAuth();
  const { data: okrs = [] } = useProjectOKRs(project.id);
  const { data: milestones = [] } = useProjectMilestones(project.id);
  const { data: allocations = [] } = useProjectAllocations(project.id, false);
  const { data: stakeholders = [] } = useProjectStakeholders(project.id);
  const { data: costs = [] } = useProjectCostItems(project.id);
  const budgetQuery = useBudget(project.budget_id);
  const budget = budgetQuery.data;
  const costSummary = useProjectCostSummary(project);
  const approvalQuery = useQuery({
    queryKey: planningApprovalKey(project.id),
    queryFn: () => fetchLatestPlanningApproval(project.id),
    // O pedido carrega resultado e margem: só quem lê o financeiro (mesma regra da RLS).
    enabled: can('financeiro:ler'),
  });

  const counts = useMemo(
    () =>
      planningCountsFrom({
        period: { start: project.start_date, end: project.is_continuous ? null : project.end_date },
        keyResultsPerObjective: okrs.map((okr) => okr.key_results?.length ?? 0),
        milestones,
        allocations,
        stakeholderCount: stakeholders.length,
        costs,
        hasClient: Boolean(project.client_id),
        clientName: clientNameOf(project),
      }),
    [project, okrs, milestones, allocations, stakeholders.length, costs],
  );

  const checklist = useMemo(() => planningChecklist(counts, money), [counts, money]);

  const comparison = useMemo(() => {
    const contract = Number(project.total_value || 0);
    const commission = budget ? budgetCommission(budget) : 0;
    const planned = { contract, commission, labor: costSummary.laborPlanned, costs: costSummary.otherPlanned };
    return comparePlanning(planned, budget ? budgetedBreakdown(budget, contract) : null);
  }, [project.total_value, budget, costSummary.laborPlanned, costSummary.otherPlanned]);

  return {
    counts,
    checklist,
    comparison,
    budget: budget ?? null,
    approval: approvalQuery.data ?? null,
    // Enquanto o orçamento carrega, a comissão sai zerada: quem compara o resultado espera.
    isLoading: costSummary.isLoading || approvalQuery.isLoading || budgetQuery.isLoading,
  };
}

/** Dia em que a Oportunidade de origem foi ganha, para "Dados do projeto". */
export function useProjectWonOn(prospectId: string | null) {
  return useQuery({
    queryKey: ['prospect-won-on', prospectId],
    queryFn: () => fetchWonOn(prospectId!),
    enabled: Boolean(prospectId),
    staleTime: 10 * 60 * 1000,
  });
}

/** "N de M obrigatórios" e pedido aberto dos projetos em planejamento do portfólio (cenário 17). */
export function usePlanningReadiness(projects: PlanningReadinessProject[]) {
  const ids = projects.map((project) => project.id).sort();
  return useQuery({
    queryKey: ['planning-readiness', ids],
    queryFn: () => fetchPlanningReadiness(projects),
    enabled: ids.length > 0,
    staleTime: 60 * 1000,
  });
}
