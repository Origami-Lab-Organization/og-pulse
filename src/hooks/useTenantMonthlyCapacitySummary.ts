import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { monthLoadKey } from '@/hooks/useEmployeeMonthlyLoad';

/**
 * Capacidade + planejado (TODOS os projetos) de TODOS os funcionários do
 * tenant, por mês. `get_allocation_employee_month_summary` já retorna essa
 * agregação para o tenant inteiro numa única chamada por ano — não precisa
 * de N chamadas por candidato. Reaproveitado para:
 *  - sinalizar sobrealocação de um membro na tabela de equipe;
 *  - ordenar candidatos por disponibilidade no dialog de alocação.
 */

interface SummaryRow {
  employee_id: string;
  month: number;
  capacity_hours: number | null;
  planned_hours: number | null;
}

export interface TenantMonthLoad {
  capacityHours: number;
  plannedHours: number;
}

export type TenantMonthlyCapacitySummary = Map<string, Map<string, TenantMonthLoad>>; // employeeId -> "year-month" -> load

export function getEmployeeMonthLoad(
  summary: TenantMonthlyCapacitySummary | undefined,
  employeeId: string,
  year: number,
  month: number,
): TenantMonthLoad {
  return summary?.get(employeeId)?.get(monthLoadKey(year, month)) ?? { capacityHours: 0, plannedHours: 0 };
}

export function useTenantMonthlyCapacitySummary({
  tenantId,
  years,
  enabled = true,
}: {
  tenantId: string | undefined;
  years: number[];
  enabled?: boolean;
}) {
  const sortedYears = Array.from(new Set(years)).sort((a, b) => a - b);

  return useQuery({
    queryKey: ['tenant-monthly-capacity-summary', tenantId, sortedYears],
    enabled: enabled && !!tenantId && sortedYears.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<TenantMonthlyCapacitySummary> => {
      const perYear = await Promise.all(
        sortedYears.map(async (year) => {
          const { data, error } = await supabase.rpc('get_allocation_employee_month_summary', {
            p_tenant_id: tenantId,
            p_year: year,
            p_manager_id: null,
            p_project_id: null,
            p_team_key: null,
          });
          if (error) throw error;
          return { year, rows: (data ?? []) as SummaryRow[] };
        }),
      );

      const result: TenantMonthlyCapacitySummary = new Map();
      perYear.forEach(({ year, rows }) => {
        rows.forEach((row) => {
          const employeeMap = result.get(row.employee_id) ?? new Map<string, TenantMonthLoad>();
          employeeMap.set(monthLoadKey(year, row.month), {
            capacityHours: Math.round(Number(row.capacity_hours ?? 0)),
            plannedHours: Math.round(Number(row.planned_hours ?? 0)),
          });
          result.set(row.employee_id, employeeMap);
        });
      });
      return result;
    },
  });
}
