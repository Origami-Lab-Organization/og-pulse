import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  format,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  addWeeks,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getWeekStart, getWeekEnd } from '@/hooks/useTimesheetData';
import { cn } from '@/lib/utils';

interface TimesheetWeekSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  /** Controlled view month — share state between 'month-nav' and 'chips' instances */
  viewMonth?: Date;
  onViewMonthChange?: (month: Date) => void;
  /** 'month-nav' renders only the month row; 'chips' renders only the chip row; omit for both */
  part?: 'month-nav' | 'chips';
}

const MONTHS_BACK = 6;
const MONTHS_FORWARD = 3;

function formatWeekChip(weekStart: Date, weekEnd: Date): string {
  if (isSameMonth(weekStart, weekEnd)) {
    return `${format(weekStart, 'd', { locale: ptBR })}–${format(weekEnd, 'd MMM', { locale: ptBR })}`;
  }
  return `${format(weekStart, 'd MMM', { locale: ptBR })}–${format(weekEnd, 'd MMM', { locale: ptBR })}`;
}

export function TimesheetWeekSelector({
  selectedDate,
  onDateChange,
  viewMonth: viewMonthProp,
  onViewMonthChange,
  part,
}: TimesheetWeekSelectorProps) {
  const today = new Date();
  const currentWeekStart = getWeekStart(today);
  const selectedWeekStart = getWeekStart(selectedDate);

  const [viewMonthInternal, setViewMonthInternal] = useState(() => startOfMonth(today));

  const viewMonth = viewMonthProp ?? viewMonthInternal;
  const setViewMonth = (m: Date) => {
    setViewMonthInternal(m);
    onViewMonthChange?.(m);
  };

  const minMonth = startOfMonth(subMonths(today, MONTHS_BACK));
  const maxMonth = startOfMonth(addMonths(today, MONTHS_FORWARD));

  const canGoPrev = viewMonth > minMonth;
  const canGoNext = viewMonth < maxMonth;

  const weeksInMonth = useMemo(() => {
    const monthEnd = endOfMonth(viewMonth);
    const weeks: Date[] = [];
    let current = getWeekStart(startOfMonth(viewMonth));
    while (current <= monthEnd) {
      weeks.push(current);
      current = addWeeks(current, 1);
    }
    return weeks;
  }, [viewMonth]);

  const handlePrevMonth = () => {
    if (canGoPrev) setViewMonth(startOfMonth(subMonths(viewMonth, 1)));
  };

  const handleNextMonth = () => {
    if (canGoNext) setViewMonth(startOfMonth(addMonths(viewMonth, 1)));
  };

  const handleToday = () => {
    setViewMonth(startOfMonth(today));
    onDateChange(today);
  };

  const monthNav = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        disabled={!canGoPrev}
        onClick={handlePrevMonth}
        aria-label={`Mês anterior: ${format(subMonths(viewMonth, 1), 'MMMM yyyy', { locale: ptBR })}`}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="flex-1 text-center text-sm font-medium capitalize" aria-live="polite">
        {format(viewMonth, 'MMMM yyyy', { locale: ptBR })}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        disabled={!canGoNext}
        onClick={handleNextMonth}
        aria-label={`Próximo mês: ${format(addMonths(viewMonth, 1), 'MMMM yyyy', { locale: ptBR })}`}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="ml-1 h-7 text-xs shrink-0"
        disabled={isSameDay(selectedWeekStart, currentWeekStart)}
        onClick={handleToday}
        aria-label="Ir para semana atual"
      >
        Hoje
      </Button>
    </div>
  );

  const chips = (
    <div className="flex flex-wrap gap-1.5" role="list">
      {weeksInMonth.map((weekStart) => {
        const weekEnd = getWeekEnd(weekStart);
        const isCurrent = isSameDay(weekStart, currentWeekStart);
        const isSelected = isSameDay(weekStart, selectedWeekStart);
        const chipLabel = formatWeekChip(weekStart, weekEnd);

        return (
          <button
            key={weekStart.toISOString()}
            role="listitem"
            onClick={() => onDateChange(weekStart)}
            aria-label={`Semana ${chipLabel}${isCurrent ? ' (semana atual)' : ''}`}
            aria-current={isSelected ? 'true' : undefined}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
              isCurrent && !isSelected && 'bg-primary text-primary-foreground',
              isCurrent && isSelected && 'bg-primary text-primary-foreground ring-2 ring-primary/50 ring-offset-1',
              !isCurrent && isSelected && 'border border-primary bg-primary/10 text-foreground',
              !isCurrent && !isSelected && 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {chipLabel}
          </button>
        );
      })}
    </div>
  );

  if (part === 'month-nav') return <nav aria-label="Navegação de mês">{monthNav}</nav>;
  if (part === 'chips') return <>{chips}</>;

  return (
    <nav className="flex flex-col gap-2" aria-label="Seletor de semana">
      {monthNav}
      {chips}
    </nav>
  );
}
