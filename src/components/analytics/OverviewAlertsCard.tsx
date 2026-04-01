import { AlertTriangle, TrendingDown, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Props {
  faturado: number;
  revenueActual: number;
  grossMargin: number;
  grossMarginTarget: number | null;
}

export function OverviewAlertsCard({ faturado, revenueActual, grossMargin, grossMarginTarget }: Props) {
  const unconverted = faturado - revenueActual;
  const marginDiff = grossMarginTarget ? grossMargin - grossMarginTarget : null;
  const unconvertedPct = faturado > 0 ? (unconverted / faturado) * 100 : 0;

  const items = [
    {
      label: 'Receita ainda não convertida em caixa',
      value: formatCurrency(unconverted),
      progress: Math.min(unconvertedPct, 100),
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      barColor: 'bg-amber-500',
    },
    {
      label: 'Margem abaixo da meta',
      value: marginDiff !== null ? `${marginDiff.toFixed(1)} p.p.` : '—',
      progress: marginDiff !== null ? Math.min(Math.abs(marginDiff), 50) * 2 : 0,
      icon: TrendingDown,
      color: marginDiff !== null && marginDiff < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400',
      barColor: marginDiff !== null && marginDiff < 0 ? 'bg-red-500' : 'bg-emerald-500',
    },
    {
      label: 'Base já faturada no período',
      value: formatCurrency(faturado),
      progress: 100,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      barColor: 'bg-emerald-500',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Alertas e Oportunidades</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn('h-4 w-4', item.color)} />
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
                <span className={cn('text-sm font-semibold', item.color)}>{item.value}</span>
              </div>
              <Progress value={item.progress} className={cn('h-2', `[&>div]:${item.barColor}`)} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
