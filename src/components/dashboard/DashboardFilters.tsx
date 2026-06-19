import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import {
  format,
  addMonths, subMonths,
  addQuarters, subQuarters, startOfQuarter, getQuarter,
  addYears, subYears,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export type Granularity = 'month' | 'quarter' | 'year' | 'custom';

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'month', label: 'Mês' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'year', label: 'Ano' },
  { value: 'custom', label: 'Personalizado' },
];

interface DashboardFiltersProps {
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
  currentPeriodDate: Date;
  onPeriodDateChange: (date: Date) => void;
  customStart: Date | undefined;
  customEnd: Date | undefined;
  onCustomStartChange: (date: Date | undefined) => void;
  onCustomEndChange: (date: Date | undefined) => void;
}

function getPeriodLabel(granularity: Granularity, date: Date): string {
  switch (granularity) {
    case 'month': {
      const label = format(date, "MMMM 'de' yyyy", { locale: ptBR });
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    case 'quarter': {
      const q = getQuarter(startOfQuarter(date));
      return `T${q} · ${format(date, 'yyyy')}`;
    }
    case 'year':
      return format(date, 'yyyy');
    default:
      return '';
  }
}

function navigatePeriod(granularity: Granularity, date: Date, direction: 1 | -1): Date {
  switch (granularity) {
    case 'month':
      return direction === 1 ? addMonths(date, 1) : subMonths(date, 1);
    case 'quarter':
      return direction === 1 ? addQuarters(date, 1) : subQuarters(date, 1);
    case 'year':
      return direction === 1 ? addYears(date, 1) : subYears(date, 1);
    default:
      return date;
  }
}

/**
 * Filtro de período GLOBAL do Dashboard Executivo.
 * Apenas período — sem filtros por cliente/gerente/projeto. O estado vive na
 * página Dashboard e alimenta TODOS os blocos simultaneamente (HU-002 / Cenário 3).
 */
export function DashboardFilters({
  granularity,
  onGranularityChange,
  currentPeriodDate,
  onPeriodDateChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Granularidade — controle segmentado */}
      <div className="inline-flex rounded-lg border bg-card p-0.5 gap-0.5">
        {GRANULARITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onGranularityChange(opt.value)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              granularity === opt.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Navegador de período — oculto no modo personalizado */}
      {granularity !== 'custom' && (
        <div className="flex items-center gap-1 rounded-lg border bg-card px-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Período anterior"
            onClick={() => onPeriodDateChange(navigatePeriod(granularity, currentPeriodDate, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium">
            {getPeriodLabel(granularity, currentPeriodDate)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Próximo período"
            onClick={() => onPeriodDateChange(navigatePeriod(granularity, currentPeriodDate, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Seletor de datas personalizado */}
      {granularity === 'custom' && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[150px] justify-start text-left font-normal',
                  !customStart && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customStart ? format(customStart, 'dd/MM/yyyy') : 'Início'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customStart}
                onSelect={onCustomStartChange}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[150px] justify-start text-left font-normal',
                  !customEnd && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customEnd ? format(customEnd, 'dd/MM/yyyy') : 'Fim'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customEnd}
                onSelect={onCustomEndChange}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}
