import { TrendingUp, TrendingDown, Minus, Calendar, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface MonthMargin {
  label: string;
  margin: number;
}

interface Props {
  grossMargin: number;
  grossMarginTarget: number | null;
  monthlyMargins: MonthMargin[];
}

function detectTrend(margins: MonthMargin[]): { label: string; icon: typeof TrendingUp; color: string } {
  if (margins.length < 3) return { label: 'Dados insuficientes', icon: Minus, color: 'text-muted-foreground' };
  const recent = margins.slice(-3);
  const isUp = recent[2].margin > recent[0].margin;
  const isFlat = Math.abs(recent[2].margin - recent[0].margin) < 2;
  if (isFlat) return { label: 'Estável', icon: Minus, color: 'text-muted-foreground' };
  if (isUp) return { label: 'Recuperação', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400' };
  return { label: 'Em queda', icon: TrendingDown, color: 'text-red-600 dark:text-red-400' };
}

function detectRisk(grossMargin: number, target: number | null): { label: string; color: string } {
  const t = target ?? 30;
  if (grossMargin >= t) return { label: 'Baixo', color: 'text-emerald-600 dark:text-emerald-400' };
  if (grossMargin >= t * 0.7) return { label: 'Moderado', color: 'text-amber-600 dark:text-amber-400' };
  return { label: 'Alto', color: 'text-red-600 dark:text-red-400' };
}

export function GrossMarginInsightCard({ grossMargin, grossMarginTarget, monthlyMargins }: Props) {
  const target = grossMarginTarget ?? 0;
  const diff = grossMargin - target;
  const isAbove = diff >= 0;

  const validMargins = monthlyMargins.filter(m => m.margin !== null && m.margin !== 0);
  const best = validMargins.length > 0
    ? validMargins.reduce((a, b) => (a.margin > b.margin ? a : b))
    : null;
  const worst = validMargins.length > 0
    ? validMargins.reduce((a, b) => (a.margin < b.margin ? a : b))
    : null;

  const trend = detectTrend(validMargins);
  const risk = detectRisk(grossMargin, grossMarginTarget);
  const TrendIcon = trend.icon;

  const progressValue = grossMarginTarget && grossMarginTarget > 0
    ? Math.min((grossMargin / grossMarginTarget) * 100, 100)
    : grossMargin;

  const statusColor = grossMarginTarget
    ? grossMargin >= grossMarginTarget
      ? 'text-emerald-600 dark:text-emerald-400'
      : grossMargin >= grossMarginTarget * 0.85
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400'
    : '';

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Margem Bruta</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 gap-4">
        {/* Main value */}
        <div className="text-center">
          <div className={cn('text-5xl lg:text-6xl font-extrabold tracking-tight', statusColor)}>
            {formatPercent(grossMargin)}
          </div>
          {grossMarginTarget !== null && (
            <p className="text-sm text-muted-foreground mt-1">
              Meta: {formatPercent(grossMarginTarget)}
            </p>
          )}
        </div>

        {/* Delta */}
        {grossMarginTarget !== null && (
          <div className="text-center">
            <span className={cn(
              'text-base font-semibold',
              isAbove ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
            )}>
              {isAbove ? '+' : ''}{diff.toFixed(1)} p.p. {isAbove ? 'acima' : 'abaixo'} da meta
            </span>
          </div>
        )}

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="relative">
            <Progress value={progressValue} className="h-2.5" />
            {grossMarginTarget !== null && grossMarginTarget > 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/50"
                style={{ left: `${Math.min((grossMarginTarget / (grossMarginTarget * 1.3)) * 100, 100)}%` }}
              />
            )}
          </div>
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
              <ArrowUp className="h-3 w-3 text-emerald-600" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Melhor mês</span>
            </div>
            <p className="text-sm font-semibold">
              {best ? `${best.label} · ${formatPercent(best.margin)}` : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <ArrowDown className="h-3 w-3 text-red-600" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pior mês</span>
            </div>
            <p className="text-sm font-semibold">
              {worst ? `${worst.label} · ${formatPercent(worst.margin)}` : '—'}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <TrendIcon className={cn('h-3 w-3', trend.color)} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tendência</span>
            </div>
            <p className={cn('text-sm font-semibold', trend.color)}>{trend.label}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5">
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle className={cn('h-3 w-3', risk.color)} />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Risco</span>
            </div>
            <p className={cn('text-sm font-semibold', risk.color)}>{risk.label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
