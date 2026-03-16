import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BudgetVersionWithCreator {
  id: string;
  budget_id: string;
  version_number: number;
  created_at: string;
  change_summary: string | null;
  change_reason: string | null;
  snapshot_data: Record<string, unknown>;
  creator: { nome: string } | null;
}

async function fetchBudgetVersions(budgetId: string): Promise<BudgetVersionWithCreator[]> {
  const { data, error } = await supabase
    .from('budget_versions')
    .select('id, budget_id, version_number, created_at, change_summary, change_reason, snapshot_data, creator:employees!budget_versions_created_by_fkey(nome)')
    .eq('budget_id', budgetId)
    .order('version_number', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as BudgetVersionWithCreator[];
}

export function useBudgetVersions(budgetId: string | null | undefined) {
  return useQuery({
    queryKey: ['budget-versions', budgetId],
    queryFn: () => fetchBudgetVersions(budgetId!),
    enabled: !!budgetId,
    staleTime: 30_000,
  });
}
