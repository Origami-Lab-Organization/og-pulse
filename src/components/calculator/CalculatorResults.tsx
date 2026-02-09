import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/formatters';
import { CostBreakdown } from '@/lib/employeeCostCalculator';
import { NetSalaryBreakdown, PJ_SIMPLES_TAX_RATE } from '@/lib/netSalaryCalculator';
import { Building2, User, Briefcase } from 'lucide-react';

interface CalculatorResultsProps {
  cltCost: CostBreakdown;
  cltNetSalary: NetSalaryBreakdown;
  jornadaMensal: number;
  pjBase: 'total_cost' | 'gross_salary';
  setPjBase: (value: 'total_cost' | 'gross_salary') => void;
}

export function CalculatorResults({
  cltCost,
  cltNetSalary,
  jornadaMensal,
  pjBase,
  setPjBase,
}: CalculatorResultsProps) {
  // PJ equivalente baseado na seleção do usuário
  const pjEquivalentValue = pjBase === 'total_cost' 
    ? cltCost.totalMonthlyCost 
    : cltNetSalary.grossSalary;
  const pjEstimatedTax = pjEquivalentValue * PJ_SIMPLES_TAX_RATE;
  const pjNetEstimate = pjEquivalentValue - pjEstimatedTax;

  // Custo por hora
  const cltHourlyCost = jornadaMensal > 0 ? cltCost.totalMonthlyCost / jornadaMensal : 0;
  const pjHourlyCost = jornadaMensal > 0 ? pjEquivalentValue / jornadaMensal : 0;

  // Total recebido CLT = líquido + benefícios
  const totalRecebidoCLT = cltNetSalary.netSalary + cltCost.benefitsAmount;

  // Diferença de líquido (PJ vs CLT total recebido)
  const netDifference = pjNetEstimate - totalRecebidoCLT;
  const netDifferencePercent = totalRecebidoCLT > 0 
    ? ((netDifference / totalRecebidoCLT) * 100).toFixed(1) 
    : '0';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
      {/* Card 1 - Custo para a Empresa */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            1. Custo para a Empresa (CLT)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col space-y-4">
          <div className="space-y-4 text-sm">
            {/* Base */}
            <div className="flex justify-between py-1">
              <span>Base (Salário)</span>
              <span className="font-medium">{formatCurrency(cltCost.baseAmount)}</span>
            </div>

            {/* Encargos */}
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Encargos sobre Salário</h4>
              <div className="space-y-1 pl-2 border-l-2 border-border">
                <div className="flex justify-between py-1">
                  <span>FGTS (8%)</span>
                  <span>{formatCurrency(cltCost.details.fgts)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>INSS Patronal (20%)</span>
                  <span>{formatCurrency(cltCost.details.inss)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>RAT (2%)</span>
                  <span>{formatCurrency(cltCost.details.rat)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Terceiros (5,8%)</span>
                  <span>{formatCurrency(cltCost.details.terceiros)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Outros</span>
                  <span>{formatCurrency(cltCost.details.outros)}</span>
                </div>
              </div>
            </div>

            {/* Provisões */}
            <div>
              <h4 className="font-medium text-muted-foreground mb-2">Provisões</h4>
              <div className="space-y-1 pl-2 border-l-2 border-border">
                <div className="flex justify-between py-1">
                  <span>13º Salário (1/12)</span>
                  <span>{formatCurrency(cltCost.details.provisao13)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Férias Base (1/12)</span>
                  <span>{formatCurrency(cltCost.details.provisaoFeriasBase)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>1/3 de Férias</span>
                  <span>{formatCurrency(cltCost.details.provisaoFeriasTerco)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Encargos s/ 13º</span>
                  <span>{formatCurrency(cltCost.details.encargos13)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Encargos s/ Férias</span>
                  <span>{formatCurrency(cltCost.details.encargosFerias)}</span>
                </div>
              </div>
            </div>

            {/* Benefícios */}
            <div className="flex justify-between py-1">
              <span>Benefícios</span>
              <span className="font-medium">{formatCurrency(cltCost.benefitsAmount)}</span>
            </div>
          </div>

          {/* Total */}
          <div className="mt-auto p-4 rounded-lg bg-primary/10">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Custo Total Mensal</span>
              <span className="text-2xl font-bold text-foreground">
                {formatCurrency(cltCost.totalMonthlyCost)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground mt-1">
              <span>Custo/Hora</span>
              <span>{formatCurrency(cltHourlyCost)}/h</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 - Salário Líquido do Funcionário */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            2. Salário Líquido do Funcionário
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col space-y-4">
          {/* Cálculo do líquido */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1">
              <span>Salário Bruto</span>
              <span className="font-medium">{formatCurrency(cltNetSalary.grossSalary)}</span>
            </div>
            <div className="flex justify-between py-1 text-destructive">
              <span>(-) INSS</span>
              <span>- {formatCurrency(cltNetSalary.inss)}</span>
            </div>
            <div className="flex justify-between py-1 text-destructive">
              <span>(-) IRRF</span>
              <span>{cltNetSalary.irrf > 0 ? `- ${formatCurrency(cltNetSalary.irrf)}` : 'Isento'}</span>
            </div>
            <div className="flex justify-between py-2 font-semibold border-t">
              <span>Salário Líquido</span>
              <span>{formatCurrency(cltNetSalary.netSalary)}</span>
            </div>
          </div>

          {/* Total */}
          <div className="mt-auto p-4 rounded-lg bg-primary/10">
            <div className="flex justify-between text-sm">
              <span>(+) Benefícios</span>
              <span className="text-foreground">+ {formatCurrency(cltCost.benefitsAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-border">
              <span>Total Recebido</span>
              <span className="text-foreground">
                {formatCurrency(totalRecebidoCLT)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3 - Equivalente PJ */}
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5 text-primary" />
            3. Equivalente PJ (Simples Nacional)
          </CardTitle>
          <CardDescription>
            Valor de contrato PJ para comparação
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col space-y-4">
          {/* Seletor de base PJ */}
          <div className="space-y-3 text-sm">
            <p className="font-medium">Comparar com:</p>
            <RadioGroup 
              value={pjBase} 
              onValueChange={(value) => setPjBase(value as 'total_cost' | 'gross_salary')}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="total_cost" id="total_cost" />
                <Label htmlFor="total_cost" className="cursor-pointer text-sm">
                  Custo Total Empresa ({formatCurrency(cltCost.totalMonthlyCost)})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="gross_salary" id="gross_salary" />
                <Label htmlFor="gross_salary" className="cursor-pointer text-sm">
                  Salário Bruto ({formatCurrency(cltNetSalary.grossSalary)})
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Cálculo PJ */}
          <div className="space-y-2 pt-2 border-t text-sm">
            <div className="flex justify-between py-1">
              <span>Valor do Contrato</span>
              <span className="font-bold">{formatCurrency(pjEquivalentValue)}</span>
            </div>
            <div className="flex justify-between py-1 text-destructive">
              <span>(-) Impostos (~{(PJ_SIMPLES_TAX_RATE * 100).toFixed(0)}% Simples)</span>
              <span>- {formatCurrency(pjEstimatedTax)}</span>
            </div>
          </div>

          {/* Total */}
          <div className="mt-auto space-y-4">
            <div className="p-4 rounded-lg bg-primary/10">
              <div className="flex justify-between font-bold text-lg">
                <span>Líquido Estimado</span>
                <span className="text-foreground">
                  {formatCurrency(pjNetEstimate)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground mt-1">
                <span>Custo/Hora</span>
                <span>{formatCurrency(pjHourlyCost)}/h</span>
              </div>
            </div>

            {/* Comparativo */}
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm font-medium mb-2">Comparativo com CLT:</p>
              <div className="flex justify-between items-center">
                <span className="text-sm">Diferença no líquido</span>
                <span className={`font-bold ${netDifference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                  {netDifference >= 0 ? '+' : ''}{formatCurrency(netDifference)} ({netDifference >= 0 ? '+' : ''}{netDifferencePercent}%)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
