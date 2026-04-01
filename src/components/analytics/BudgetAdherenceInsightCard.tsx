import { TrendingUp, TrendingDown, Minus, Calendar, DollarSign, Gauge, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface MonthlyCost {
  label: string;
  cost: number;
}

interface Props {
  totalCosts: number;
  plannedCosts: number;
  laborCost: number;
  supplierCost: number;
  monthlyCosts: MonthlyCost[];
}

function detectTrend(months: MonthlyCost[]): { label: string; icon: typeof TrendingUp; color: string } {
  if (months.length < 3) return { label: 'Dados insuficientes', icon: Minus, color: 'text-muted-foreground' };
  const recent = months.slice(-3);
  const isUp = recent[2].cost > recent[0].cost * 1.1;
  const isFlat = Math.abs(recent[2].cost - recent[0].cost) < recent[0].cost * 0.1;
  if (isFlat) return { label: 'Controlada', icon: Minus, color: 'text-muted-foreground' };
  if (isUp) return { label: 'Crescente', icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400' };
  return { label: 'Controlada', icon: TrendingDown, color: 'text-emerald-600 dark:text-emerald-400' };
}

export function BudgetAdherenceInsightCard({ totalCosts, plannedCosts, laborCost, supplierCost, monthlyCosts }: Props) {
  const adherence = plannedCosts > 0 ? (totalCosts / plannedCosts) * 100 : 0;
  const gap = plannedCosts - totalCosts;
  const gapPct = plannedCosts > 0 ? (gap / plannedCosts) * 100 : 0;
  const execProgress = plannedCosts > 0 ? Math.min((totalCosts / plannedCosts) * 100, 100) : 0;

  const validMonths = monthlyCosts.filter(m => m.cost > 0);
  const peakMonth = validMonths.length > 0 ? validMonths.reduce((a, b) => (a.cost > b.cost ? a : b)) : null;

  const biggestCenter = laborCost >= supplierCost ? 'Mão de obra' : 'Fornecedores';

  const pressure = adherence > 100 ? 'Alta' : adherence > 90 ? 'Moderada' : 'Baixa';
  const pressureColor = pressure === 'Alta'
    ? 'text-red-600 dark:text-red-400'
    : pressure === 'Moderada'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-emerald-600 dark:text-emerald-400';

  const trend = detectTrend(validMonths);
  const TrendIcon = trend.icon;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Aderência ao Orçamento</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4">
        {/* Main value */}
        <div className="text-center">
          <div className={cn(
            'text-5xl lg:text-6xl font-extrabold tracking-tight',
            adherence <= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
          )}>
            {formatPercent(adherence)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">Realizado / Previsto</p>
          <p className={cn('text-xs mt-0.5 font-medium', gap >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
            {gap >= 0 ? `${formatPercent(gapPct)} abaixo do orçamento` : `${formatPercent(Math.abs(gapPct))} acima do orçamento`}
          </p>
        </div>

        {/* Execution progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Execução do orçamento</span>
            <span>{formatPercent(execProgress)}</span>
          </div>
          <Progress value={execProgress} className="h-2" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{formatCurrency(totalCosts)}</span>
            <span>{formatCurrency(plannedCosts)}</span>
          </div>
        </div>

        {/* Mini indicators 2x2 */}
        <div className="grid grid-cols-2 gap-3 mt-auto">
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <Calendar className="h-3 w-3 text-amber-600" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Maior mês</span>
            </div>
            <p className="text-sm font-semibold">
              {peakMonth ? `${peakMonth.label} · ${formatCurrency(peakMonth.cost)}` : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <BarChart3 className="h-3 w-3 text-blue-600" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Maior centro</span>
            </div>
            <p className="text-sm font-semibold">{biggestCenter}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <Gauge className={cn('h-3 w-3', pressureColor)} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pressão atual</span>
            </div>
            <p className={cn('text-sm font-semibold', pressureColor)}>{pressure}</p>
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
