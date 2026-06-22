import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AllocationTypeKpis {
  project_planned_annual:  number;
  project_actual_annual:   number;
  activity_planned_annual: number;
  activity_actual_annual:  number;
  project_planned_ytd:     number;
  project_actual_ytd:      number;
  activity_planned_ytd:    number;
  activity_actual_ytd:     number;
  project_planned_month:   number;
  project_actual_month:    number;
  activity_planned_month:  number;
  activity_actual_month:   number;
}

type AllocationTypeKpisRpcRow = Record<keyof AllocationTypeKpis, number | string | null>;

function normalizeId(value: string): string | null {
  return value && value !== 'all' ? value : null;
}

export function useAllocationTypeKpis({
  tenantId,
  selectedYear,
  currentMonth,
  weekCutoffDate,
  ytdCutoffDate,
  managerId,
  projectId,
  teamId,
}: {
  tenantId: string | undefined;
  selectedYear: number;
  currentMonth: number;
  weekCutoffDate: string;
  ytdCutoffDate: string;
  managerId: string;
  projectId: string;
  teamId: string;
}) {
  const effectiveManagerId = normalizeId(managerId);

  return useQuery({
    queryKey: [
      'allocation-type-kpis',
      tenantId, selectedYear, currentMonth, weekCutoffDate, ytdCutoffDate,
      effectiveManagerId, normalizeId(projectId), normalizeId(teamId),
    ],
    queryFn: async (): Promise<AllocationTypeKpis | null> => {
      if (!tenantId) return null;

      const { data, error } = await supabase.rpc('get_allocation_type_kpis', {
        p_tenant_id:        tenantId,
        p_year:             selectedYear,
        p_current_month:    currentMonth,
        p_week_cutoff_date: weekCutoffDate,
        p_ytd_cutoff_date:  ytdCutoffDate,
        p_manager_id:       effectiveManagerId,
        p_project_id:       normalizeId(projectId),
        p_team_key:         normalizeId(teamId),
      });

      if (error) throw error;
      const rows = (data ?? []) as AllocationTypeKpisRpcRow[];
      if (rows.length === 0) return null;
      const row = rows[0];
      return {
        project_planned_annual:  Number(row.project_planned_annual)  || 0,
        project_actual_annual:   Number(row.project_actual_annual)   || 0,
        activity_planned_annual: Number(row.activity_planned_annual) || 0,
        activity_actual_annual:  Number(row.activity_actual_annual)  || 0,
        project_planned_ytd:     Number(row.project_planned_ytd)     || 0,
        project_actual_ytd:      Number(row.project_actual_ytd)      || 0,
        activity_planned_ytd:    Number(row.activity_planned_ytd)    || 0,
        activity_actual_ytd:     Number(row.activity_actual_ytd)     || 0,
        project_planned_month:   Number(row.project_planned_month)   || 0,
        project_actual_month:    Number(row.project_actual_month)    || 0,
        activity_planned_month:  Number(row.activity_planned_month)  || 0,
        activity_actual_month:   Number(row.activity_actual_month)   || 0,
      };
    },
    enabled: !!tenantId,
  });
}
