import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { CostBreakdown } from '@/lib/employeeCostCalculator';
import { NetSalaryBreakdown, DEPENDENT_DEDUCTION } from '@/lib/netSalaryCalculator';
import { useState } from 'react';

interface CalculatorBreakdownProps {
  cltCost: CostBreakdown;
  cltNetSalary: NetSalaryBreakdown;
}

export function CalculatorBreakdown({ cltCost, cltNetSalary }: CalculatorBreakdownProps) {
  const [isOpenCost, setIsOpenCost] = useState(false);
  const [isOpenNet, setIsOpenNet] = useState(false);

  return (
    <div className="space-y-4">
      {/* Detalhamento Custo Empresa */}
      <Collapsible open={isOpenCost} onOpenChange={setIsOpenCost}>
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <CardTitle className="text-base">Detalhamento do Custo Empresa (CLT)</CardTitle>
                {isOpenCost ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Base */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Base</h4>
                  <div className="flex justify-between py-1">
                    <span>Salário Bruto</span>
                    <span className="font-medium">{formatCurrency(cltCost.baseAmount)}</span>
                  </div>
                </div>

                {/* Encargos */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Encargos</h4>
                  <div className="space-y-1 text-sm">
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
                    <div className="flex justify-between py-1 border-t pt-2 font-medium">
                      <span>Subtotal Encargos s/ Salário</span>
                      <span>
                        {formatCurrency(
                          cltCost.details.fgts +
                          cltCost.details.inss +
                          cltCost.details.rat +
                          cltCost.details.terceiros +
                          cltCost.details.outros
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Provisões */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Provisões</h4>
                  <div className="space-y-1 text-sm">
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
                    <div className="flex justify-between py-1 border-t pt-2 font-medium">
                      <span>Subtotal Provisões</span>
                      <span>{formatCurrency(cltCost.provisionsAmount)}</span>
                    </div>
                  </div>
                </div>

                {/* Encargos sobre Provisões */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Encargos sobre Provisões</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between py-1">
                      <span>Encargos s/ 13º</span>
                      <span>{formatCurrency(cltCost.details.encargos13)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>Encargos s/ Férias + 1/3</span>
                      <span>{formatCurrency(cltCost.details.encargosFerias)}</span>
                    </div>
                  </div>
                </div>

                {/* Benefícios */}
                {cltCost.benefitsAmount > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2">Benefícios</h4>
                    <div className="flex justify-between py-1">
                      <span>Total Benefícios</span>
                      <span className="font-medium">{formatCurrency(cltCost.benefitsAmount)}</span>
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="pt-2 border-t-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Custo Total Mensal</span>
                    <span className="text-primary">{formatCurrency(cltCost.totalMonthlyCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>Custo Anual Estimado</span>
                    <span>{formatCurrency(cltCost.totalAnnualCost)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Detalhamento Salário Líquido */}
      <Collapsible open={isOpenNet} onOpenChange={setIsOpenNet}>
        <Card>
          <CardHeader className="pb-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <CardTitle className="text-base">Detalhamento do Salário Líquido</CardTitle>
                {isOpenNet ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Salário Bruto */}
                <div className="flex justify-between py-1 border-b">
                  <span className="font-medium">Salário Bruto</span>
                  <span className="font-medium">{formatCurrency(cltNetSalary.grossSalary)}</span>
                </div>

                {/* INSS */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">INSS do Empregado (Progressivo)</h4>
                  <div className="space-y-1 text-sm">
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
                    <div className="flex justify-between py-1 border-t pt-2 font-medium">
                      <span>Total INSS</span>
                      <span className="text-destructive">- {formatCurrency(cltNetSalary.inss)}</span>
                    </div>
                  </div>
                </div>

                {/* IRRF */}
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">IRRF</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between py-1">
                      <span>Base de Cálculo (Bruto - INSS - Depend.)</span>
                      <span>{formatCurrency(cltNetSalary.irrfBase)}</span>
                    </div>
                    {cltNetSalary.dependentsDeduction > 0 && (
                      <div className="flex justify-between py-1 text-muted-foreground">
                        <span>Dedução por Dependentes</span>
                        <span>- {formatCurrency(cltNetSalary.dependentsDeduction)} ({Math.round(cltNetSalary.dependentsDeduction / DEPENDENT_DEDUCTION)} dep.)</span>
                      </div>
                    )}
                    {cltNetSalary.irrfBracket && cltNetSalary.irrfBracket.rate > 0 && (
                      <div className="flex justify-between py-1 text-muted-foreground">
                        <span>Alíquota Aplicada</span>
                        <span>{(cltNetSalary.irrfBracket.rate * 100).toFixed(1)}% (dedução {formatCurrency(cltNetSalary.irrfBracket.deduction)})</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-t pt-2 font-medium">
                      <span>Total IRRF</span>
                      <span className="text-destructive">
                        {cltNetSalary.irrf > 0 ? `- ${formatCurrency(cltNetSalary.irrf)}` : 'Isento'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total Líquido */}
                <div className="pt-2 border-t-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Salário Líquido</span>
                    <span className="text-primary">{formatCurrency(cltNetSalary.netSalary)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
