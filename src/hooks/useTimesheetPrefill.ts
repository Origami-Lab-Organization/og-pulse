import { useMemo } from 'react';
import { parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { WeekDay } from '@/hooks/useTimesheetData';
import { useHolidays, isHoliday } from '@/hooks/useHolidays';
import { useMyAllocationData, MyAllocationData } from '@/hooks/useMyAllocationData';
import { countWorkingDays } from '@/lib/workingDays';

/** Pré-preenchimento sugerido: por projeto, por data ISO, as horas sugeridas. */
export type TimesheetPrefill = Record<string, Record<string, number>>;

interface PrefillProject {
  projectId: string;
}

/**
 * Calcula a sugestão de horas (Opção C) para a semana corrente.
 *
 * Para cada projeto: `horas_por_dia = planned_hours_do_mês ÷ dias_úteis_do_mês`.
 * A sugestão aparece apenas em dias úteis (fim de semana e feriado ficam de fora).
 * Quando a semana cruza dois meses, cada dia usa o planejamento do seu próprio mês.
 *
 * É puro cálculo de UI — não persiste nada. A persistência acontece só no
 * "Enviar semana", reaproveitando o fluxo de submit existente.
 */
export function useTimesheetPrefill(
  employeeId: string | undefined,
  weekDays: WeekDay[],
  projects: PrefillProject[],
): TimesheetPrefill {
  const { data: holidays = [] } = useHolidays();

  // A semana (seg–sex) cobre no máximo dois meses. Resolvemos as duas chaves.
  const monthKeys = useMemo(
    () => Array.from(new Set(weekDays.map((d) => d.date.slice(0, 7)))),
    [weekDays],
  );
  const monthKeyA = monthKeys[0];
  const monthKeyB = monthKeys[1] ?? monthKeys[0];

  const { data: allocationA } = useMyAllocationData(employeeId, monthKeyA);
  const { data: allocationB } = useMyAllocationData(employeeId, monthKeyB);

  return useMemo(() => {
    const allocByMonth: Record<string, MyAllocationData | undefined> = {
      [monthKeyA]: allocationA,
      [monthKeyB]: allocationB,
    };

    // horas_por_dia de cada projeto, calculado por mês (Opção C).
    const perDayByMonth: Record<string, Map<string, number>> = {};
    for (const monthKey of monthKeys) {
      if (!monthKey) continue;
      const monthStart = startOfMonth(parseISO(`${monthKey}-01`));
      const monthEnd = endOfMonth(monthStart);
      const workingDays = countWorkingDays(monthStart, monthEnd, holidays);
      const map = new Map<string, number>();
      for (const p of allocByMonth[monthKey]?.projects ?? []) {
        // CA-06: sem planejamento ou sem dias úteis → sugestão 0 (sem divisão por zero).
        const perDay =
          workingDays > 0 && p.plannedHours > 0
            ? Math.round((p.plannedHours / workingDays) * 10) / 10
            : 0;
        if (perDay > 0) map.set(p.projectId, perDay);
      }
      perDayByMonth[monthKey] = map;
    }

    const result: TimesheetPrefill = {};
    for (const project of projects) {
      const cells: Record<string, number> = {};
      for (const day of weekDays) {
        const date = parseISO(day.date);
        const dow = date.getDay();
        if (dow === 0 || dow === 6) continue; // fim de semana
        if (isHoliday(date, holidays)) continue; // feriado
        const monthKey = day.date.slice(0, 7);
        const perDay = perDayByMonth[monthKey]?.get(project.projectId) ?? 0;
        if (perDay > 0) cells[day.date] = perDay;
      }
      if (Object.keys(cells).length > 0) result[project.projectId] = cells;
    }
    return result;
  }, [projects, weekDays, holidays, monthKeys, monthKeyA, monthKeyB, allocationA, allocationB]);
}
