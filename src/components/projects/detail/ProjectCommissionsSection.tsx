import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Check, Clock, Percent } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProjectInstallmentDB, INSTALLMENT_STATUS_LABELS } from '@/types/project';
import { ProjectCommission, useUpdateCommission, useGenerateCommissions } from '@/hooks/useProjectCommissions';

interface ProjectCommissionsSectionProps {
  projectId: string;
  commissions: ProjectCommission[];
  installments: ProjectInstallmentDB[];
  budget: { commission_percent: number; final_total: number } | null;
  isEditable: boolean;
}

export function ProjectCommissionsSection({
  projectId,
  commissions,
  installments,
  budget,
  isEditable,
}: ProjectCommissionsSectionProps) {
  const updateCommission = useUpdateCommission();
  const generateCommissions = useGenerateCommissions();
  const [payDialog, setPayDialog] = useState<ProjectCommission | null>(null);
  const [paidTo, setPaidTo] = useState('');
  const [paidDate, setPaidDate] = useState('');

  const totalCommission = budget ? (budget.commission_percent / 100) * budget.final_total : 0;
  const hasCommission = totalCommission > 0;
  const needsGeneration = hasCommission && commissions.length === 0 && installments.length > 0;

  // Map installment_id → commission
  const commissionMap = useMemo(() => {
    const map = new Map<string, ProjectCommission>();
    commissions.forEach((c) => map.set(c.installment_id, c));
    return map;
  }, [commissions]);

  const handleGenerate = () => {
    generateCommissions.mutate({
      projectId,
      installments: installments.map((i) => ({ id: i.id })),
      totalCommission,
    });
  };

  const handleOpenPay = (commission: ProjectCommission) => {
    setPaidTo(commission.paid_to || '');
    setPaidDate(commission.paid_date || format(new Date(), 'yyyy-MM-dd'));
    setPayDialog(commission);
  };

  const handleConfirmPay = () => {
    if (!payDialog) return;
    updateCommission.mutate({
      id: payDialog.id,
      is_paid: true,
      paid_date: paidDate || null,
      paid_to: paidTo || null,
    });
    setPayDialog(null);
  };

  const handleUnpay = (commission: ProjectCommission) => {
    updateCommission.mutate({
      id: commission.id,
      is_paid: false,
      paid_date: null,
      paid_to: null,
    });
  };

  if (!hasCommission) return null;

  const totalPlanned = commissions.reduce((s, c) => s + Number(c.planned_value), 0);
  const totalPaid = commissions.filter((c) => c.is_paid).reduce((s, c) => s + Number(c.planned_value), 0);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Comissões
          </CardTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>Planejado: {formatCurrency(totalPlanned || totalCommission)}</span>
            <span>Pago: {formatCurrency(totalPaid)}</span>
          </div>
        </CardHeader>
        <CardContent>
          {needsGeneration ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-muted-foreground">
                Comissão de {budget!.commission_percent}% ({formatCurrency(totalCommission)}) ainda não foi distribuída pelas parcelas.
              </p>
              <Button onClick={handleGenerate} disabled={generateCommissions.isPending} size="sm">
                Gerar Comissões
              </Button>
            </div>
          ) : commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma parcela cadastrada para gerar comissões.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Valor Parcela</TableHead>
                    <TableHead>Status Parcela</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Pago?</TableHead>
                    <TableHead>Pago a</TableHead>
                    <TableHead>Data Pgto</TableHead>
                    {isEditable && <TableHead className="w-[100px]">Ação</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map((inst) => {
                    const commission = commissionMap.get(inst.id);
                    if (!commission) return null;
                    const canPay = inst.status === 'received' && !commission.is_paid;

                    return (
                      <TableRow key={inst.id}>
                        <TableCell className="font-medium">#{inst.installment_number}</TableCell>
                        <TableCell>{formatCurrency(inst.value)}</TableCell>
                        <TableCell>
                          <Badge variant={inst.status === 'received' ? 'default' : 'secondary'} className="text-xs">
                            {INSTALLMENT_STATUS_LABELS[inst.status] || inst.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(commission.planned_value)}</TableCell>
                        <TableCell>
                          {commission.is_paid ? (
                            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                              <Check className="h-3 w-3 mr-1" /> Pago
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" /> Pendente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{commission.paid_to || '—'}</TableCell>
                        <TableCell className="text-sm">
                          {commission.paid_date
                            ? format(new Date(commission.paid_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                            : '—'}
                        </TableCell>
                        {isEditable && (
                          <TableCell>
                            {canPay && (
                              <Button size="sm" variant="outline" onClick={() => handleOpenPay(commission)}>
                                Pagar
                              </Button>
                            )}
                            {commission.is_paid && (
                              <Button size="sm" variant="ghost" onClick={() => handleUnpay(commission)}>
                                Desfazer
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay dialog */}
      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento de Comissão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor</Label>
              <p className="text-lg font-semibold">{payDialog ? formatCurrency(payDialog.planned_value) : ''}</p>
            </div>
            <div>
              <Label htmlFor="paid_to">Pago a</Label>
              <Input id="paid_to" value={paidTo} onChange={(e) => setPaidTo(e.target.value)} placeholder="Nome do beneficiário" />
            </div>
            <div>
              <Label htmlFor="paid_date">Data do pagamento</Label>
              <Input id="paid_date" type="date" value={paidDate} onChange={(e) => setPaidDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Cancelar</Button>
            <Button onClick={handleConfirmPay} disabled={updateCommission.isPending}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
