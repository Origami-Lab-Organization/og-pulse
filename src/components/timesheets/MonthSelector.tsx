import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, addMonths, subMonths, startOfMonth, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthSelectorProps {
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
}

export function MonthSelector({ selectedMonth, onMonthChange }: MonthSelectorProps) {
  const now = new Date();
  const canGoForward = !isSameMonth(selectedMonth, now) && startOfMonth(addMonths(selectedMonth, 1)) <= startOfMonth(now);

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => onMonthChange(subMonths(selectedMonth, 1))}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 min-w-[160px] justify-center">
        <span className="font-medium text-sm capitalize">
          {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
        </span>
      </div>

      <Button variant="outline" size="icon" onClick={() => onMonthChange(addMonths(selectedMonth, 1))} disabled={!canGoForward}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onMonthChange(new Date())}
        disabled={isSameMonth(selectedMonth, now)}
      >
        Hoje
      </Button>
    </div>
  );
}
