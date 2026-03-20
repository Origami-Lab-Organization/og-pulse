import { useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, subWeeks, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getWeekStart, getWeekEnd } from '@/hooks/useTimesheetData';
import { cn } from '@/lib/utils';

interface TimesheetWeekSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const WEEKS_BACK = 26;
const WEEKS_FORWARD = 12;

export function TimesheetWeekSelector({ selectedDate, onDateChange }: TimesheetWeekSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedChipRef = useRef<HTMLButtonElement>(null);
  const currentChipRef = useRef<HTMLButtonElement>(null);
  const hasMounted = useRef(false);

  const currentWeekStart = getWeekStart(new Date());
  const selectedWeekStart = getWeekStart(selectedDate);

  const weeks = useMemo(() => {
    const list: Date[] = [];
    for (let i = WEEKS_BACK; i >= 0; i--) {
      list.push(getWeekStart(subWeeks(new Date(), i)));
    }
    for (let i = 1; i <= WEEKS_FORWARD; i++) {
      list.push(getWeekStart(subWeeks(new Date(), -i)));
    }
    return list;
  }, []);

  // On mount, center the current week
  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      setTimeout(() => {
        currentChipRef.current?.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'center' });
      }, 50);
    }
  }, []);

  // On selection change, scroll to selected chip
  useEffect(() => {
    if (hasMounted.current) {
      setTimeout(() => {
        selectedChipRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 50);
    }
  }, [selectedDate]);

  const scrollBy = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });
  };

  return (
    <div className="flex items-center gap-0">
      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => scrollBy(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div ref={scrollRef} className="flex-1 overflow-x-auto scrollbar-hide scroll-smooth">
        <div className="flex gap-1.5 px-1 py-1.5">
          {weeks.map((weekStart) => {
            const weekEnd = getWeekEnd(weekStart);
            const isCurrent = isSameDay(weekStart, currentWeekStart);
            const isSelected = isSameDay(weekStart, selectedWeekStart);

            return (
              <button
                key={weekStart.toISOString()}
                ref={(el) => {
                  if (isSelected) (selectedChipRef as any).current = el;
                  if (isCurrent) (currentChipRef as any).current = el;
                }}
                onClick={() => onDateChange(weekStart)}
                className={cn(
                  'shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                  isCurrent && !isSelected && 'bg-primary text-primary-foreground',
                  isCurrent && isSelected && 'bg-primary text-primary-foreground ring-2 ring-primary/50',
                  !isCurrent && isSelected && 'border border-primary bg-primary/10 text-foreground',
                  !isCurrent && !isSelected && 'text-muted-foreground hover:bg-muted',
                )}
              >
                {format(weekStart, 'dd/MM', { locale: ptBR })} - {format(weekEnd, 'dd/MM', { locale: ptBR })}
              </button>
            );
          })}
        </div>
      </div>

      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => scrollBy(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="shrink-0 ml-1"
        disabled={isSameDay(selectedWeekStart, currentWeekStart)}
        onClick={() => onDateChange(new Date())}
      >
        Hoje
      </Button>
    </div>
  );
}
