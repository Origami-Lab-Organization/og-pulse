import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface YearNavigatorProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export function YearNavigator({ selectedYear, onYearChange }: YearNavigatorProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => onYearChange(selectedYear - 1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex min-w-[120px] items-center justify-center">
        <span className="text-sm font-medium">{selectedYear}</span>
      </div>

      <Button variant="outline" size="icon" onClick={() => onYearChange(selectedYear + 1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onYearChange(currentYear)}
        disabled={selectedYear === currentYear}
      >
        Ano atual
      </Button>
    </div>
  );
}
