import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseISO, endOfMonth, min, eachDayOfInterval, isWeekend } from 'date-fns';
import { isHoliday } from '@/hooks/useHolidays';
import { Holiday } from '@/types/holiday';
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

function countWorkingDays(start: Date, end: Date, holidays: Holiday[]): number {
  const days = eachDayOfInterval({ start, end });
  let count = 0;
  for (const day of days) {
    if (isWeekend(day)) continue;
    if (isHoliday(day, holidays)) continue;
    count++;
  }
  return count;
}

function calculateExpectedHours(monthKey: string, jornada_diaria: number, holidays: Holiday[]): number {
  const monthStart = parseISO(`${monthKey}-01`);
  const upperLimit = min([new Date(), endOfMonth(monthStart)]);
  return countWorkingDays(monthStart, upperLimit, holidays) * jornada_diaria;
}

function calculateMonthlyCapacity(monthKey: string, jornada_diaria: number, holidays: Holiday[]): number {
  const monthStart = parseISO(`${monthKey}-01`);
  return countWorkingDays(monthStart, endOfMonth(monthStart), holidays) * jornada_diaria;
}

export const useMyAllocationData = (employeeId: string | undefined, monthKey: string) => {
  return useQuery({
    queryKey: ['my-allocation-data', employeeId, monthKey],
    queryFn: async (): Promise<MyAllocationData> => {
      if (!employeeId || !monthKey) {
        return { projects: [], totalPlannedHours: 0, totalActualHours: 0, totalActivityHours: 0, monthlyCapacity: 0, expectedHours: 0 };
      }

      // 1. Get employee's monthly capacity, tenant and daily hours
      const [{ data: empData }, { data: holidays }] = await Promise.all([
        supabase
          .from('employees')
          .select('tenant_id, jornada_diaria')
          .eq('id', employeeId)
          .single(),
        supabase
          .from('company_holidays')
          .select('*')
          .eq('is_active', true),
      ]);

      const tenantId = empData?.tenant_id;
      const jornada_diaria = empData?.jornada_diaria ?? 8;
      const typedHolidays = (holidays || []) as Holiday[];
      const monthlyCapacity = calculateMonthlyCapacity(monthKey, jornada_diaria, typedHolidays);
      const [year, month] = monthKey.split('-').map(Number);

      if (!tenantId || !year || !month) {
        return { projects: [], totalPlannedHours: 0, totalActualHours: 0, totalActivityHours: 0, monthlyCapacity, expectedHours: 0 };
      }

      const { data: detailRows, error: detailError } = await supabase.rpc('get_allocation_employee_detail', {
        p_tenant_id: tenantId,
        p_year: year,
        p_employee_id: employeeId,
        p_manager_id: null,
        p_project_id: null,
        p_team_key: null,
      });
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

      const expectedHours = calculateExpectedHours(monthKey, jornada_diaria, typedHolidays);

      return { projects, totalPlannedHours, totalActualHours, totalActivityHours, monthlyCapacity, expectedHours };
    },
    enabled: !!employeeId && !!monthKey,
  });
};
