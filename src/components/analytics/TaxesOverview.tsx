import { Receipt, Percent, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercent } from '@/lib/formatters';

interface Props {
  taxesPercent: number;
  taxesValue: number;
  taxesRealValue: number | null;
  faturado: number;
}

export function TaxesOverview({ taxesPercent, taxesValue, taxesRealValue, faturado }: Props) {
  const hasRealData = taxesRealValue !== null;
  const effectiveRate = faturado > 0 ? (taxesValue / faturado) * 100 : taxesPercent;
  const estimatedValue = faturado * (taxesPercent / 100);
  const difference = hasRealData ? taxesRealValue - estimatedValue : null;

  return (
    <div className="grid gap-4 grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Alíquota Planejada (Meta)
          </CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(taxesPercent)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Meta definida nas configurações financeiras
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Impostos no Período
          </CardTitle>
          <Receipt className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{formatCurrency(taxesValue)}</span>
            {hasRealData ? (
              <Badge variant="default" className="bg-primary/10 text-primary text-xs">
                Real (DAE)
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                Estimado
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasRealData
              ? `Alíquota efetiva: ${formatPercent(effectiveRate)}`
              : `Calculado sobre a receita (${formatPercent(effectiveRate)})`
            }
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {hasRealData ? 'Diferença Real vs Planejado' : 'Alíquota Efetiva'}
          </CardTitle>
          {difference !== null && difference > 0 ? (
            <TrendingUp className="h-4 w-4 text-destructive" />
          ) : difference !== null && difference < 0 ? (
            <TrendingDown className="h-4 w-4 text-primary" />
          ) : (
            <Percent className="h-4 w-4 text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          {hasRealData && difference !== null ? (
            <>
              <div className={`text-2xl font-bold ${difference > 0 ? 'text-destructive' : 'text-primary'}`}>
                {difference > 0 ? '+' : ''}{formatCurrency(difference)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Planejado: {formatCurrency(estimatedValue)} | Real: {formatCurrency(taxesRealValue)}
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">{formatPercent(effectiveRate)}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Registre DAEs no Portal Admin para ver dados reais
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
