import { TrendingUp, TrendingDown, Minus, ArrowUp, AlertTriangle, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface MonthRevenue {
  label: string;
  revenue: number;
}

interface Props {
  revenueActual: number;
  faturado: number;
  revenueProjected: number;
  nfCount: number;
  overdueAmount: number;
  monthlyRevenues: MonthRevenue[];
}

function detectTrend(months: MonthRevenue[]): { label: string; icon: typeof TrendingUp; color: string } {
  if (months.length < 3) return { label: 'Dados insuficientes', icon: Minus, color: 'text-muted-foreground' };
  const recent = months.slice(-3);
  const isUp = recent[2].revenue > recent[0].revenue;
  const isFlat = Math.abs(recent[2].revenue - recent[0].revenue) < recent[0].revenue * 0.1;
  if (isFlat) return { label: 'Estável', icon: Minus, color: 'text-muted-foreground' };
  if (isUp) return { label: 'Saudável', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400' };
  return { label: 'Em queda', icon: TrendingDown, color: 'text-red-600 dark:text-red-400' };
}

export function RevenueConversionInsightCard({
  revenueActual,
  faturado,
  revenueProjected,
  nfCount,
  overdueAmount,
  monthlyRevenues,
}: Props) {
  const conversionRate = faturado > 0 ? (revenueActual / faturado) * 100 : 0;
  const projProgress = revenueProjected > 0 ? (revenueActual / revenueProjected) * 100 : 0;
  const avgTicket = nfCount > 0 ? faturado / nfCount : 0;

  const validMonths = monthlyRevenues.filter(m => m.revenue > 0);
  const bestMonth = validMonths.length > 0
    ? validMonths.reduce((a, b) => (a.revenue > b.revenue ? a : b))
    : null;

  const trend = detectTrend(validMonths);
  const TrendIcon = trend.icon;

  const overdueRisk = overdueAmount > revenueActual * 0.1 ? 'Alto' : overdueAmount > 0 ? 'Moderado' : 'Baixo';
  const overdueColor = overdueRisk === 'Alto'
    ? 'text-red-600 dark:text-red-400'
    : overdueRisk === 'Moderado'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400';

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Conversão de Receita</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4">
        {/* Main value */}
        <div className="text-center">
          <div className="text-5xl lg:text-6xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
            {formatPercent(conversionRate)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Recebido / Faturado</p>
        </div>

        {/* Projection progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Realização da projeção</span>
            <span>{formatPercent(projProgress)}</span>
          </div>
          <Progress value={Math.min(projProgress, 100)} className="h-2" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{formatCurrency(revenueActual)}</span>
            <span>{formatCurrency(revenueProjected)}</span>
          </div>
        </div>

        {/* Mini indicators 2x2 */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="h-3 w-3 text-emerald-600" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Melhor mês</span>
            </div>
            <p className="text-sm font-semibold">
              {bestMonth ? `${bestMonth.label} · ${formatCurrency(bestMonth.revenue)}` : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <DollarSign className="h-3 w-3 text-blue-600" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Ticket médio NF</span>
            </div>
            <p className="text-sm font-semibold">{formatCurrency(avgTicket)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle className={cn('h-3 w-3', overdueColor)} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Em atraso</span>
            </div>
            <p className={cn('text-sm font-semibold', overdueColor)}>{formatCurrency(overdueAmount)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <TrendIcon className={cn('h-3 w-3', trend.color)} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tendência</span>
            </div>
            <p className={cn('text-sm font-semibold', trend.color)}>{trend.label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
