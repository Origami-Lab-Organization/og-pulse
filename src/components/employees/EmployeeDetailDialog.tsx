import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, formatDate, formatPercent, parseDateString } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { CONTRACT_TYPE_LABELS, type ContractType, type EmployeeStatus } from '@/types/employee';
import type { PayrollAnalysisRow } from '@/lib/payrollAnalysis';
import { EmployeeStatusBadge } from '@/components/employees/EmployeeStatusBadge';
import { User } from 'lucide-react';

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

/** "X anos e Y meses" entre a admissão e hoje — null se não há data de admissão. */
function tenureLabel(admissionDateStr: string | null): string | null {
  if (!admissionDateStr) return null;
  const admission = parseDateString(admissionDateStr);
  const now = new Date();
  if (admission > now || isNaN(admission.getTime())) return null;

  let years = now.getFullYear() - admission.getFullYear();
  let months = now.getMonth() - admission.getMonth();
  if (now.getDate() < admission.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years > 1 ? 'anos' : 'ano'}`);
  if (months > 0 || years === 0) parts.push(`${months} ${months === 1 ? 'mês' : 'meses'}`);
  return parts.join(' e ');
}

// Rótulo da Remuneração varia por tipo de contratação — mesma origem em employeeCostCalculator.ts.
const REMUNERACAO_LABELS: Record<ContractType, string> = {
  SOCIO: 'Pró-labore',
  PJ: 'Valor do contrato',
  ESTAGIO: 'Bolsa auxílio',
  CLT: 'Salário',
  MENOR_APRENDIZ: 'Salário',
};

function encargosEmptyNote(tipo: ContractType): string | null {
  if (tipo === 'SOCIO') return 'Retirada de sócio — sem encargos trabalhistas incidentes.';
  if (tipo === 'PJ') return 'Prestador PJ — sem encargos trabalhistas incidentes.';
  return null;
}

function provisoesEmptyNote(tipo: ContractType): string | null {
  if (tipo === 'SOCIO') return 'Retirada de sócio — sem 13º ou férias a provisionar.';
  if (tipo === 'PJ') return 'Prestador PJ — sem 13º ou férias a provisionar.';
  return null;
}

function LineItem({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 text-xs text-muted-foreground', muted && 'italic text-muted-foreground/80')}>
      <span className="min-w-0 flex-1 truncate pl-3.5" title={label}>{label}</span>
      <span className="tabular-nums shrink-0 font-mono">{formatCurrency(value)}</span>
    </div>
  );
}

function CategoryHeader({ colorClass, label, value }: { colorClass: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <span className={cn('h-2 w-2 shrink-0 rounded-sm', colorClass)} />
        {label}
      </span>
      <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">{formatCurrency(value)}</span>
    </div>
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
  const tenure = tenureLabel(row.dataAdmissao);

  // Aviso prévio/multa FGTS (só regime de competência) não pertencem a nenhuma das 5 categorias
  // por definição — encaixados em Remuneração/Encargos para a composição continuar somando ao total.
  const remuneracaoTotal = row.baseAmount + row.terminationAvisoPrevioAmount;
  const encargosTotal = row.fgtsAmount + row.inssPatronalAmount + row.outrosEncargosAmount + row.terminationMultaFgtsAmount;
  const provisoesTotal = row.provisionsAmount;

  // Ordem e cores idênticas às já usadas em PayrollEvolutionChart.tsx (mesma fonte de dados) —
  // não é 1,2,3,4,5 sequencial de propósito, é a convenção já estabelecida no app.
  const composition = [
    { key: 'remuneracao', label: 'Remuneração', colorClass: 'bg-chart-1', total: remuneracaoTotal },
    { key: 'encargos', label: 'Encargos', colorClass: 'bg-chart-2', total: encargosTotal },
    { key: 'beneficios', label: 'Benefícios', colorClass: 'bg-chart-4', total: row.benefitsAmount },
    { key: 'ferramentas', label: 'Ferramentas', colorClass: 'bg-chart-5', total: row.toolsAmount },
    { key: 'provisoes', label: 'Provisões', colorClass: 'bg-chart-3', total: provisoesTotal },
  ];

  const inssRetidoRegular =
    row.inssFuncionario - row.rescissionInssRetidoSaldoAmount - row.rescissionInssRetidoDecimoTerceiroAmount;
  const hasEncargosItems =
    row.fgtsAmount !== 0 || row.inssPatronalAmount !== 0 || row.outrosEncargosAmount !== 0 || row.terminationMultaFgtsAmount !== 0;
  const hasInssInformativo =
    inssRetidoRegular !== 0 || row.rescissionInssRetidoSaldoAmount !== 0 || row.rescissionInssRetidoDecimoTerceiroAmount !== 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl">{row.nome}</span>
            <Badge variant="outline">{row.cargo}</Badge>
            <Badge variant="secondary">{CONTRACT_TYPE_LABELS[row.tipoContratacao]}</Badge>
            <EmployeeStatusBadge status={row.status as EmployeeStatus} />
          </DialogTitle>
        </DialogHeader>

        <div className="-mt-2 flex flex-wrap gap-x-6 gap-y-2">
          {row.dataAdmissao && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Admissão</p>
              <p className="text-sm font-medium">{formatDate(row.dataAdmissao)}</p>
            </div>
          )}
          {tenure && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Tempo de casa</p>
              <p className="text-sm font-medium">{tenure}</p>
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Referência</p>
            <p className="text-sm font-medium">{monthLabel} · {showHourlyCost ? 'competência' : 'caixa'}</p>
          </div>
          {showHourlyCost && (
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Custo/Hora</p>
              <p className="text-sm font-medium">{formatCurrency(row.hourlyCost)} ({row.hoursWorked.toFixed(0)}h)</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[220px_1fr]">
          <Card>
            <CardContent className="pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Composição do Custo
              </p>
              <div className="flex h-56 gap-3">
                {/* Barra: altura fixa (h-56), cada segmento com flexGrow proporcional ao valor
                    (piso min-h-9 só pra segmento zerado não desaparecer). Legenda: solta da
                    barra, só distribuída igualmente no mesmo espaço vertical via justify-between
                    — não precisa mais bater linha por linha com o segmento correspondente. */}
                <div className="flex w-3 shrink-0 flex-col overflow-hidden rounded-full bg-muted">
                  {composition.map((c) => (
                    <div
                      key={c.key}
                      className={cn('min-h-9', c.total > 0 && c.colorClass)}
                      style={{ flexGrow: Math.max(c.total, 0), flexBasis: 0 }}
                    />
                  ))}
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  {composition.map((c) => (
                    <div key={c.key}>
                      <div className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                        <span className={cn('h-2 w-2 shrink-0 rounded-sm', c.colorClass)} />
                        {c.label}
                      </div>
                      <div className="flex items-baseline gap-2 pl-3.5">
                        <span className="font-mono text-sm font-semibold tabular-nums">{formatCurrency(c.total)}</span>
                        <span className="text-xs text-muted-foreground">
                          {c.total !== 0 && row.totalMonthlyCost !== 0
                            ? formatPercent((c.total / row.totalMonthlyCost) * 100)
                            : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 border-t pt-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Custo Total do Mês</p>
                <p className="font-mono text-xl font-bold tabular-nums text-primary">
                  {formatCurrency(row.totalMonthlyCost)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Lançamento</span>
                <span>Valor</span>
              </div>
              <div className="divide-y px-4">
                <div className="py-3">
                  <CategoryHeader colorClass="bg-chart-1" label="Remuneração" value={remuneracaoTotal} />
                  <div className="mt-1 space-y-0.5">
                    {row.baseAmount - row.rescissionBaseAmount !== 0 && (
                      <LineItem
                        label={REMUNERACAO_LABELS[row.tipoContratacao]}
                        value={row.baseAmount - row.rescissionBaseAmount}
                      />
                    )}
                    {row.rescissionBaseAmount !== 0 && (
                      <LineItem label={`Rescisão (${terminationDayLabel})`} value={row.rescissionBaseAmount} />
                    )}
                    {row.terminationAvisoPrevioAmount !== 0 && (
                      <LineItem
                        label={row.terminationAvisoPrevioAmount > 0 ? 'Aviso prévio indenizado' : 'Aviso prévio (desconto)'}
                        value={row.terminationAvisoPrevioAmount}
                      />
                    )}
                  </div>
                </div>

                <div className="py-3">
                  <CategoryHeader colorClass="bg-chart-2" label="Encargos Patronais" value={encargosTotal} />
                  {hasEncargosItems ? (
                    <div className="mt-1 space-y-0.5">
                      {row.fgtsAmount - row.rescissionChargesAmount !== 0 && (
                        <LineItem label="FGTS" value={row.fgtsAmount - row.rescissionChargesAmount} />
                      )}
                      {row.rescissionChargesAmount !== 0 && (
                        <LineItem label={`FGTS s/ saldo, rescisão (${terminationDayLabel})`} value={row.rescissionChargesAmount} />
                      )}
                      {row.inssPatronalAmount !== 0 && (
                        <LineItem label="INSS Patronal" value={row.inssPatronalAmount} />
                      )}
                      {row.outrosEncargosAmount !== 0 && (
                        <LineItem label="RAT/Terceiros/Outros" value={row.outrosEncargosAmount} />
                      )}
                      {row.terminationMultaFgtsAmount !== 0 && (
                        <LineItem label="Multa FGTS" value={row.terminationMultaFgtsAmount} />
                      )}
                    </div>
                  ) : (
                    encargosEmptyNote(row.tipoContratacao) && (
                      <p className="mt-1 pl-3.5 text-xs italic text-muted-foreground">
                        {encargosEmptyNote(row.tipoContratacao)}
                      </p>
                    )
                  )}
                  {hasInssInformativo && (
                    <div className={cn('space-y-0.5', hasEncargosItems && 'mt-1.5 border-t pt-1.5')}>
                      {inssRetidoRegular !== 0 && (
                        <LineItem label="INSS retido (informativo)" value={inssRetidoRegular} muted />
                      )}
                      {row.rescissionInssRetidoSaldoAmount !== 0 && (
                        <LineItem
                          label={`INSS s/ saldo, rescisão (${terminationDayLabel}) — informativo`}
                          value={row.rescissionInssRetidoSaldoAmount}
                          muted
                        />
                      )}
                      {row.rescissionInssRetidoDecimoTerceiroAmount !== 0 && (
                        <LineItem
                          label={`INSS s/ 13º, rescisão (${terminationDayLabel}) — informativo`}
                          value={row.rescissionInssRetidoDecimoTerceiroAmount}
                          muted
                        />
                      )}
                    </div>
                  )}
                </div>

                <div className="py-3">
                  <CategoryHeader colorClass="bg-chart-4" label="Benefícios" value={row.benefitsAmount} />
                  {row.benefitsBreakdown.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {row.benefitsBreakdown.map((item) => (
                        <LineItem key={item.name} label={item.name} value={item.value} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="py-3">
                  <CategoryHeader colorClass="bg-chart-5" label="Ferramentas" value={row.toolsAmount} />
                  {row.toolsBreakdown.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {row.toolsBreakdown.map((item) => (
                        <LineItem key={item.name} label={item.name} value={item.value} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="py-3">
                  <CategoryHeader colorClass="bg-chart-3" label="Provisões (13º/Férias + Encargos)" value={provisoesTotal} />
                  {provisoesTotal !== 0 ? (
                    <div className="mt-1 space-y-0.5">
                      {row.provisao13Amount - row.rescissionProvisao13Amount !== 0 && (
                        <LineItem label="13º salário" value={row.provisao13Amount - row.rescissionProvisao13Amount} />
                      )}
                      {row.rescissionProvisao13Amount !== 0 && (
                        <LineItem label={`13º rescisão (${terminationDayLabel})`} value={row.rescissionProvisao13Amount} />
                      )}
                      {row.provisaoFeriasAmount - row.rescissionProvisaoFeriasAmount !== 0 && (
                        <LineItem label="Férias + 1/3" value={row.provisaoFeriasAmount - row.rescissionProvisaoFeriasAmount} />
                      )}
                      {row.rescissionProvisaoFeriasAmount !== 0 && (
                        <LineItem label={`Férias rescisão (${terminationDayLabel})`} value={row.rescissionProvisaoFeriasAmount} />
                      )}
                      {row.provisaoRecessoAmount - row.rescissionProvisaoRecessoAmount !== 0 && (
                        <LineItem
                          label="Recesso remunerado"
                          value={row.provisaoRecessoAmount - row.rescissionProvisaoRecessoAmount}
                        />
                      )}
                      {row.rescissionProvisaoRecessoAmount !== 0 && (
                        <LineItem label={`Recesso rescisão (${terminationDayLabel})`} value={row.rescissionProvisaoRecessoAmount} />
                      )}
                      {row.encargosSobreProvisoesAmount - row.rescissionEncargosSobreProvisoesAmount !== 0 && (
                        <LineItem
                          label="Encargos sobre as provisões"
                          value={row.encargosSobreProvisoesAmount - row.rescissionEncargosSobreProvisoesAmount}
                        />
                      )}
                      {row.rescissionEncargosSobreProvisoesAmount !== 0 && (
                        <LineItem
                          label={`Encargos s/ provisões, rescisão (${terminationDayLabel})`}
                          value={row.rescissionEncargosSobreProvisoesAmount}
                        />
                      )}
                    </div>
                  ) : (
                    provisoesEmptyNote(row.tipoContratacao) && (
                      <p className="mt-1 pl-3.5 text-xs italic text-muted-foreground">
                        {provisoesEmptyNote(row.tipoContratacao)}
                      </p>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
