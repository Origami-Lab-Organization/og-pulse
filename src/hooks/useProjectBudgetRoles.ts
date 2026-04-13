import { useQuery } from '@tanstack/react-query';
import { equipeService } from '@/services/equipeService';
import { BudgetRoleWithMonths } from '@/types/equipe.types';

/**
 * Returns the budget roles from the project's linked budget,
 * annotated with `filled: true` when at least one allocation in this
 * project already references the role.
 */
export const useProjectBudgetRoles = (
  budgetId: string | null,
  projectId: string
): { budgetRoles: BudgetRoleWithMonths[]; isLoading: boolean } => {
  const rolesQuery = useQuery({
    queryKey: ['budget-roles-for-project', budgetId],
    queryFn: () => equipeService.getBudgetRolesForProject(budgetId!),
    enabled: !!budgetId,
  });

  const filledQuery = useQuery({
    queryKey: ['project-allocations-filled-roles', projectId],
    queryFn: () => equipeService.getAllocatedBudgetRoleIds(projectId),
    enabled: !!projectId,
  });

  const filledIds = new Set(filledQuery.data || []);

  const budgetRoles: BudgetRoleWithMonths[] = (rolesQuery.data || []).map((r: any) => ({
    id: r.id,
    budget_id: r.budget_id,
    role_name: r.role_name,
    seniority: r.seniority,
    hourly_rate: r.hourly_rate,
    created_at: r.created_at,
    months: r.months || [],
    filled: filledIds.has(r.id),
  }));

  return {
    budgetRoles,
    isLoading: rolesQuery.isLoading,
  };
};
