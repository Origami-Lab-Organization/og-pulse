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

export function employeeMonthKey(employeeId: string, year: number, month: number) {
  return `${employeeId}:${year}-${month}`;
}

export interface EmployeeMonthCost {
  employeeId: string;
  year: number;
  month: number;
  hours: number;
  cost: number;
}

/**
 * Custo PLANEJADO de mão de obra por (funcionário, ano, mês) — mesma fórmula
 * de `calculatePlannedLaborCost` (plannedHours × taxa vigente no mês), mas
 * mantendo o grão por pessoa/mês para a expansão mensal da aba Custos.
 */
export function calculatePlannedLaborCostByEmployeeMonth(
  allocations: ProjectAllocation[],
  fallbackHourlyByEmployee: Record<string, number>,
): Map<string, EmployeeMonthCost> {
  const result = new Map<string, EmployeeMonthCost>();

  allocations.forEach((allocation) => {
    allocation.monthlyHours.forEach((month) => {
      if (month.plannedHours === 0) return;
      const hourlyCost = resolveHourlyCost(
        allocation.employeeId,
        month.costPerHour,
        fallbackHourlyByEmployee,
      );
      const key = employeeMonthKey(allocation.employeeId, month.year, month.month);
      const entry = result.get(key) ?? {
        employeeId: allocation.employeeId,
        year: month.year,
        month: month.month,
        hours: 0,
        cost: 0,
      };
      entry.hours += month.plannedHours;
      entry.cost += month.plannedHours * hourlyCost;
      result.set(key, entry);
    });
  });

  return result;
}

export interface RealizedTimesheetRow {
  project_member_id: string;
  work_date: string;
  hours: number;
  cost_per_hour: number | null;
}

export interface RealizedLaborCostResult {
  total: number;
  costByEmployee: Record<string, number>;
  hoursByEmployee: Record<string, number>;
  byEmployeeMonth: Map<string, EmployeeMonthCost>;
}

/**
 * Custo REALIZADO de mão de obra a partir dos timesheets do modelo antigo
 * (chaveados por project_member_id). Mesma regra usada hoje inline na aba
 * Custos: `cost_per_hour` do lançamento tem prioridade; fallback pela taxa
 * do membro quando o snapshot é nulo. Agrupa por funcionário e por
 * funcionário/mês para reconciliar com o KPI e alimentar a expansão mensal.
 */
export function calculateRealizedLaborCost(
  timesheets: RealizedTimesheetRow[],
  memberToEmployee: Map<string, string>,
  fallbackHourlyByMember: Map<string, number>,
): RealizedLaborCostResult {
  const costByEmployee: Record<string, number> = {};
  const hoursByEmployee: Record<string, number> = {};
  const byEmployeeMonth = new Map<string, EmployeeMonthCost>();
  let total = 0;

  timesheets.forEach((timesheet) => {
    const employeeId = memberToEmployee.get(timesheet.project_member_id);
    if (!employeeId) return;

    const hourlyCost =
      timesheet.cost_per_hour != null
        ? Number(timesheet.cost_per_hour)
        : fallbackHourlyByMember.get(timesheet.project_member_id) ?? 0;
    const hours = Number(timesheet.hours) || 0;
    const cost = hourlyCost * hours;

    costByEmployee[employeeId] = (costByEmployee[employeeId] ?? 0) + cost;
    hoursByEmployee[employeeId] = (hoursByEmployee[employeeId] ?? 0) + hours;
    total += cost;

    const date = new Date(timesheet.work_date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = employeeMonthKey(employeeId, year, month);
    const entry = byEmployeeMonth.get(key) ?? { employeeId, year, month, hours: 0, cost: 0 };
    entry.hours += hours;
    entry.cost += cost;
    byEmployeeMonth.set(key, entry);
  });

  return { total, costByEmployee, hoursByEmployee, byEmployeeMonth };
}
