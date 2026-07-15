import { useMemo } from 'react';
import { parseISO, startOfMonth } from 'date-fns';
import { useProjectAllocations } from '@/hooks/useProjectRoles';
import { useHolidays } from '@/hooks/useHolidays';
import {
  calculatePlannedLaborCost,
  calculatePlannedLaborCostByProjectMonth,
  EmployeeFallbackCost,
} from '@/lib/roleAllocationCosts';
import { ProjectWithRelations } from '@/types/project';

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
    };
  }, [allocations, durationMonths, fallbackByEmployee, holidays, project.start_date]);

  return {
    ...plannedLabor,
    isLoading,
  };
}
