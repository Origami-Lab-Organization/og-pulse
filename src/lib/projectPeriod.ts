import type { ProjectPeriod } from '@/types/projectPeriod';

/**
 * Regra única do período de lançamento do projeto (US-0030): horas e custos só entre a data de
 * início e a data de fim, incluindo as duas pontas. Projeto contínuo ou sem data de fim só tem
 * o limite do início. O banco aplica a mesma regra (`assert_project_accepts_entry`); aqui é o
 * aviso antecipado na tela.
 *
 * Datas no formato `yyyy-MM-dd`, comparadas como texto — sem `new Date`, que desloca o dia 1º
 * pelo fuso.
 */

const hasEnd = (period: ProjectPeriod): period is ProjectPeriod & { endDate: string } =>
  !period.isContinuous && !!period.endDate;

export function isDateInProjectPeriod(period: ProjectPeriod, date: string): boolean {
  if (period.startDate && date < period.startDate) return false;
  if (hasEnd(period) && date > period.endDate) return false;
  return true;
}

/** Datas da lista que ficam fora do período do projeto. */
export function datesOutsideProjectPeriod(period: ProjectPeriod, dates: string[]): string[] {
  return dates.filter((date) => !isDateInProjectPeriod(period, date));
}

const toBR = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;

/** "19/10/2026 a 17/11/2026" ou "a partir de 19/10/2026". */
export function describeProjectPeriod(period: ProjectPeriod): string {
  if (!period.startDate) return hasEnd(period) ? `até ${toBR(period.endDate)}` : 'sem limite';
  return hasEnd(period)
    ? `${toBR(period.startDate)} a ${toBR(period.endDate)}`
    : `a partir de ${toBR(period.startDate)}`;
}

export const outsidePeriodMessage = (period: ProjectPeriod) =>
  `Fora do período do projeto (${describeProjectPeriod(period)}). Para lançar depois do fim, o GP precisa estender a data de fim.`;
