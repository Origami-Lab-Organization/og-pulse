import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getWeekStart, getWeekEnd } from '@/hooks/useTimesheetData';

interface TimesheetWeekSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function TimesheetWeekSelector({ selectedDate, onDateChange }: TimesheetWeekSelectorProps) {
  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);

  const currentWeekStart = getWeekStart(new Date());
  const nextWeekStart = getWeekStart(addWeeks(selectedDate, 1));
  const canGoForward = nextWeekStart <= currentWeekStart;

  const handlePreviousWeek = () => {
    onDateChange(subWeeks(selectedDate, 1));
  };

  const handleNextWeek = () => {
    if (canGoForward) {
      onDateChange(addWeeks(selectedDate, 1));
    }
  };

  const handleCurrentWeek = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={handlePreviousWeek}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-2 min-w-[200px] justify-center">
        <span className="font-medium text-sm">
          {format(weekStart, "dd/MM", { locale: ptBR })} - {format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}
        </span>
      </div>
      
      <Button variant="outline" size="icon" onClick={handleNextWeek} disabled={!canGoForward}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      
      <Button variant="ghost" size="sm" onClick={handleCurrentWeek}>
        Hoje
      </Button>
    </div>
  );
}
