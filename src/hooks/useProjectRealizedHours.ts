import { useQuery } from '@tanstack/react-query';
import { equipeService } from '@/services/equipeService';

/**
 * Horas realizadas por (funcionário, ano, mês) neste projeto — sem nenhum
 * campo de custo. Fonte: project_timesheets (via project_member_id), que
 * continua sendo a fonte de realizado até a Fase 4 do ADR-0006.
 */
export function useProjectRealizedHours(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-realized-hours', projectId],
    queryFn: async () => {
      const rows = await equipeService.getRealizedHoursByEmployeeMonth(projectId!);
      const byKey = new Map<string, number>();
      rows.forEach((row) => {
        byKey.set(`${row.employeeId}-${row.year}-${row.month}`, row.hours);
      });
      return byKey;
    },
    enabled: !!projectId,
  });
}
