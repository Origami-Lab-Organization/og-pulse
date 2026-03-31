import { Receipt, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/formatters';

interface Props {
  taxesPercent: number;
  taxesValue: number;
  taxesRealValue: number | null;
  faturado: number;
}

export function TaxesOverview({ taxesPercent, taxesValue, faturado }: Props) {
  const effectiveRate = faturado > 0 ? (taxesValue / faturado) * 100 : taxesPercent;

  return (
    <div className="grid gap-4 grid-cols-2">
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
          <div className="text-2xl font-bold">{formatPercent(effectiveRate)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCurrency(taxesValue)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}