import { Users, Calendar, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  monthlyCosts: MonthlyCost[];
}

export function CostExecutiveInsights({ totalCosts, plannedCosts, laborCost, monthlyCosts }: Props) {
  const laborPct = totalCosts > 0 ? (laborCost / totalCosts) * 100 : 0;
  const gapPct = plannedCosts > 0 ? ((plannedCosts - totalCosts) / plannedCosts) * 100 : 0;

  const validMonths = monthlyCosts.filter(m => m.cost > 0);
  const peakMonth = validMonths.length > 0 ? validMonths.reduce((a, b) => (a.cost > b.cost ? a : b)) : null;

  const budgetStatus = gapPct > 0 ? 'controlado' : 'acima';
  const budgetColor = gapPct > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400';

  const insights = [
    {
      icon: Users,
      text: `Mão de obra domina a estrutura: ${formatPercent(laborPct)}`,
      color: laborPct > 70 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
      iconColor: laborPct > 70 ? 'text-amber-500' : 'text-blue-500',
    },
    {
      icon: Calendar,
      text: peakMonth
        ? `${peakMonth.label} concentra pico de custo: ${formatCurrency(peakMonth.cost)}`
        : 'Sem dados de pico',
      color: 'text-muted-foreground',
      iconColor: 'text-amber-500',
    },
    {
      icon: TrendingDown,
      text: `Orçamento ${budgetStatus}: ${gapPct >= 0 ? '-' : '+'}${formatPercent(Math.abs(gapPct))}`,
      color: budgetColor,
      iconColor: budgetColor,
    },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Leituras Executivas</CardTitle>
        <CardDescription className="text-xs">Resumo gerencial dos custos</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1 justify-center">
        {insights.map((insight, i) => {
          const Icon = insight.icon;
          return (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
              <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', insight.iconColor)} />
              <p className={cn('text-sm font-medium leading-relaxed', insight.color)}>
                {insight.text}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
