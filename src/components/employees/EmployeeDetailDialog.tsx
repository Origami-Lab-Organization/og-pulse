import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
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
}

/**
 * Detalhamento de custo do colaborador no mês selecionado do relatório Custo x Hora —
 * recebe a linha já calculada (`PayrollAnalysisRow`) em vez de recalcular por conta
 * própria, para nunca divergir do valor mostrado na tabela do relatório.
 */
export function EmployeeDetailDialog({
  open,
  onOpenChange,
  row,
  monthLabel,
}: EmployeeDetailDialogProps) {
  if (!row) return null;

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
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Salário Base</p>
                  <p className="font-medium text-lg">{formatCurrency(row.baseAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Landmark className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">FGTS + INSS Patronal</p>
                  <p className="font-medium text-lg">
                    {formatCurrency(row.fgtsAmount + row.inssPatronalAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Gift className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Benefícios</p>
                  <p className="font-medium text-lg">{formatCurrency(row.benefitsAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Ferramentas</p>
                  <p className="font-medium text-lg">{formatCurrency(row.toolsAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">
                    Provisões (13º/férias + encargos sobre as provisões)
                  </p>
                  <p className="font-medium text-lg">{formatCurrency(row.provisionsAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="bg-primary/5 border-primary/20">
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
        </div>

        <p className="text-xs text-muted-foreground text-center">
          INSS retido do colaborador: {formatCurrency(row.inssFuncionario)} — informativo, já incluído no Salário
          Base, não é custo adicional da empresa.
        </p>
      </DialogContent>
    </Dialog>
  );
}
