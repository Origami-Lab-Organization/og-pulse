import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, parseDateString } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { CONTRACT_TYPE_LABELS } from '@/types/employee';
import type { PayrollAnalysisRow } from '@/lib/payrollAnalysis';
import {
  User,
  Banknote,
  Landmark,
  Gift,
  Wrench,
  PiggyBank,
  Clock,
} from 'lucide-react';

interface EmployeeDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: PayrollAnalysisRow | null;
  monthLabel: string;
  /** Custo/Hora é um conceito de regime de competência — oculto para a Folha de Pagamento (regime de caixa), onde hoursWorked/hourlyCost são sempre 0. */
  showHourlyCost?: boolean;
}

function dayMonth(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function BreakdownLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <span className="min-w-0 flex-1 truncate" title={label}>{label}</span>
      <span className="tabular-nums shrink-0">{formatCurrency(value)}</span>
    </div>
  );
}

/**
 * Divide uma linha em mês anterior (regular, sem data — é sempre o mês cheio) e rescisão
 * (com o dia do desligamento) — regime de caixa mistura os dois no mesmo total. Mostra uma
 * única linha, como antes, quando não há rescisão.
 */
function SplittableLine({
  label,
  total,
  rescissionValue,
  rescissionLabel,
}: {
  label: string;
  total: number;
  rescissionValue: number;
  rescissionLabel: string;
}) {
  if (rescissionValue === 0) return <BreakdownLine label={label} value={total} />;
  return (
    <>
      <BreakdownLine label={label} value={total - rescissionValue} />
      <BreakdownLine label={rescissionLabel} value={rescissionValue} />
    </>
  );
}

/**
 * Detalhamento de custo do colaborador no mês selecionado — recebe a linha já calculada
 * (`PayrollAnalysisRow`) em vez de recalcular por conta própria, para nunca divergir do
 * valor mostrado na tabela do relatório (Custo x Hora ou Folha de Pagamento).
 */
