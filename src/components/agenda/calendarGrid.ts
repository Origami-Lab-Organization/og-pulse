import {
  addDays,
  addMonths,
  addWeeks,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CALENDAR_VIEW } from '@/types/agenda';
import type { CalendarView } from '@/types/agenda';

/**
 * Início e fim da grade do mês: semanas completas, então inclui alguns dias do
 * mês anterior e do seguinte. É esse intervalo que vai para o Graph.
 */
export function getMonthGridRange(month: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(startOfMonth(month), { locale: ptBR }),
    end: endOfWeek(endOfMonth(month), { locale: ptBR }),
  };
}

/** Intervalo visível de cada visão — é o que vai para o Graph. */
export function getViewRange(view: CalendarView, date: Date): { start: Date; end: Date } {
  if (view === CALENDAR_VIEW.DAY) return { start: startOfDay(date), end: endOfDay(date) };
  if (view === CALENDAR_VIEW.WEEK) {
    return {
      start: startOfWeek(date, { locale: ptBR }),
      end: endOfWeek(date, { locale: ptBR }),
    };
  }
  return getMonthGridRange(date);
}

/** Avança (+1) ou recua (-1) um período da visão. */
export function shiftViewDate(view: CalendarView, date: Date, step: 1 | -1): Date {
  if (view === CALENDAR_VIEW.DAY) return addDays(date, step);
  if (view === CALENDAR_VIEW.WEEK) return addWeeks(date, step);
  return addMonths(date, step);
}

/** Título do período: "21 de outubro de 2026", "19 – 25 de outubro de 2026"… */
export function formatViewTitle(view: CalendarView, date: Date): string {
  if (view === CALENDAR_VIEW.DAY) {
    return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  }
  if (view === CALENDAR_VIEW.WEEK) {
    const { start, end } = getViewRange(view, date);
    if (isSameMonth(start, end)) {
      return `${format(start, 'd')} – ${format(end, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
    }
    return `${format(start, "d 'de' MMM", { locale: ptBR })} – ${format(end, "d 'de' MMM 'de' yyyy", { locale: ptBR })}`;
  }
  return format(date, "MMMM 'de' yyyy", { locale: ptBR });
}
