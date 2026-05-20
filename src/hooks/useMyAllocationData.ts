import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseISO, endOfMonth, min, format } from 'date-fns';
import { AllocationDetailRpcRow } from './useAllocationPlannerData';

export interface ProjectAllocation {
  projectId: string;
  projectName: string;
  clientName: string;
  plannedHours: number;
  actualHours: number;
}

export interface MyAllocationData {
  projects: ProjectAllocation[];
  totalPlannedHours: number;
  totalActualHours: number;
  totalActivityHours: number;
  monthlyCapacity: number;
  expectedHours: number;
}

function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export const useMyAllocationData = (employeeId: string | undefined, monthKey: string) => {
  return useQuery({
    queryKey: ['my-allocation-data', employeeId, monthKey],
    queryFn: async (): Promise<MyAllocationData> => {
      if (!employeeId || !monthKey) {
        return { projects: [], totalPlannedHours: 0, totalActualHours: 0, totalActivityHours: 0, monthlyCapacity: 0, expectedHours: 0 };
      }

      // 1. Get employee tenant. Capacity is calculated by the same historical DB rule used by allocation.
      const { data: empData } = await supabase
        .from('employees')
        .select('tenant_id')
        .eq('id', employeeId)
        .single();

      const tenantId = empData?.tenant_id;
      const [year, month] = monthKey.split('-').map(Number);
      const monthStart = parseISO(`${monthKey}-01`);
      const monthEnd = endOfMonth(monthStart);
      const expectedEnd = min([new Date(), monthEnd]);

      if (!tenantId || !year || !month) {
        return { projects: [], totalPlannedHours: 0, totalActualHours: 0, totalActivityHours: 0, monthlyCapacity: 0, expectedHours: 0 };
      }

      const [monthlyCapacityResult, expectedHoursResult, detailResult] = await Promise.all([
        supabase.rpc('calculate_employee_capacity_hours', {
          p_tenant_id: tenantId,
          p_employee_id: employeeId,
          p_start_date: toDateString(monthStart),
          p_end_date: toDateString(monthEnd),
        }),
        supabase.rpc('calculate_employee_capacity_hours', {
          p_tenant_id: tenantId,
          p_employee_id: employeeId,
          p_start_date: toDateString(monthStart),
          p_end_date: toDateString(expectedEnd),
        }),
        supabase.rpc('get_allocation_employee_detail', {
          p_tenant_id: tenantId,
          p_year: year,
          p_employee_id: employeeId,
          p_manager_id: null,
          p_project_id: null,
          p_team_key: null,
        }),
      ]);

      if (monthlyCapacityResult.error) throw monthlyCapacityResult.error;
      if (expectedHoursResult.error) throw expectedHoursResult.error;
      const { data: detailRows, error: detailError } = detailResult;
      if (detailError) throw detailError;

      const projectMap = new Map<string, ProjectAllocation>();
      let totalActivityHours = 0;

      ((detailRows ?? []) as AllocationDetailRpcRow[]).forEach((row) => {
        if (Number(row.month) !== month) return;

        if (row.item_type === 'internal_activity') {
          totalActivityHours += Number(row.actual_hours) || 0;
          return;
        }

        const projectId = row.project_id || row.item_id;
        if (!projectId) return;
        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            projectId,
            projectName: row.title,
            clientName: row.client_name || 'Sem cliente',
            plannedHours: 0,
            actualHours: 0,
          });
        }

        const entry = projectMap.get(projectId)!;
        entry.plannedHours += Number(row.planned_hours) || 0;
        entry.actualHours += Number(row.actual_hours) || 0;
      });

      const projects = Array.from(projectMap.values()).sort((a, b) =>
        a.projectName.localeCompare(b.projectName)
      );

      const totalPlannedHours = projects.reduce((sum, p) => sum + p.plannedHours, 0);
      const totalActualHours = projects.reduce((sum, p) => sum + p.actualHours, 0);

      const monthlyCapacity = Number(monthlyCapacityResult.data) || 0;
      const expectedHours = Number(expectedHoursResult.data) || 0;

      return { projects, totalPlannedHours, totalActualHours, totalActivityHours, monthlyCapacity, expectedHours };
    },
    enabled: !!employeeId && !!monthKey,
  });
};