export function EmployeeDetailDialog({
  open,
  onOpenChange,
  row,
  monthLabel,
  showHourlyCost = true,
}: EmployeeDetailDialogProps) {
  if (!row) return null;

  const terminationDateObj = row.terminationDate ? parseDateString(row.terminationDate) : null;
  const terminationDayLabel = terminationDateObj ? dayMonth(terminationDateObj) : '';
  const rescissionLabel = `Rescisão (${terminationDayLabel})`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="text-xl">{row.nome}</span>
              <Badge variant="outline" className="ml-2">{row.cargo}</Badge>
              <Badge variant="secondary" className="ml-2">{CONTRACT_TYPE_LABELS[row.tipoContratacao]}</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">Custo de {monthLabel}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Salário Base</p>
                  <p className="font-medium text-lg">{formatCurrency(row.baseAmount)}</p>
                  {row.rescissionBaseAmount !== 0 && (
                    <div className="mt-1 space-y-0.5">
                      <SplittableLine
                        label="Salário"
                        total={row.baseAmount}
                        rescissionValue={row.rescissionBaseAmount}
                        rescissionLabel={rescissionLabel}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Encargos</p>
                  <p className="font-medium text-lg">
                    {formatCurrency(row.fgtsAmount + row.inssPatronalAmount + row.outrosEncargosAmount)}
                  </p>
                  <div className="mt-1 space-y-0.5">
                    <SplittableLine
                      label="FGTS"
                      total={row.fgtsAmount}
                      rescissionValue={row.rescissionChargesAmount}
                      rescissionLabel={`FGTS rescisão (${terminationDayLabel})`}
                    />
                    <BreakdownLine label="INSS Patronal" value={row.inssPatronalAmount} />
                    {row.outrosEncargosAmount !== 0 && (
                      <BreakdownLine label="RAT/Terceiros/Outros" value={row.outrosEncargosAmount} />
                    )}
                  </div>
                  {row.inssFuncionario !== 0 && (
                    <div className="mt-1.5 pt-1.5 border-t space-y-0.5 italic text-muted-foreground/80">
                      <SplittableLine
                        label="INSS retido (informativo)"
                        total={row.inssFuncionario}
                        rescissionValue={row.rescissionInssFuncionarioAmount}
                        rescissionLabel={`INSS retido rescisão, informativo (${terminationDayLabel})`}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Gift className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Benefícios</p>
                  <p className="font-medium text-lg">{formatCurrency(row.benefitsAmount)}</p>
                  {row.benefitsBreakdown.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {row.benefitsBreakdown.map((item) => (
                        <BreakdownLine key={item.name} label={item.name} value={item.value} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">Ferramentas</p>
                  <p className="font-medium text-lg">{formatCurrency(row.toolsAmount)}</p>
                  {row.toolsBreakdown.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {row.toolsBreakdown.map((item) => (
                        <BreakdownLine key={item.name} label={item.name} value={item.value} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <PiggyBank className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground">
                    Provisões (13º/férias + encargos sobre as provisões)
                  </p>
                  <p className="font-medium text-lg">{formatCurrency(row.provisionsAmount)}</p>
                  <div className="mt-1 space-y-0.5">
                    {row.provisao13Amount !== 0 && (
                      <SplittableLine
                        label="13º salário"
                        total={row.provisao13Amount}
                        rescissionValue={row.rescissionProvisao13Amount}
                        rescissionLabel={`13º salário rescisão (${terminationDayLabel})`}
                      />
                    )}
                    {row.provisaoFeriasAmount !== 0 && (
                      <SplittableLine
                        label="Férias + 1/3"
                        total={row.provisaoFeriasAmount}
                        rescissionValue={row.rescissionProvisaoFeriasAmount}
                        rescissionLabel={`Férias + 1/3 rescisão (${terminationDayLabel})`}
                      />
                    )}
                    {row.provisaoRecessoAmount !== 0 && (
                      <SplittableLine
                        label="Recesso remunerado"
                        total={row.provisaoRecessoAmount}
                        rescissionValue={row.rescissionProvisaoRecessoAmount}
                        rescissionLabel={`Recesso remunerado rescisão (${terminationDayLabel})`}
                      />
                    )}
                    {row.encargosSobreProvisoesAmount !== 0 && (
                      <SplittableLine
                        label="Encargos sobre as provisões"
                        total={row.encargosSobreProvisoesAmount}
                        rescissionValue={row.rescissionEncargosSobreProvisoesAmount}
                        rescissionLabel={`Encargos sobre as provisões rescisão (${terminationDayLabel})`}
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {(row.terminationAvisoPrevioAmount !== 0 || row.terminationMultaFgtsAmount !== 0) && (
            <Card className="sm:col-span-2">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Landmark className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-muted-foreground">
                      Verbas rescisórias — {rescissionLabel}
                    </p>
                    <p className="font-medium text-lg">
                      {formatCurrency(row.terminationAvisoPrevioAmount + row.terminationMultaFgtsAmount)}
                    </p>
                    <div className="mt-1 space-y-0.5">
                      {row.terminationAvisoPrevioAmount !== 0 && (
                        <BreakdownLine
                          label={row.terminationAvisoPrevioAmount > 0 ? 'Aviso prévio indenizado' : 'Aviso prévio (desconto)'}
                          value={row.terminationAvisoPrevioAmount}
                        />
                      )}
                      {row.terminationMultaFgtsAmount !== 0 && (
                        <BreakdownLine label="Multa FGTS" value={row.terminationMultaFgtsAmount} />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className={cn('bg-primary/5 border-primary/20', !showHourlyCost && 'sm:col-span-2')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Custo Total do Mês</p>
                  <p className="font-bold text-xl text-primary">{formatCurrency(row.totalMonthlyCost)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {showHourlyCost && (
            <Card className="bg-secondary/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Custo/Hora</p>
                    <p className="font-bold text-xl">{formatCurrency(row.hourlyCost)}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.hoursWorked.toFixed(0)}h úteis trabalhadas no mês
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
