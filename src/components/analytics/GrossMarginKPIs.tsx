import { TrendingUp, TrendingDown, DollarSign, BarChart3, Target, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Props {
  grossMargin: number;
  grossMarginTarget: number | null;
  revenueActual: number;
  totalCosts: number;
  projectsAboveTarget: number;
  totalProjects: number;
  prevRevenue?: number;
  prevCosts?: number;
}

function StatusAccent({ status }: { status: 'good' | 'warning' | 'danger' | 'info' }) {
  const colors = {
    good: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
  };
  return <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-lg', colors[status])} />;
}

function DeltaBadge({ value, suffix = '%', invert = false }: { value: number; suffix?: string; invert?: boolean }) {
  const isPositive = invert ? value <= 0 : value >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium',
        isPositive
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
          : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
      )}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {value > 0 ? '+' : ''}{value.toFixed(1)}{suffix}
    </span>
  );
}

export function GrossMarginKPIs({
  grossMargin,
  grossMarginTarget,
  revenueActual,
  totalCosts,
  projectsAboveTarget,
  totalProjects,
  prevRevenue,
  prevCosts,
}: Props) {
  const marginDelta = grossMarginTarget ? grossMargin - grossMarginTarget : null;
  const marginStatus: 'good' | 'warning' | 'danger' =
    grossMarginTarget
      ? grossMargin >= grossMarginTarget
        ? 'good'
        : grossMargin >= grossMarginTarget * 0.85
          ? 'warning'
          : 'danger'
      : grossMargin >= 30
        ? 'good'
        : 'warning';

  const pctAbove = totalProjects > 0 ? (projectsAboveTarget / totalProjects) * 100 : 0;

  const revDelta = prevRevenue && prevRevenue > 0 ? ((revenueActual - prevRevenue) / prevRevenue) * 100 : null;
  const costDelta = prevCosts && prevCosts > 0 ? ((totalCosts - prevCosts) / prevCosts) * 100 : null;

  const costPressure = revenueActual > 0 && totalCosts / revenueActual > 0.6;

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* Margem Consolidada */}
      <Card className="relative overflow-hidden">
        <StatusAccent status={marginStatus} />
        <CardContent className="pt-5 pb-4 pl-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Margem Consolidada
          </p>
          <div className="flex items-end gap-2">
            <span className={cn(
              'text-3xl font-bold tracking-tight',
              marginStatus === 'good' && 'text-emerald-600 dark:text-emerald-400',
              marginStatus === 'warning' && 'text-amber-600 dark:text-amber-400',
              marginStatus === 'danger' && 'text-red-600 dark:text-red-400',
            )}>
              {formatPercent(grossMargin)}
            </span>
            {marginDelta !== null && <DeltaBadge value={marginDelta} suffix=" p.p." />}
          </div>
          {grossMarginTarget !== null && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Meta: {formatPercent(grossMarginTarget)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Receita Total */}
      <Card className="relative overflow-hidden">
        <StatusAccent status="good" />
        <CardContent className="pt-5 pb-4 pl-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Receita Total
          </p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold tracking-tight">
              {formatCurrency(revenueActual)}
            </span>
            {revDelta !== null && <DeltaBadge value={revDelta} />}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Recebido no período
          </p>
        </CardContent>
      </Card>

      {/* Custos Totais */}
      <Card className="relative overflow-hidden">
        <StatusAccent status={costPressure ? 'warning' : 'info'} />
        <CardContent className="pt-5 pb-4 pl-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Custos Totais
          </p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold tracking-tight">
              {formatCurrency(totalCosts)}
            </span>
            {costDelta !== null && <DeltaBadge value={costDelta} invert />}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {costPressure ? 'Pressionando margem' : 'Custos realizados'}
          </p>
        </CardContent>
      </Card>

      {/* Projetos acima da meta */}
      <Card className="relative overflow-hidden">
        <StatusAccent status="info" />
        <CardContent className="pt-5 pb-4 pl-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Projetos Acima da Meta
          </p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold tracking-tight">
              {formatPercent(pctAbove)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {projectsAboveTarget} de {totalProjects} projetos
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
