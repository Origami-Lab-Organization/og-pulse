import { Receipt, Percent, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/formatters';

interface Props {
  taxesPercent: number;
  taxesValue: number;
  faturado: number;
}

export function TaxesOverview({ taxesPercent, taxesValue, faturado }: Props) {
  const effectiveRate = faturado > 0 ? (taxesValue / faturado) * 100 : taxesPercent;

  return (
    <div className="grid gap-4 grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Alíquota Configurada
          </CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatPercent(taxesPercent)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Alíquota definida nas configurações financeiras
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
          <div className="text-2xl font-bold">{formatCurrency(taxesValue)}</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Calculado sobre a receita recebida ({formatPercent(effectiveRate)})
          </p>
        </CardContent>
      </Card>

      <Card className="border-dashed opacity-70">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            DAE — Em breve
          </CardTitle>
          <Upload className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-base font-medium text-muted-foreground">Upload de DAE</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Em desenvolvimento: lançamento de guias DAE para compor os dados reais de imposto.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
