import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, Clock, Pencil, Percent, Plus, ShieldCheck, X } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProjectInstallmentDB, INSTALLMENT_STATUS_LABELS } from '@/types/project';
import {
  ProjectCommission,
  useUpdateCommission,
  useGenerateCommissions,
  useCreateManualCommission,
  useApproveCommission,
} from '@/hooks/useProjectCommissions';
import { CurrencyInput } from '@/components/ui/currency-input';

interface ProjectCommissionsSectionProps {
  projectId: string;
  commissions: ProjectCommission[];
  installments: ProjectInstallmentDB[];
  budget: { commission_percent: number; total_with_fees: number } | null;
  isEditable: boolean;
  isAdmin?: boolean;
  employeeId?: string;
}

interface EditDialogState {
  commission: ProjectCommission;
  installmentValue: number;
  mode: 'pay' | 'edit';
}

export function ProjectCommissionsSection({
  projectId,
  commissions,
  installments,
  budget,
  isEditable,
  isAdmin = false,
  employeeId,
}: ProjectCommissionsSectionProps) {
  const updateCommission = useUpdateCommission();
  const generateCommissions = useGenerateCommissions();
  const createManualCommission = useCreateManualCommission();
  const approveCommission = useApproveCommission();

  const [dialogState, setDialogState] = useState<EditDialogState | null>(null);
  const [dlgPercent, setDlgPercent] = useState('');
  const [dlgValue, setDlgValue] = useState(0);
  const [dlgPaidTo, setDlgPaidTo] = useState('');
  const [dlgPaidDate, setDlgPaidDate] = useState('');
  const [dlgIsPaid, setDlgIsPaid] = useState(false);
  const [lastChanged, setLastChanged] = useState<'percent' | 'value'>('percent');

  // Manual commission request dialog
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualValue, setManualValue] = useState(0);
  const [manualPaidTo, setManualPaidTo] = useState('');
  const [manualNotes, setManualNotes] = useState('');

  // Rejection dialog
  const [rejectDialogId, setRejectDialogId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const totalCommission = budget ? (budget.commission_percent / 100) * budget.total_with_fees : 0;
  const hasCommission = totalCommission > 0;
  const needsGeneration = hasCommission && commissions.length === 0 && installments.length > 0;

  // Split commissions by type
  const budgetCommissions = commissions.filter((c) => c.installment_id);
  const manualCommissions = commissions.filter((c) => !c.installment_id);
  const approvedCommissions = commissions.filter((c) => c.approval_status === 'approved');

  const commissionMap = useMemo(() => {
    const map = new Map<string, ProjectCommission>();
    commissions.forEach((c) => {
      if (c.installment_id) map.set(c.installment_id, c);
    });
    return map;
  }, [commissions]);

  const installmentMap = useMemo(() => {
    const map = new Map<string, ProjectInstallmentDB>();
    installments.forEach((i) => map.set(i.id, i));
    return map;
  }, [installments]);

  // Sync dialog fields when opening
  useEffect(() => {
    if (!dialogState) return;
    const { commission, mode } = dialogState;
    setDlgPercent(String(commission.commission_percent || 0));
    setDlgValue(Number(commission.planned_value));
    setDlgPaidTo(commission.paid_to || '');
    setDlgPaidDate(commission.paid_date || (mode === 'pay' ? format(new Date(), 'yyyy-MM-dd') : ''));
    setDlgIsPaid(mode === 'pay' ? true : commission.is_paid);
    setLastChanged('percent');
  }, [dialogState]);

  const handlePercentChange = (raw: string) => {
    setDlgPercent(raw);
    setLastChanged('percent');
    const pct = parseFloat(raw);
    if (!isNaN(pct) && dialogState) {
      setDlgValue(Math.round(dialogState.installmentValue * pct) / 100);
    }
  };

  const handleValueChange = (val: number) => {
    setDlgValue(val);
    setLastChanged('value');
    if (dialogState && dialogState.installmentValue > 0) {
      const pct = (val / dialogState.installmentValue) * 100;
      setDlgPercent(pct.toFixed(2));
    }
  };

  const handleGenerate = () => {
    generateCommissions.mutate({
      projectId,
      installments: installments.map((i) => ({ id: i.id })),
      totalCommission,
      commissionPercent: budget!.commission_percent,
    });
  };

  const openDialog = (commission: ProjectCommission, mode: 'pay' | 'edit') => {
    const inst = commission.installment_id ? installmentMap.get(commission.installment_id) : null;
    setDialogState({
      commission,
      installmentValue: inst ? Number(inst.value) : 0,
      mode,
    });
  };

  const handleConfirmDialog = () => {
    if (!dialogState) return;
    const pct = parseFloat(dlgPercent) || 0;
    updateCommission.mutate({
      id: dialogState.commission.id,
      commission_percent: pct,
      planned_value: dlgValue,
      is_paid: dlgIsPaid,
      paid_date: dlgIsPaid ? (dlgPaidDate || null) : null,
      paid_to: dlgIsPaid ? (dlgPaidTo || null) : null,
    });
    setDialogState(null);
  };

  const handleUnpay = (commission: ProjectCommission) => {
    updateCommission.mutate({
      id: commission.id,
      is_paid: false,
      paid_date: null,
      paid_to: null,
    });
  };

  const handleManualSubmit = () => {
    if (!employeeId || manualValue <= 0) return;
    createManualCommission.mutate({
      projectId,
      planned_value: manualValue,
      paid_to: manualPaidTo,
      notes: manualNotes,
      requested_by: employeeId,
    });
    setManualDialogOpen(false);
    setManualValue(0);
    setManualPaidTo('');
    setManualNotes('');
  };

  const handleApprove = (commissionId: string) => {
    if (!employeeId) return;
    approveCommission.mutate({ id: commissionId, approved: true, approved_by: employeeId });
  };

  const handleReject = () => {
    if (!rejectDialogId || !employeeId || !rejectionReason.trim()) return;
    approveCommission.mutate({
      id: rejectDialogId,
      approved: false,
      approved_by: employeeId,
      rejection_reason: rejectionReason,
    });
    setRejectDialogId(null);
    setRejectionReason('');
  };

  const totalPlanned = approvedCommissions.reduce((s, c) => s + (Number(c.planned_value) || 0), 0);
  const totalPaid = approvedCommissions.filter((c) => c.is_paid).reduce((s, c) => s + (Number(c.planned_value) || 0), 0);

  const renderApprovalBadge = (commission: ProjectCommission) => {
    if (commission.approval_status === 'pending') {
      return (
        <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300 text-xs">
          <Clock className="h-3 w-3 mr-1" /> Aguardando Aprovação
        </Badge>
      );
    }
    if (commission.approval_status === 'rejected') {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="destructive" className="text-xs">
                <X className="h-3 w-3 mr-1" /> Rejeitada
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{commission.rejection_reason || 'Sem motivo informado'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return null;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Comissões {hasCommission ? `(${budget?.commission_percent}%)` : ''}
          </CardTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {(totalPlanned > 0 || hasCommission) && (
              <>
                <span>Planejado: {formatCurrency(totalPlanned || totalCommission)}</span>
                <span>Pago: {formatCurrency(totalPaid)}</span>
              </>
            )}
            {isEditable && (
              <Button size="sm" variant="outline" onClick={() => setManualDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Solicitar Comissão
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Budget-based commissions */}
          {hasCommission && needsGeneration ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-sm text-muted-foreground">
                Comissão de {budget!.commission_percent}% ({formatCurrency(totalCommission)}) ainda não foi distribuída pelas parcelas.
              </p>
              <Button onClick={handleGenerate} disabled={generateCommissions.isPending} size="sm">
                Gerar Comissões
              </Button>
            </div>
          ) : budgetCommissions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Valor Parcela</TableHead>
                    <TableHead>Status Parcela</TableHead>
                    <TableHead>%</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Pago?</TableHead>
                    <TableHead>Pago a</TableHead>
                    <TableHead>Data Pgto</TableHead>
                    {isEditable && <TableHead className="w-[120px]">Ação</TableHead>}
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
                        <TableCell className="text-sm">{Number(commission.commission_percent)}%</TableCell>
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
                            <div className="flex items-center gap-1">
                              {canPay && (
                                <Button size="sm" variant="outline" onClick={() => openDialog(commission, 'pay')}>
                                  Pagar
                                </Button>
                              )}
                              {commission.is_paid && (
                                <Button size="sm" variant="ghost" onClick={() => handleUnpay(commission)}>
                                  Desfazer
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openDialog(commission, 'edit')}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : !hasCommission && commissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Este projeto não possui comissão definida no orçamento. Use o botão "Solicitar Comissão" para criar uma solicitação avulsa.
            </p>
          ) : null}

          {/* Manual commissions section */}
          {manualCommissions.length > 0 && (
            <div className={budgetCommissions.length > 0 ? 'mt-6' : ''}>
              {budgetCommissions.length > 0 && (
                <h4 className="text-sm font-medium mb-3">Comissões Avulsas</h4>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Valor</TableHead>
                      <TableHead>Beneficiário</TableHead>
                      <TableHead>Justificativa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pago?</TableHead>
                      {(isEditable || isAdmin) && <TableHead className="w-[160px]">Ação</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {manualCommissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell className="font-medium">{formatCurrency(commission.planned_value)}</TableCell>
                        <TableCell className="text-sm">{commission.paid_to || '—'}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{commission.notes || '—'}</TableCell>
                        <TableCell>{renderApprovalBadge(commission)}</TableCell>
                        <TableCell>
                          {commission.approval_status === 'approved' ? (
                            commission.is_paid ? (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                                <Check className="h-3 w-3 mr-1" /> Pago
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" /> Pendente
                              </Badge>
                            )
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isAdmin && commission.approval_status === 'pending' && (
                              <>
                                <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => handleApprove(commission.id)}>
                                  <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Aprovar
                                </Button>
                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRejectDialogId(commission.id)}>
                                  <X className="h-3.5 w-3.5 mr-1" /> Rejeitar
                                </Button>
                              </>
                            )}
                            {isEditable && commission.approval_status === 'approved' && !commission.is_paid && (
                              <Button size="sm" variant="outline" onClick={() => openDialog(commission, 'pay')}>
                                Pagar
                              </Button>
                            )}
                            {isEditable && commission.approval_status === 'approved' && commission.is_paid && (
                              <Button size="sm" variant="ghost" onClick={() => handleUnpay(commission)}>
                                Desfazer
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/pay dialog */}
      <Dialog open={!!dialogState} onOpenChange={() => setDialogState(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogState?.mode === 'pay' ? 'Registrar Pagamento de Comissão' : 'Editar Comissão'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dlg_percent">Percentual (%)</Label>
                <Input
                  id="dlg_percent"
                  type="number"
                  step="0.01"
                  min="0"
                  value={dlgPercent}
                  onChange={(e) => handlePercentChange(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dlg_value">Valor (R$)</Label>
                <CurrencyInput
                  id="dlg_value"
                  value={dlgValue}
                  onValueChange={handleValueChange}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dlg_paid_to">Pago a</Label>
              <Input id="dlg_paid_to" value={dlgPaidTo} onChange={(e) => setDlgPaidTo(e.target.value)} placeholder="Nome do beneficiário" />
            </div>
            <div>
              <Label htmlFor="dlg_paid_date">Data do pagamento</Label>
              <Input id="dlg_paid_date" type="date" value={dlgPaidDate} onChange={(e) => setDlgPaidDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogState(null)}>Cancelar</Button>
            <Button onClick={handleConfirmDialog} disabled={updateCommission.isPending}>
              {dialogState?.mode === 'pay' ? 'Confirmar Pagamento' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual commission request dialog */}
      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Comissão Avulsa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="manual_value">Valor (R$) *</Label>
              <CurrencyInput
                id="manual_value"
                value={manualValue}
                onValueChange={setManualValue}
              />
            </div>
            <div>
              <Label htmlFor="manual_paid_to">Beneficiário *</Label>
              <Input id="manual_paid_to" value={manualPaidTo} onChange={(e) => setManualPaidTo(e.target.value)} placeholder="Nome do beneficiário" />
            </div>
            <div>
              <Label htmlFor="manual_notes">Justificativa</Label>
              <Textarea id="manual_notes" value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} placeholder="Descreva o motivo da comissão" />
            </div>
            <p className="text-xs text-muted-foreground">
              A solicitação será enviada para aprovação do administrador antes de contabilizar no projeto.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleManualSubmit} disabled={createManualCommission.isPending || manualValue <= 0 || !manualPaidTo.trim()}>
              Solicitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection dialog */}
      <Dialog open={!!rejectDialogId} onOpenChange={() => { setRejectDialogId(null); setRejectionReason(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar Comissão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection_reason">Motivo da rejeição *</Label>
              <Textarea id="rejection_reason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Informe o motivo" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialogId(null); setRejectionReason(''); }}>Cancelar</Button>
            <Button variant="destructive" onClick={handleReject} disabled={approveCommission.isPending || !rejectionReason.trim()}>
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
