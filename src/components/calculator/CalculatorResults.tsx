import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { CostBreakdown } from '@/lib/employeeCostCalculator';
import { NetSalaryBreakdown, PJ_SIMPLES_TAX_RATE, DEPENDENT_DEDUCTION } from '@/lib/netSalaryCalculator';
import { Building2, User, Briefcase, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

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
  const [isOpenCost, setIsOpenCost] = useState(false);
  const [isOpenNet, setIsOpenNet] = useState(false);

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Card 1 - Custo para a Empresa */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            1. Custo para a Empresa (CLT)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Grid com os 4 componentes de custo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">Base</p>
              <p className="font-bold">{formatCurrency(cltCost.baseAmount)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">Encargos</p>
              <p className="font-bold">{formatCurrency(cltCost.chargesAmount)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">Provisões</p>
              <p className="font-bold">{formatCurrency(cltCost.provisionsAmount)}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">Benefícios</p>
              <p className="font-bold">{formatCurrency(cltCost.benefitsAmount)}</p>
            </div>
          </div>

          {/* Total e Custo/Hora */}
          <div className="p-4 rounded-lg bg-muted">
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

          {/* Collapsible detalhamento */}
          <Collapsible open={isOpenCost} onOpenChange={setIsOpenCost}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent text-sm">
                <span className="text-muted-foreground">Ver detalhamento</span>
                {isOpenCost ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="space-y-4 text-sm">
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
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Card 2 - Salário Líquido do Funcionário */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            2. Salário Líquido do Funcionário
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cálculo do líquido */}
          <div className="space-y-2">
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

          {/* Benefícios e Total Recebido */}
          <div className="p-4 rounded-lg bg-muted">
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

          {/* Collapsible detalhamento INSS/IRRF */}
          <Collapsible open={isOpenNet} onOpenChange={setIsOpenNet}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent text-sm">
                <span className="text-muted-foreground">Ver detalhamento dos descontos</span>
                {isOpenNet ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4">
              <div className="space-y-4 text-sm">
                {/* INSS */}
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2">INSS do Empregado (Progressivo)</h4>
                  <div className="space-y-1 pl-2 border-l-2 border-border">
                    {cltNetSalary.inssBreakdown.bracket1 > 0 && (
                      <div className="flex justify-between py-1">
                        <span>Faixa 1 (até R$ 1.412 - 7,5%)</span>
                        <span className="text-destructive">- {formatCurrency(cltNetSalary.inssBreakdown.bracket1)}</span>
                      </div>
                    )}
                    {cltNetSalary.inssBreakdown.bracket2 > 0 && (
                      <div className="flex justify-between py-1">
                        <span>Faixa 2 (até R$ 2.666 - 9%)</span>
                        <span className="text-destructive">- {formatCurrency(cltNetSalary.inssBreakdown.bracket2)}</span>
                      </div>
                    )}
                    {cltNetSalary.inssBreakdown.bracket3 > 0 && (
                      <div className="flex justify-between py-1">
                        <span>Faixa 3 (até R$ 4.000 - 12%)</span>
                        <span className="text-destructive">- {formatCurrency(cltNetSalary.inssBreakdown.bracket3)}</span>
                      </div>
                    )}
                    {cltNetSalary.inssBreakdown.bracket4 > 0 && (
                      <div className="flex justify-between py-1">
                        <span>Faixa 4 (até R$ 7.786 - 14%)</span>
                        <span className="text-destructive">- {formatCurrency(cltNetSalary.inssBreakdown.bracket4)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* IRRF */}
                <div>
                  <h4 className="font-medium text-muted-foreground mb-2">IRRF</h4>
                  <div className="space-y-1 pl-2 border-l-2 border-border">
                    <div className="flex justify-between py-1">
                      <span>Base de Cálculo</span>
                      <span>{formatCurrency(cltNetSalary.irrfBase)}</span>
                    </div>
                    {cltNetSalary.dependentsDeduction > 0 && (
                      <div className="flex justify-between py-1 text-muted-foreground">
                        <span>Dedução Dependentes</span>
                        <span>- {formatCurrency(cltNetSalary.dependentsDeduction)} ({Math.round(cltNetSalary.dependentsDeduction / DEPENDENT_DEDUCTION)} dep.)</span>
                      </div>
                    )}
                    {cltNetSalary.irrfBracket && cltNetSalary.irrfBracket.rate > 0 && (
                      <div className="flex justify-between py-1 text-muted-foreground">
                        <span>Alíquota</span>
                        <span>{(cltNetSalary.irrfBracket.rate * 100).toFixed(1)}% (ded. {formatCurrency(cltNetSalary.irrfBracket.deduction)})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Card 3 - Equivalente PJ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5 text-primary" />
            3. Equivalente PJ (Simples Nacional)
          </CardTitle>
          <CardDescription>
            Valor de contrato PJ para comparação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de base PJ */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Comparar com:</p>
            <RadioGroup 
              value={pjBase} 
              onValueChange={(value) => setPjBase(value as 'total_cost' | 'gross_salary')}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="total_cost" id="total_cost" />
                <Label htmlFor="total_cost" className="cursor-pointer">
                  Custo Total Empresa ({formatCurrency(cltCost.totalMonthlyCost)})
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="gross_salary" id="gross_salary" />
                <Label htmlFor="gross_salary" className="cursor-pointer">
                  Salário Bruto ({formatCurrency(cltNetSalary.grossSalary)})
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Cálculo PJ */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between py-1">
              <span>Valor do Contrato</span>
              <span className="font-bold">{formatCurrency(pjEquivalentValue)}</span>
            </div>
            <div className="flex justify-between py-1 text-destructive">
              <span>(-) Impostos (~{(PJ_SIMPLES_TAX_RATE * 100).toFixed(0)}% Simples)</span>
              <span>- {formatCurrency(pjEstimatedTax)}</span>
            </div>
            <div className="flex justify-between py-2 font-bold text-lg border-t">
              <span>Líquido Estimado</span>
              <span className="text-foreground">
                {formatCurrency(pjNetEstimate)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
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

          {/* Aviso */}
          <div className="p-3 rounded-lg border bg-muted/50">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Importante:</p>
                <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                  <li>PJ não tem FGTS, 13º, férias remuneradas</li>
                  <li>Alíquota de 6% é estimativa (varia por anexo/faturamento)</li>
                  <li>PJ deve arcar com contador e obrigações fiscais</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
