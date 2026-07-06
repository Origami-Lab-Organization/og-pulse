import { cn } from '@/lib/utils';
import { useMaskedCurrency, useMaskedPercent, useHideValues } from '@/contexts/HideValuesContext';

interface ProjectKPIBarProps {
  revenuePlanned: number;
  revenueActual: number;
  revenueExecuted: number;
  commissionPlanned: number;
  commissionActual: number;
  commissionExecuted: number;
  costPlanned: number;
  costActual: number;
  costExecuted: number;
  marginPlanned: number;
  marginActual: number;
  marginVar: number;
  /** Passa a meta de margem para mostrar subtítulo e ajustar thresholds de cor. */
  marginTarget?: number;
}

const CELL_BASE =
  'flex min-h-[104px] flex-col items-start justify-between border-b p-5 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-child(n+3)]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0';

export function ProjectKPIBar({
  revenuePlanned,
  revenueActual,
  revenueExecuted,
  commissionPlanned,
  commissionActual,
  commissionExecuted,
  costPlanned,
  costActual,
  costExecuted,
  marginPlanned,
  marginActual,
  marginVar,
  marginTarget,
}: ProjectKPIBarProps) {
  const formatCurrency = useMaskedCurrency();
  const formatPercent = useMaskedPercent();
  const hideValues = useHideValues();

  const effectiveTarget = marginTarget ?? 30;
  const marginLow = marginTarget != null ? marginTarget * 0.5 : 15;
  const costOverrun = costActual > costPlanned && costPlanned > 0;

  const marginColorClass =
    marginActual >= effectiveTarget ? 'text-primary-deep' :
    marginActual < marginLow ? 'text-destructive' : 'text-foreground';

  const marginDotClass =
    marginActual >= effectiveTarget ? 'bg-success' :
    marginActual < marginLow ? 'bg-destructive' : 'bg-warning';

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-lg border bg-card sm:grid-cols-2 lg:grid-cols-4">
      <div className={CELL_BASE}>
        <div className="flex w-full items-center justify-between gap-3">
          <span className="ol-label text-muted-foreground">Receita</span>
          <span className="h-2 w-2 rounded-full bg-primary-deep" />
        </div>
        <div className="space-y-1">
          <p className="font-mono text-[1.75rem] font-semibold leading-none tabular-nums text-foreground">
            {formatCurrency(revenueActual)}
          </p>
          <p className="text-xs text-muted-foreground">
            plan. {formatCurrency(revenuePlanned)} · {revenueExecuted.toFixed(1)}% exec.
          </p>
        </div>
      </div>

      <div className={CELL_BASE}>
        <div className="flex w-full items-center justify-between gap-3">
          <span className="ol-label text-muted-foreground">Comissão</span>
          <span className="h-2 w-2 rounded-full bg-warning" />
        </div>
        <div className="space-y-1">
          <p className="font-mono text-[1.75rem] font-semibold leading-none tabular-nums text-foreground">
            {formatCurrency(commissionActual)}
          </p>
          <p className="text-xs text-muted-foreground">
            plan. {formatCurrency(commissionPlanned)} · {commissionExecuted.toFixed(1)}% exec.
          </p>
        </div>
      </div>

      <div className={CELL_BASE}>
        <div className="flex w-full items-center justify-between gap-3">
          <span className="ol-label text-muted-foreground">Custos</span>
          <span className={cn('h-2 w-2 rounded-full', costOverrun ? 'bg-destructive' : 'bg-muted-foreground')} />
        </div>
        <div className="space-y-1">
          <p className="font-mono text-[1.75rem] font-semibold leading-none tabular-nums text-foreground">
            {formatCurrency(costActual)}
          </p>
          <p className="text-xs text-muted-foreground">
            plan. {formatCurrency(costPlanned)} · {costExecuted.toFixed(1)}% exec.
          </p>
        </div>
      </div>

      <div className={CELL_BASE}>
        <div className="flex w-full items-center justify-between gap-3">
          <span className="ol-label text-muted-foreground">Margem</span>
          <span className={cn('h-2 w-2 rounded-full', marginDotClass)} />
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <p className={cn('font-mono text-[1.75rem] font-semibold leading-none tabular-nums', marginColorClass)}>
              {formatPercent(marginActual)}
            </p>
            <span className={cn('text-xs font-semibold', marginVar >= 0 ? 'text-primary-deep' : 'text-destructive')}>
              {hideValues ? '•••pp' : `${marginVar >= 0 ? '+' : ''}${marginVar.toFixed(1)}pp`}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            plan. {formatPercent(marginPlanned)}
            {marginTarget != null && (
              <> · meta {hideValues ? '•••' : `${marginTarget.toFixed(0)}%`}</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
