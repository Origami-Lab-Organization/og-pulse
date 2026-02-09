import { DollarSign, TrendingDown, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/formatters';

interface AnalyticsKPIsProps {
  revenueActual: number;
  revenueProjected: number;
  revenueDiff: number;
  totalCosts: number;
  taxesPercent: number;
  taxesValue: number;
  grossMargin: number;
  grossMarginTarget: number | null;
}

export function AnalyticsKPIs({
  revenueActual,
  revenueProjected,
  revenueDiff,
  totalCosts,
  taxesPercent,
  taxesValue,
  grossMargin,
  grossMarginTarget,
}: AnalyticsKPIsProps) {
  const marginColor = grossMarginTarget
    ? grossMargin >= grossMarginTarget
      ? 'text-emerald-600 dark:text-emerald-400'
      : grossMargin >= grossMarginTarget * 0.5
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400'
    : 'text-foreground';

  const diffColor = revenueDiff >= 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-600 dark:text-red-400';

  const diffSign = revenueDiff >= 0 ? '+' : '';

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Revenue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Receita Recebida
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(revenueActual)}</div>
          <div className="mt-1 space-y-0.5">
            <p className="text-xs text-muted-foreground">
              Projetada: {formatCurrency(revenueProjected)}
            </p>
            <p className={`text-xs font-medium ${diffColor}`}>
              Diferença: {diffSign}{formatCurrency(Math.abs(revenueDiff))}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Costs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Custos Totais
          </CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalCosts)}</div>
        </CardContent>
      </Card>

      {/* Gross Margin */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Margem Bruta
          </CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${marginColor}`}>
            {formatPercent(grossMargin)}
          </div>
          <div className="mt-1 space-y-0.5">
            <p className="text-xs text-muted-foreground">
              Impostos ({formatPercent(taxesPercent)}): {formatCurrency(taxesValue)}
            </p>
            {grossMarginTarget !== null && (
              <p className="text-xs text-muted-foreground">
                Meta: {formatPercent(grossMarginTarget)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
