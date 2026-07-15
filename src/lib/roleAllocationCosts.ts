import { ProjectAllocation } from '@/types/equipe.types';
import { getFallbackHourlyCost } from '@/lib/employeeCost';
import type { Holiday } from '@/lib/workingDays';

export interface PlannedLaborCostResult {
  laborCost: number;
  costByEmployee: Record<string, number>;
}

export interface EmployeeFallbackCost {
  jornadaDiaria: number;
  monthlyCostEstimated: number;
}

function resolveHourlyCost(
  employeeId: string,
  costPerHour: number | null,
  year: number,
  month: number,
  fallbackByEmployee: Record<string, EmployeeFallbackCost>,
  holidays: Holiday[],
) {
  if (costPerHour != null) return costPerHour;
  const fallback = fallbackByEmployee[employeeId];
  if (!fallback) return 0;
  return getFallbackHourlyCost(fallback.monthlyCostEstimated, fallback.jornadaDiaria, year, month - 1, holidays);
}

export function calculatePlannedLaborCost(
  allocations: ProjectAllocation[],
  fallbackByEmployee: Record<string, EmployeeFallbackCost>,
  holidays: Holiday[] = [],
): PlannedLaborCostResult {
  const costByEmployee: Record<string, number> = {};
  let laborCost = 0;

  allocations.forEach((allocation) => {
    const employeeCost = allocation.monthlyHours.reduce((sum, month) => {
      const hourlyCost = resolveHourlyCost(
        allocation.employeeId,
        month.costPerHour,
        month.year,
        month.month,
        fallbackByEmployee,
        holidays,
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
  fallbackByEmployee: Record<string, EmployeeFallbackCost>,
  projectStartDate: Date,
  durationMonths: number,
  holidays: Holiday[] = [],
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
        month.year,
        month.month,
        fallbackByEmployee,
        holidays,
      );
      result.set(
        relativeMonth,
        (result.get(relativeMonth) ?? 0) + month.plannedHours * hourlyCost,
      );
    });
  });

  return result;
}
