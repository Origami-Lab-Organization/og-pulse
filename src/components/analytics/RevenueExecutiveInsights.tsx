import { Lightbulb, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { RevenueByDimension } from '@/hooks/useRevenueAnalytics';

interface Props {
  revenueActual: number;
  faturado: number;
  overdueAmount: number;
  byClient: RevenueByDimension[];
}

export function RevenueExecutiveInsights({ revenueActual, faturado, overdueAmount, byClient }: Props) {
  const conversionRate = faturado > 0 ? (revenueActual / faturado) * 100 : 0;

  // Concentration: top 2 clients share
  const totalReceived = byClient.reduce((s, c) => s + c.received, 0);
  const top2 = byClient.slice(0, 2).reduce((s, c) => s + c.received, 0);
  const top2Pct = totalReceived > 0 ? (top2 / totalReceived) * 100 : 0;
  const concentrationHigh = top2Pct > 70;

  // Overdue risk
  const overdueRisk = overdueAmount > revenueActual * 0.1
    ? 'alto'
    : overdueAmount > 0
      ? 'baixo a moderado'
      : 'baixo';
  const overdueColor = overdueRisk === 'alto'
    ? 'text-red-600 dark:text-red-400'
    : overdueRisk === 'baixo'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-amber-600 dark:text-amber-400';

  const insights = [
    {
      icon: Users,
      text: `Receita concentrada: ${formatPercent(top2Pct)} em ${Math.min(2, byClient.length)} clientes`,
      color: concentrationHigh ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
      iconColor: concentrationHigh ? 'text-amber-500' : 'text-blue-500',
    },
    {
      icon: TrendingUp,
      text: `Conversão do período: ${formatPercent(conversionRate)} do faturado`,
      color: conversionRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
      iconColor: conversionRate >= 80 ? 'text-emerald-500' : 'text-amber-500',
    },
    {
      icon: AlertTriangle,
      text: `Risco atual: ${overdueRisk}`,
      color: overdueColor,
      iconColor: overdueColor,
    },
  ];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Leituras Executivas</CardTitle>
        <CardDescription className="text-xs">Resumo gerencial da receita</CardDescription>
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
