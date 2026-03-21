import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeeklySummaryBarProps {
  totalHours: number;
  expectedHours: number;
  weekLabel: string;
}

export function WeeklySummaryBar({ totalHours, expectedHours, weekLabel }: WeeklySummaryBarProps) {
  const percent = expectedHours > 0 ? (totalHours / expectedHours) * 100 : 0;
  const isComplete = percent >= 100;
  const barColor = percent > 110 ? 'bg-destructive' : percent > 100 ? 'bg-amber-500' : 'bg-primary';
  const barWidth = Math.min(100, percent);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-card border rounded-lg px-4 py-3">
      {/* Rótulo da semana */}
      <div className="shrink-0">
        <p className="text-sm font-medium">Esta semana</p>
        <p className="text-xs text-muted-foreground">{weekLabel}</p>
      </div>

      {/* Barra de progresso ou mensagem vazia */}
      {totalHours === 0 ? (
        <p className="flex-1 text-sm text-muted-foreground sm:text-center">
          Nenhuma hora lançada
        </p>
      ) : (
        <div className="flex-1 max-w-md sm:mx-4">
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', barColor)}
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      )}

      {/* Total de horas */}
      {totalHours > 0 && (
        <div className={cn(
          'flex items-center gap-1.5 shrink-0',
          isComplete ? 'text-primary' : 'text-foreground',
        )}>
          {isComplete && <CheckCircle2 className="h-4 w-4" />}
          <span className="text-sm font-semibold tabular-nums">
            {totalHours.toFixed(1)}h / {expectedHours}h
          </span>
        </div>
      )}
    </div>
  );
}
