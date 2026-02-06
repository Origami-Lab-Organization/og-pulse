import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { CostBreakdown } from '@/lib/employeeCostCalculator';
import { NetSalaryBreakdown, PJ_SIMPLES_TAX_RATE } from '@/lib/netSalaryCalculator';
import { Briefcase, Building2 } from 'lucide-react';

interface CalculatorResultsProps {
  cltCost: CostBreakdown;
  cltNetSalary: NetSalaryBreakdown;
  jornadaMensal: number;
}

export function CalculatorResults({
  cltCost,
  cltNetSalary,
  jornadaMensal,
}: CalculatorResultsProps) {
  // PJ equivalente = mesmo custo empresa
  const pjEquivalentValue = cltCost.totalMonthlyCost;
  const pjEstimatedTax = pjEquivalentValue * PJ_SIMPLES_TAX_RATE;
  const pjNetEstimate = pjEquivalentValue - pjEstimatedTax;

  // Custo por hora
  const cltHourlyCost = jornadaMensal > 0 ? cltCost.totalMonthlyCost / jornadaMensal : 0;
  const pjHourlyCost = jornadaMensal > 0 ? pjEquivalentValue / jornadaMensal : 0;

  // Diferença de líquido
  const netDifference = pjNetEstimate - cltNetSalary.netSalary;
  const netDifferencePercent = cltNetSalary.netSalary > 0 
    ? ((netDifference / cltNetSalary.netSalary) * 100).toFixed(1) 
    : '0';

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Card CLT */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-primary" />
              CLT
            </CardTitle>
            <Badge variant="default">Regime CLT</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Custo Empresa</span>
              <span className="font-bold text-lg">{formatCurrency(cltCost.totalMonthlyCost)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Salário Bruto</span>
              <span className="font-medium">{formatCurrency(cltNetSalary.grossSalary)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Descontos (INSS + IRRF)</span>
              <span className="font-medium text-destructive">
                - {formatCurrency(cltNetSalary.inss + cltNetSalary.irrf)}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b bg-muted/50 -mx-6 px-6">
              <span className="font-medium">Salário Líquido</span>
              <span className="font-bold text-lg text-primary">{formatCurrency(cltNetSalary.netSalary)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Custo/Hora</span>
              <span className="font-medium">{formatCurrency(cltHourlyCost)}/h</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card PJ */}
      <Card className="border-secondary/30 bg-secondary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5 text-secondary-foreground" />
              PJ Equivalente
            </CardTitle>
            <Badge variant="secondary">Mesmo Custo</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Custo Empresa</span>
              <span className="font-bold text-lg">{formatCurrency(pjEquivalentValue)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Valor do Contrato</span>
              <span className="font-medium">{formatCurrency(pjEquivalentValue)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Impostos (~{(PJ_SIMPLES_TAX_RATE * 100).toFixed(0)}% Simples)</span>
              <span className="font-medium text-destructive">
                - {formatCurrency(pjEstimatedTax)}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b bg-muted/50 -mx-6 px-6">
              <span className="font-medium">Líquido Estimado</span>
              <span className="font-bold text-lg text-green-600 dark:text-green-400">
                {formatCurrency(pjNetEstimate)}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Custo/Hora</span>
              <span className="font-medium">{formatCurrency(pjHourlyCost)}/h</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Comparativo */}
      <Card className="md:col-span-2 border-muted">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resumo Comparativo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Diferença no Líquido</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                + {formatCurrency(netDifference)}
              </p>
              <p className="text-sm text-muted-foreground">
                (+{netDifferencePercent}% como PJ)
              </p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Encargos + Provisões CLT</p>
              <p className="text-2xl font-bold">
                {formatCurrency(cltCost.chargesAmount + cltCost.provisionsAmount)}
              </p>
              <p className="text-sm text-muted-foreground">
                {((cltCost.chargesAmount + cltCost.provisionsAmount) / cltCost.baseAmount * 100).toFixed(1)}% do salário
              </p>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Benefícios</p>
              <p className="text-2xl font-bold">
                {formatCurrency(cltCost.benefitsAmount)}
              </p>
              <p className="text-sm text-muted-foreground">
                {cltCost.benefitsAmount > 0 ? 'Incluídos no custo CLT' : 'Não informados'}
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Nota:</strong> O cálculo PJ considera uma alíquota média de {(PJ_SIMPLES_TAX_RATE * 100).toFixed(0)}% 
              (Simples Nacional). O valor real pode variar conforme o anexo, faturamento e outros fatores.
              PJ não inclui benefícios trabalhistas (FGTS, férias, 13º).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
