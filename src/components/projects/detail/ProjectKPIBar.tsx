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

type DotStatus = 'ok' | 'alert' | 'warning' | 'neutral';

function MetricItem({
  label,
  value,
  subtitle,
  dotStatus,
  valueClassName,
  extra,
}: {
  label: string;
  value: string;
  subtitle?: React.ReactNode;
  dotStatus?: DotStatus;
  valueClassName?: string;
  extra?: React.ReactNode;
}) {
  const dotClass =
    dotStatus === 'alert'
      ? 'bg-destructive'
      : dotStatus === 'ok'
      ? 'bg-primary-deep'
      : dotStatus === 'warning'
      ? 'bg-warning'
      : dotStatus === 'neutral'
      ? 'bg-muted-foreground'
      : null;

  return (
    <div className="relative flex-1 min-w-0 px-5 py-4">
      {dotClass && (
        <span className={cn('absolute top-3 right-3 w-2 h-2 rounded-full', dotClass)} />
      )}
      <p className="ol-label text-muted-foreground truncate">{label}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <p
          className={cn(
            'font-mono text-[1.75rem] font-semibold leading-none tabular-nums truncate',
            valueClassName,
          )}
        >
          {value}
        </p>
        {extra}
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
      )}
    </div>
  );
}

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
    marginActual >= effectiveTarget
      ? 'text-primary-deep'
      : marginActual < marginLow
      ? 'text-destructive'
      : 'text-foreground';

  const marginDot: DotStatus =
    marginActual >= effectiveTarget ? 'ok' : marginActual < marginLow ? 'alert' : 'warning';

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex divide-x overflow-x-auto">
        <MetricItem
          label="Receita"
          value={formatCurrency(revenueActual)}
          subtitle={`plan. ${formatCurrency(revenuePlanned)} · ${revenueExecuted.toFixed(1)}% exec.`}
          dotStatus="ok"
        />
        <MetricItem
          label="Comissão"
          value={formatCurrency(commissionActual)}
          subtitle={`plan. ${formatCurrency(commissionPlanned)} · ${commissionExecuted.toFixed(1)}% exec.`}
          dotStatus="warning"
        />
        <MetricItem
          label="Custos"
          value={formatCurrency(costActual)}
          subtitle={`plan. ${formatCurrency(costPlanned)} · ${costExecuted.toFixed(1)}% exec.`}
          dotStatus={costOverrun ? 'alert' : 'neutral'}
        />
        <MetricItem
          label="Margem"
          value={formatPercent(marginActual)}
          valueClassName={marginColorClass}
          dotStatus={marginDot}
          extra={
            <span
              className={cn(
                'text-xs font-semibold',
                marginVar >= 0 ? 'text-primary-deep' : 'text-destructive',
              )}
            >
              {hideValues ? '•••pp' : `${marginVar >= 0 ? '+' : ''}${marginVar.toFixed(1)}pp`}
            </span>
          }
          subtitle={
            <>
              plan. {formatPercent(marginPlanned)}
              {marginTarget != null && (
                <> · meta {hideValues ? '•••' : `${marginTarget.toFixed(0)}%`}</>
              )}
            </>
          }
        />
      </div>
    </div>
  );
}
