import { Lightbulb, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props {
  faturado: number;
  revenueActual: number;
  totalCosts: number;
  grossMargin: number;
  grossMarginTarget: number | null;
}

export function OverviewExecutiveInsights({ faturado, revenueActual, totalCosts, grossMargin, grossMarginTarget }: Props) {
  const conversionPct = faturado > 0 ? (revenueActual / faturado) * 100 : 0;
  const costPct = faturado > 0 ? (totalCosts / faturado) * 100 : 0;
  const target = grossMarginTarget ?? 50;

  const insights: { icon: typeof Lightbulb; text: string; color: string }[] = [];

  if (conversionPct < 75) {
    insights.push({
      icon: AlertTriangle,
      text: `Faturamento segue forte, mas apenas ${conversionPct.toFixed(0)}% virou caixa — atenção na conversão`,
      color: 'text-amber-600 dark:text-amber-400',
    });
  } else {
    insights.push({
      icon: TrendingUp,
      text: `Conversão de ${conversionPct.toFixed(0)}% do faturado em caixa — ritmo saudável`,
      color: 'text-emerald-600 dark:text-emerald-400',
    });
  }

  if (costPct > 70) {
    insights.push({
      icon: TrendingDown,
      text: `Custos consumiram ${costPct.toFixed(0)}% do faturado — pressão operacional alta`,
      color: 'text-red-600 dark:text-red-400',
    });
  } else {
    insights.push({
      icon: Lightbulb,
      text: `Custos representam ${costPct.toFixed(0)}% do faturado — estrutura controlada`,
      color: 'text-emerald-600 dark:text-emerald-400',
    });
  }

  if (grossMargin < target * 0.5) {
    insights.push({
      icon: AlertTriangle,
      text: `Resultado final exige ação urgente na conversão e no controle de custos`,
      color: 'text-red-600 dark:text-red-400',
    });
  } else if (grossMargin < target) {
    insights.push({
      icon: Lightbulb,
      text: `Margem abaixo da meta — revisar projetos com menor contribuição`,
      color: 'text-amber-600 dark:text-amber-400',
    });
  } else {
    insights.push({
      icon: TrendingUp,
      text: `Margem bruta acima da meta — operação sustentável`,
      color: 'text-emerald-600 dark:text-emerald-400',
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Leituras Executivas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, i) => {
          const Icon = insight.icon;
          return (
            <div key={i} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
              <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', insight.color)} />
              <p className="text-sm leading-relaxed">{insight.text}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
