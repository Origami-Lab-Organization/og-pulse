import { useQuery } from '@tanstack/react-query';
import { format, addMonths, startOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getFallbackHourlyCost } from '@/lib/employeeCost';
import type { Holiday } from '@/lib/workingDays';

export interface AdminActivityMonthlyPoint {
  monthIndex: number;
  label: string;
  [activityTypeId: string]: number | string;
}

export interface AdminActivitiesEvolutionData {
  year: number;
  months: AdminActivityMonthlyPoint[];
  activityTypes: Array<{ id: string; name: string; color: string | null }>;
}

export function useAdminActivitiesEvolution(
  year: number,
  options?: { enabled?: boolean },
) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  return useQuery({
    queryKey: ['admin-activities-evolution', tenantId, year],
    queryFn: async (): Promise<AdminActivitiesEvolutionData> => {
      if (!tenantId) throw new Error('No tenant');

      const { data: activityTypes, error: atErr } = await supabase
        .from('activity_types' as any)
        .select('id, name, color')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      if (atErr) throw atErr;

      const types = (activityTypes || []) as unknown as Array<{ id: string; name: string; color: string | null }>;

      const buildEmpty = (): AdminActivityMonthlyPoint[] =>
        Array.from({ length: 12 }, (_, i) => ({
          monthIndex: i,
          label: format(new Date(year, i, 1), 'MMM', { locale: ptBR }),
          ...Object.fromEntries(types.map(t => [t.id, 0])),
        }));

      if (types.length === 0) {
        return { year, months: buildEmpty(), activityTypes: types };
      }

      const typeIds = types.map(t => t.id);

      // Fetch activity timesheets with employee cost info
      const { data: timesheets, error: tsErr } = await supabase
        .from('activity_timesheets' as any)
        .select('activity_type_id, work_date, hours, employee:employees(total_monthly_cost_estimated, jornada_diaria)')
        .in('activity_type_id', typeIds)
        .gte('work_date', yearStart)
        .lte('work_date', yearEnd);
      if (tsErr) throw tsErr;

      const { data: holidaysData } = await supabase
        .from('company_holidays')
        .select('holiday_type, fixed_day, fixed_month, specific_date')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      const holidays = (holidaysData || []) as Holiday[];

      const monthData = buildEmpty();

      for (const ts of (timesheets || []) as any[]) {
        if (!ts.work_date || !ts.activity_type_id) continue;
        const d = parseISO(ts.work_date);
        if (d.getFullYear() !== year) continue;
        const emp = ts.employee;
        if (!emp) continue;
        const idx = d.getMonth();
        const hourlyCost = getFallbackHourlyCost(Number(emp.total_monthly_cost_estimated) || 0, Number(emp.jornada_diaria) || 8, year, idx, holidays);
        const current = (monthData[idx][ts.activity_type_id] as number) || 0;
        monthData[idx][ts.activity_type_id] = current + Number(ts.hours) * hourlyCost;
      }

      return { year, months: monthData, activityTypes: types };
    },
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}
