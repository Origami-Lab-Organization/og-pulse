import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AllocationTypeKpis {
  project_planned_annual: number;
  project_actual_annual: number;
  activity_planned_annual: number;
  activity_actual_annual: number;
  project_planned_month: number;
  project_actual_month: number;
  activity_planned_month: number;
  activity_actual_month: number;
}

function normalizeId(value: string): string | null {
  return value && value !== 'all' ? value : null;
}

export function useAllocationTypeKpis({
  tenantId,
  selectedYear,
  currentMonth,
  weekCutoffDate,
  managerId,
  projectId,
  teamId,
  isAdmin,
  currentEmployeeId,
}: {
  tenantId: string | undefined;
  selectedYear: number;
  currentMonth: number;
  weekCutoffDate: string;
  managerId: string;
  projectId: string;
  teamId: string;
  isAdmin: boolean;
  currentEmployeeId: string | undefined;
}) {
  const effectiveManagerId = !isAdmin ? (currentEmployeeId ?? null) : normalizeId(managerId);

  return useQuery({
    queryKey: [
      'allocation-type-kpis',
      tenantId, selectedYear, currentMonth, weekCutoffDate,
      effectiveManagerId, normalizeId(projectId), normalizeId(teamId),
    ],
    queryFn: async (): Promise<AllocationTypeKpis | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase.rpc('get_allocation_type_kpis', {
        p_tenant_id:        tenantId,
        p_year:             selectedYear,
        p_current_month:    currentMonth,
        p_week_cutoff_date: weekCutoffDate,
        p_manager_id:       effectiveManagerId,
        p_project_id:       normalizeId(projectId),
        p_team_key:         normalizeId(teamId),
      });

      if (error) throw error;
      if (!data || (data as any[]).length === 0) return null;
      const row = (data as any[])[0];
      return {
        project_planned_annual:  Number(row.project_planned_annual)  || 0,
        project_actual_annual:   Number(row.project_actual_annual)   || 0,
        activity_planned_annual: Number(row.activity_planned_annual) || 0,
        activity_actual_annual:  Number(row.activity_actual_annual)  || 0,
        project_planned_month:   Number(row.project_planned_month)   || 0,
        project_actual_month:    Number(row.project_actual_month)    || 0,
        activity_planned_month:  Number(row.activity_planned_month)  || 0,
        activity_actual_month:   Number(row.activity_actual_month)   || 0,
      };
    },
    enabled: !!tenantId,
  });
}
