import { useMemo } from 'react';
import { parseISO, startOfMonth } from 'date-fns';
import { useProjectAllocations } from '@/hooks/useProjectRoles';
import { useHolidays } from '@/hooks/useHolidays';
import {
  calculatePlannedLaborCost,
  calculatePlannedLaborCostByEmployeeMonth,
  calculatePlannedLaborCostByProjectMonth,
  EmployeeFallbackCost,
} from '@/lib/roleAllocationCosts';
import type { ProjectWithRelations } from '@/types/project';
import type { DatedCost } from '@/types/projectCostSummary';

function buildFallbackByEmployee(project: ProjectWithRelations) {
  const fallbackByEmployee: Record<string, EmployeeFallbackCost> = {};

  (project.members || []).forEach((member) => {
    fallbackByEmployee[member.employee_id] = {
      jornadaDiaria: member.employee?.jornada_diaria || 8,
      monthlyCostEstimated: member.employee?.total_monthly_cost_estimated || 0,
    };
  });

  return fallbackByEmployee;
}

export function useProjectPlannedLaborCost(
  project: ProjectWithRelations,
  durationMonths: number,
) {
  const { data: allocations = [], isLoading } = useProjectAllocations(project.id, true);
  const { data: holidays = [] } = useHolidays();

  const fallbackByEmployee = useMemo(
    () => buildFallbackByEmployee(project),
    [project],
  );

  const plannedLabor = useMemo(() => {
    if (allocations.length === 0) {
      return {
        hasRoleAllocations: false,
        total: 0,
        byMonth: new Map<number, number>(),
        byCalendarMonth: [] as DatedCost[],
      };
    }

    const projectStart = startOfMonth(parseISO(project.start_date));
    const { laborCost } = calculatePlannedLaborCost(
      allocations,
      fallbackByEmployee,
      holidays,
    );

    return {
      hasRoleAllocations: true,
      total: laborCost,
      byMonth: calculatePlannedLaborCostByProjectMonth(
        allocations,
        fallbackByEmployee,
        projectStart,
        durationMonths,
        holidays,
      ),
      // Mês de calendário de cada alocação, sem corte pela duração (US-0026). Mesma fórmula
      // do total, então a soma dos meses é igual a `total`.
      byCalendarMonth: Array.from(
        calculatePlannedLaborCostByEmployeeMonth(allocations, fallbackByEmployee, holidays).values(),
      ).map((entry) => ({ date: new Date(entry.year, entry.month - 1, 1), cost: entry.cost })),
    };
  }, [allocations, durationMonths, fallbackByEmployee, holidays, project.start_date]);

  return {
    ...plannedLabor,
    isLoading,
  };
}
