import { countWorkingDays, type Holiday } from './workingDays';
import { parseDateString } from './formatters';

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
 *
 * `dataAdmissao`/`terminationDate` (opcionais, 'YYYY-MM-DD') recortam o mês pela janela de
 * emprego — mesma regra de `effectiveEmploymentWindow` em payrollAnalysis.ts — para não
 * cobrar custo em meses fora do período em que o colaborador esteve empregado. Sem esse
 * recorte, este fallback reproduziria o mesmo bug já corrigido no snapshot gravado pela
 * trigger (ver 20260721160000_employee_cost_snapshot_admission_termination_window.sql).
 */
export function getFallbackHourlyCost(
  totalMonthlyCostEstimated: number,
  jornadaDiaria: number,
  year: number,
  monthIndex: number,
  holidays: Holiday[],
  dataAdmissao?: string | null,
  terminationDate?: string | null,
): number {
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);

  if (dataAdmissao && parseDateString(dataAdmissao) > monthEnd) return 0;
  if (terminationDate && parseDateString(terminationDate) < monthStart) return 0;

  const hours = getMonthlyHoursFromDaily(jornadaDiaria, year, monthIndex, holidays);
  return hours > 0 ? totalMonthlyCostEstimated / hours : 0;
}
