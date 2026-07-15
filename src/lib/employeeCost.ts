import { countWorkingDays, type Holiday } from './workingDays';

export function getBusinessDaysInMonth(year: number, monthIndex: number, holidays: Holiday[]): number {
  return countWorkingDays(new Date(year, monthIndex, 1), new Date(year, monthIndex + 1, 0), holidays);
}

export function getMonthlyHoursFromDaily(jornadaDiaria: number, year: number, monthIndex: number, holidays: Holiday[]): number {
  return jornadaDiaria * getBusinessDaysInMonth(year, monthIndex, holidays);
}

/**
 * Custo-hora quando não há snapshot já gravado (project_timesheets.cost_per_hour /
 * project_role_allocations.cost_per_hour). Deriva a jornada do mês a partir da
 * jornada diária × dias úteis do mês específico — nunca de um "jornada_mensal" estático.
 */
export function getFallbackHourlyCost(
  totalMonthlyCostEstimated: number,
  jornadaDiaria: number,
  year: number,
  monthIndex: number,
  holidays: Holiday[],
): number {
  const hours = getMonthlyHoursFromDaily(jornadaDiaria, year, monthIndex, holidays);
  return hours > 0 ? totalMonthlyCostEstimated / hours : 0;
}
