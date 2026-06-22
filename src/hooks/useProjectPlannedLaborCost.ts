import { useMemo } from 'react';
import { parseISO, startOfMonth } from 'date-fns';
import { useProjectAllocations } from '@/hooks/useProjectRoles';
import {
  calculatePlannedLaborCost,
  calculatePlannedLaborCostByProjectMonth,
} from '@/lib/roleAllocationCosts';
import { ProjectWithRelations } from '@/types/project';

function fallbackHourlyCost(member: NonNullable<ProjectWithRelations['members']>[number]) {
  if (!member.employee) return Number((member as any).hourly_rate) || 0;

  const totalCost = member.employee.total_monthly_cost_estimated || 0;
  const workHours = member.employee.jornada_mensal || 168;
  return workHours > 0 ? totalCost / workHours : 0;
}

function buildFallbackHourlyByEmployee(project: ProjectWithRelations) {
  const fallbackHourlyByEmployee: Record<string, number> = {};

  (project.members || []).forEach((member) => {
    fallbackHourlyByEmployee[member.employee_id] = fallbackHourlyCost(member);
  });

  return fallbackHourlyByEmployee;
}

export function useProjectPlannedLaborCost(
  project: ProjectWithRelations,
  durationMonths: number,
) {
  const { data: allocations = [], isLoading } = useProjectAllocations(project.id);

  const fallbackHourlyByEmployee = useMemo(
    () => buildFallbackHourlyByEmployee(project),
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
      fallbackHourlyByEmployee,
    );

    return {
      hasRoleAllocations: true,
      total: laborCost,
      byMonth: calculatePlannedLaborCostByProjectMonth(
        allocations,
        fallbackHourlyByEmployee,
        projectStart,
        durationMonths,
      ),
    };
  }, [allocations, durationMonths, fallbackHourlyByEmployee, project.start_date]);

  return {
    ...plannedLabor,
    isLoading,
  };
}
