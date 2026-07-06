import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Carga mensal de um funcionário através de TODOS os projetos do tenant.
 *
 * Reúne, por mês (ano-mês), a capacidade do colaborador e quanto ele já tem
 * planejado em outros projetos — para que a tela de alocação mostre claramente
 * se uma nova alocação vai estourar a capacidade dele.
 *
 * - Capacidade: `get_allocation_employee_month_summary` (capacity_hours por mês).
 * - Detalhe por projeto: `get_allocation_employee_detail` (planned_hours por projeto/mês).
 *
 * `excludeProjectId` remove o projeto atual da soma "outros projetos", para que
 * editar uma alocação existente não conte as próprias horas duas vezes.
 */

interface SummaryRow {
  employee_id: string;
  month: number;
  capacity_hours: number | null;
  planned_hours: number | null;
}

interface DetailRow {
  item_type: 'project' | 'internal_activity';
  project_id: string | null;
  title: string;
  month: number;
  planned_hours: number;
}

export interface MonthLoadProject {
  projectId: string;
  projectName: string;
  hours: number;
}

export interface MonthLoad {
  capacityHours: number;
  /**
   * Total planejado do funcionário em TODOS os projetos no mês (fonte: RPC de resumo,
   * que já inclui o modelo novo `project_role_allocations`). Inclui o projeto atual —
   * subtraia as horas salvas do projeto atual para obter "outros projetos".
   */
  totalPlanned: number;
  /**
   * Quebra por projeto vinda do RPC de detalhe, já usando `project_role_allocations`
   * como fonte canônica de planejamento. O consumidor ainda reconcilia com
   * `totalPlanned` para cobrir linhas antigas ou dados agregados sem detalhe.
   */
  byProject: MonthLoadProject[];
}

export type EmployeeMonthlyLoad = Record<string, MonthLoad>; // chave: `${year}-${month}`

export function monthLoadKey(year: number, month: number) {
  return `${year}-${month}`;
}

function emptyMonthLoad(): MonthLoad {
  return { capacityHours: 0, totalPlanned: 0, byProject: [] };
}

export function useEmployeeMonthlyLoad({
  tenantId,
  employeeId,
  years,
  excludeProjectId,
  enabled = true,
}: {
  tenantId: string | undefined;
  employeeId: string | undefined;
  years: number[];
  excludeProjectId?: string | null;
  enabled?: boolean;
}) {
  const sortedYears = Array.from(new Set(years)).sort((a, b) => a - b);

  return useQuery({
    queryKey: ['employee-monthly-load', tenantId, employeeId, sortedYears, excludeProjectId ?? null],
    enabled: enabled && !!tenantId && !!employeeId && sortedYears.length > 0,
    queryFn: async (): Promise<EmployeeMonthlyLoad> => {
      if (!tenantId || !employeeId) return {};

      const perYear = await Promise.all(
        sortedYears.map(async (year) => {
          const [summary, detail] = await Promise.all([
            supabase.rpc('get_allocation_employee_month_summary', {
              p_tenant_id: tenantId,
              p_year: year,
              p_manager_id: null,
              p_project_id: null,
              p_team_key: null,
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

          if (summary.error) throw summary.error;
          if (detail.error) throw detail.error;

          return {
            year,
            summary: ((summary.data ?? []) as SummaryRow[]).filter((row) => row.employee_id === employeeId),
            detail: (detail.data ?? []) as DetailRow[],
          };
        }),
      );

      const result: EmployeeMonthlyLoad = {};

      for (const { year, summary, detail } of perYear) {
        summary.forEach((row) => {
          const key = monthLoadKey(year, row.month);
          const entry = result[key] ?? emptyMonthLoad();
          entry.capacityHours = Math.round(Number(row.capacity_hours ?? 0));
          entry.totalPlanned += Number(row.planned_hours ?? 0);
          result[key] = entry;
        });

        detail
          .filter((row) => row.item_type === 'project' && row.project_id && row.project_id !== excludeProjectId)
          .forEach((row) => {
            const key = monthLoadKey(year, row.month);
            const entry = result[key] ?? emptyMonthLoad();
            const projectId = row.project_id as string;
            const hours = Number(row.planned_hours ?? 0);
            if (hours <= 0) return;

            const existing = entry.byProject.find((project) => project.projectId === projectId);
            if (existing) {
              existing.hours += hours;
            } else {
              entry.byProject.push({ projectId, projectName: row.title, hours });
            }
            result[key] = entry;
          });
      }

      // Arredonda e ordena a quebra por projeto (maior primeiro).
      Object.values(result).forEach((entry) => {
        entry.totalPlanned = Math.round(entry.totalPlanned);
        entry.byProject = entry.byProject
          .map((project) => ({ ...project, hours: Math.round(project.hours) }))
          .sort((a, b) => b.hours - a.hours);
      });

      return result;
    },
  });
}
