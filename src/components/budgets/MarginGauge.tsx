import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarginGaugeProps {
  effectiveMarginPercent: number;
  minMarginPercent: number;
  netMarginPercent: number;
}

export function MarginGauge({ effectiveMarginPercent, minMarginPercent, netMarginPercent }: MarginGaugeProps) {
  const clamped = Math.min(Math.max(effectiveMarginPercent, 0), 100);
  const redPct = Math.min(minMarginPercent, 100);
  const yellowPct = Math.min(Math.max(netMarginPercent - minMarginPercent, 0), 100 - redPct);
  const greenPct = 100 - redPct - yellowPct;

  const isBelowMin = effectiveMarginPercent < minMarginPercent;
  const isBelowTarget = effectiveMarginPercent < netMarginPercent;

  return (
    <div className={cn(
      'rounded-lg border p-3 space-y-2.5 transition-colors',
      isBelowMin ? 'border-destructive bg-destructive/5' : 'border-border',
    )}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {isBelowMin && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
          Margem Efetiva
        </div>
        <span className={cn(
          'text-base font-bold transition-colors duration-300',
          isBelowMin
            ? 'text-destructive'
            : isBelowTarget
            ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-green-600 dark:text-green-400',
        )}>
          {effectiveMarginPercent.toFixed(1)}%
        </span>
      </div>

      {/* Track */}
      <div className="relative h-5 flex items-center">
        {/* Colored segments */}
        <div className="flex h-2.5 rounded-full overflow-hidden w-full">
          <div style={{ width: `${redPct}%` }} className="bg-red-500/60 shrink-0" />
          <div style={{ width: `${yellowPct}%` }} className="bg-yellow-400/70 shrink-0" />
          <div style={{ width: `${greenPct}%` }} className="bg-green-500/60 flex-1" />
        </div>

        {/* Dividers at zone boundaries */}
        <div className="absolute h-4 w-px bg-foreground/35" style={{ left: `${redPct}%` }} />
        <div className="absolute h-4 w-px bg-foreground/35" style={{ left: `${redPct + yellowPct}%` }} />

        {/* Current-value indicator dot */}
        <div
          className="absolute h-4 w-4 rounded-full border-2 border-foreground bg-background shadow-sm transition-all duration-300 ease-out"
          style={{ left: `calc(${clamped}% - 8px)` }}
        />
      </div>

      {/* Labels */}
      <div className="relative h-4 text-[10px] text-muted-foreground select-none">
        <span className="absolute left-0">0%</span>
        <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${redPct}%` }}>
          Mín {minMarginPercent}%
        </span>
        <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${redPct + yellowPct}%` }}>
          Target {netMarginPercent}%
        </span>
        <span className="absolute right-0">100%</span>
      </div>
    </div>
  );
}
