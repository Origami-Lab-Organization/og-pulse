import { useQuery } from '@tanstack/react-query';
import { budgetVersionService, BudgetVersionWithCreator } from '@/services/budgetVersionService';

export function useBudgetVersions(budgetId: string | null) {
  return useQuery<BudgetVersionWithCreator[], Error>({
    queryKey: ['budget-versions', budgetId],
    queryFn: () => budgetVersionService.getByBudgetId(budgetId!),
    enabled: !!budgetId,
  });
}

export function useBudgetVersion(versionId: string | null) {
  return useQuery<BudgetVersionWithCreator | null, Error>({
    queryKey: ['budget-version', versionId],
    queryFn: () => budgetVersionService.getById(versionId!),
    enabled: !!versionId,
  });
}
