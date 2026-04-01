import { TrendingUp, TrendingDown, Minus, AlertTriangle, ArrowUpRight, BarChart3, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Props {
  grossMargin: number;
  grossMarginTarget: number | null;
  revenueActual: number;
  faturado: number;
  totalCosts: number;
  monthlyMargins: { label: string; margin: number }[];
}

function detectTrend(margins: { margin: number }[]): { label: string; icon: typeof TrendingUp; color: string } {
  if (margins.length < 3) return { label: 'Dados insuficientes', icon: Minus, color: 'text-muted-foreground' };
  const recent = margins.slice(-3);
  const diff = recent[2].margin - recent[0].margin;
  if (Math.abs(diff) < 2) return { label: 'Estável', icon: Minus, color: 'text-muted-foreground' };
  if (diff > 0) return { label: 'Recuperação', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400' };
  return { label: 'Em queda', icon: TrendingDown, color: 'text-red-600 dark:text-red-400' };
}

export function ExecutiveSummaryCard({ grossMargin, grossMarginTarget, revenueActual, faturado, totalCosts, monthlyMargins }: Props) {
  const target = grossMarginTarget ?? 0;
  const diff = grossMargin - target;
  const conversionPct = faturado > 0 ? (revenueActual / faturado) * 100 : 0;
  const costRevenuePct = revenueActual > 0 ? (totalCosts / revenueActual) * 100 : 0;
  const netCash = revenueActual - totalCosts;
  const progressValue = target > 0 ? Math.min((grossMargin / target) * 100, 100) : grossMargin;

  const statusColor = grossMarginTarget
    ? grossMargin >= grossMarginTarget
      ? 'text-emerald-600 dark:text-emerald-400'
      : grossMargin >= grossMarginTarget * 0.5
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400'
    : 'text-foreground';

  const statusLabel = grossMarginTarget
    ? grossMargin >= grossMarginTarget
      ? 'Saudável'
      : grossMargin >= grossMarginTarget * 0.7
        ? 'Atenção'
        : 'Crítico'
    : '—';

  const statusBadgeColor = grossMarginTarget
    ? grossMargin >= grossMarginTarget
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : grossMargin >= grossMarginTarget * 0.7
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    : '';

  const validMargins = monthlyMargins.filter(m => m.margin !== 0);
  const trend = detectTrend(validMargins);
  const TrendIcon = trend.icon;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Resumo Executivo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4">
        {/* Main value */}
        <div className="text-center">
          <div className={cn('text-5xl lg:text-6xl font-extrabold tracking-tight', statusColor)}>
            {formatPercent(grossMargin)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Margem bruta consolidada</p>
        </div>

        {/* Delta */}
        {grossMarginTarget !== null && (
          <div className="text-center">
            <span className={cn(
              'text-base font-semibold',
              diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
            )}>
              {Math.abs(diff).toFixed(1)} p.p. {diff >= 0 ? 'acima' : 'abaixo'} da meta
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-1.5">
          <Progress value={progressValue} className="h-2.5" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            {grossMarginTarget !== null && <span>Meta {formatPercent(grossMarginTarget)}</span>}
            <span>100%</span>
          </div>
        </div>

        {/* Mini indicators 2x2 */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <ArrowUpRight className="h-3 w-3 text-blue-500" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Conversão</span>
            </div>
            <p className="text-sm font-semibold">{conversionPct.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <BarChart3 className="h-3 w-3 text-red-500" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Custo / Receita</span>
            </div>
            <p className="text-sm font-semibold">{costRevenuePct.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <Wallet className="h-3 w-3 text-emerald-600" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Caixa líquido</span>
            </div>
            <p className="text-sm font-semibold">{formatCurrency(netCash)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle className={cn('h-3 w-3', statusBadgeColor.includes('emerald') ? 'text-emerald-600' : statusBadgeColor.includes('amber') ? 'text-amber-600' : 'text-red-600')} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</span>
            </div>
            <p className={cn('text-sm font-semibold', statusColor)}>{statusLabel}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
