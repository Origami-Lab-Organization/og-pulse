import { FileText, DollarSign, TrendingDown, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Props {
  faturado: number;
  revenueActual: number;
  totalCosts: number;
  grossMargin: number;
  grossMarginTarget: number | null;
}

export function OverviewKPIs({ faturado, revenueActual, totalCosts, grossMargin, grossMarginTarget }: Props) {
  const conversionPct = faturado > 0 ? (revenueActual / faturado) * 100 : 0;
  const costPct = faturado > 0 ? (totalCosts / faturado) * 100 : 0;
  const marginDiff = grossMarginTarget ? grossMargin - grossMarginTarget : null;

  const marginStatusColor = grossMarginTarget
    ? grossMargin >= grossMarginTarget
      ? 'text-emerald-600 dark:text-emerald-400'
      : grossMargin >= grossMarginTarget * 0.5
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400'
    : 'text-foreground';

  const cards = [
    {
      label: 'Faturamento',
      icon: FileText,
      value: formatCurrency(faturado),
      subtitle: 'NFs emitidas no período',
      accentColor: 'bg-emerald-500',
    },
    {
      label: 'Receita Recebida',
      icon: DollarSign,
      value: formatCurrency(revenueActual),
      subtitle: 'Conversão do faturado',
      badge: `${conversionPct.toFixed(1)}%`,
      badgeColor: conversionPct >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      accentColor: 'bg-blue-500',
    },
    {
      label: 'Custos Totais',
      icon: TrendingDown,
      value: formatCurrency(totalCosts),
      subtitle: 'Pressão operacional do período',
      badge: `${costPct.toFixed(1)}% do faturado`,
      badgeColor: costPct <= 60 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      accentColor: 'bg-red-500',
    },
    {
      label: 'Margem Bruta',
      icon: Target,
      value: formatPercent(grossMargin),
      valueColor: marginStatusColor,
      subtitle: grossMarginTarget ? `Meta: ${formatPercent(grossMarginTarget)}` : 'Resultado do período',
      badge: marginDiff !== null ? `${marginDiff >= 0 ? '+' : ''}${marginDiff.toFixed(1)} p.p.` : undefined,
      badgeColor: marginDiff !== null
        ? marginDiff >= 0
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        : '',
      accentColor: 'bg-blue-500',
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="relative overflow-hidden">
            <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-lg', c.accentColor)} />
            <CardContent className="pt-5 pb-4 pl-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className={cn('text-2xl font-bold', c.valueColor)}>{c.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{c.subtitle}</p>
              {c.badge && (
                <span className={cn('inline-block mt-2 px-2 py-0.5 text-[10px] font-semibold rounded-full', c.badgeColor)}>
                  {c.badge}
                </span>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
