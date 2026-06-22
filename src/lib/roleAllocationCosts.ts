import { ProjectAllocation } from '@/types/equipe.types';

export interface PlannedLaborCostResult {
  laborCost: number;
  costByEmployee: Record<string, number>;
}

function resolveHourlyCost(
  employeeId: string,
  costPerHour: number | null,
  fallbackHourlyByEmployee: Record<string, number>,
) {
  return costPerHour ?? fallbackHourlyByEmployee[employeeId] ?? 0;
}

export function calculatePlannedLaborCost(
  allocations: ProjectAllocation[],
  fallbackHourlyByEmployee: Record<string, number>,
): PlannedLaborCostResult {
  const costByEmployee: Record<string, number> = {};
  let laborCost = 0;

  allocations.forEach((allocation) => {
    const employeeCost = allocation.monthlyHours.reduce((sum, month) => {
      const hourlyCost = resolveHourlyCost(
        allocation.employeeId,
        month.costPerHour,
        fallbackHourlyByEmployee,
      );
      return sum + month.plannedHours * hourlyCost;
    }, 0);

    costByEmployee[allocation.employeeId] = (costByEmployee[allocation.employeeId] ?? 0) + employeeCost;
    laborCost += employeeCost;
  });

  return { laborCost, costByEmployee };
}

export function calculatePlannedLaborCostByProjectMonth(
  allocations: ProjectAllocation[],
  fallbackHourlyByEmployee: Record<string, number>,
  projectStartDate: Date,
  durationMonths: number,
): Map<number, number> {
  const result = new Map<number, number>();
  const startYear = projectStartDate.getFullYear();
  const startMonthIndex = projectStartDate.getMonth();

  allocations.forEach((allocation) => {
    allocation.monthlyHours.forEach((month) => {
      const relativeMonth =
        (month.year - startYear) * 12 + (month.month - 1 - startMonthIndex) + 1;
      if (relativeMonth < 1 || relativeMonth > durationMonths) return;

      const hourlyCost = resolveHourlyCost(
        allocation.employeeId,
        month.costPerHour,
        fallbackHourlyByEmployee,
      );
      result.set(
        relativeMonth,
        (result.get(relativeMonth) ?? 0) + month.plannedHours * hourlyCost,
      );
    });
  });

  return result;
}
