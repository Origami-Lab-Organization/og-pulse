import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Paperclip, CheckCircle, XCircle, FileText, Clock, Circle } from 'lucide-react';
import {
  ReimbursementRequest,
  useReimbursementAttachments,
  useReimbursementItems,
  useApproveReimbursement,
  useRejectReimbursement,
} from '@/hooks/useReimbursements';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  pending: { label: 'Pendente', variant: 'outline' },
  approved: { label: 'Aprovado', variant: 'secondary', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  rejected: { label: 'Rejeitado', variant: 'destructive' },
};

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

function isImageFile(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.includes(ext);
}

interface ReimbursementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reimbursement: (ReimbursementRequest & { requester_name?: string; reviewer_name?: string; project_name?: string; client_name?: string }) | null;
  onCorrectAndResend?: (reimbursement: ReimbursementRequest) => void;
}

export function ReimbursementDetailDialog({ open, onOpenChange, reimbursement, onCorrectAndResend }: ReimbursementDetailDialogProps) {
  const { employee } = useAuth();
  const { data: attachments = [], isLoading: loadingAttachments } = useReimbursementAttachments(reimbursement?.id || null);
  const { data: expenseItems = [] } = useReimbursementItems(reimbursement?.id || null);
  const approveMutation = useApproveReimbursement();
  const rejectMutation = useRejectReimbursement();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());

  const isManager = employee?.is_gerente || employee?.isAdmin;
  const isPending = reimbursement?.status === 'pending';
  const isRejected = reimbursement?.status === 'rejected';
  const isOwner = reimbursement?.requested_by === employee?.id;
  const canAct = isManager && isPending;
  const canCorrect = isRejected && isOwner && onCorrectAndResend;

  // Generate signed URLs for all attachments
  useEffect(() => {
    if (attachments.length === 0) {
      setSignedUrls(new Map());
      return;
    }
    let cancelled = false;
    async function loadUrls() {
      const map = new Map<string, string>();
      await Promise.all(
        attachments.map(async (a) => {
          const { data } = await supabase.storage
            .from('reimbursement-receipts')
            .createSignedUrl(a.file_url, 600);
          if (data?.signedUrl && !cancelled) {
            map.set(a.id, data.signedUrl);
          }
        })
      );
      if (!cancelled) setSignedUrls(map);
    }
    loadUrls();
    return () => { cancelled = true; };
  }, [attachments]);

  const openFile = (attachmentId: string) => {
    const url = signedUrls.get(attachmentId);
    if (url) window.open(url, '_blank');
  };

  const handleApprove = () => {
    if (!reimbursement) return;
    approveMutation.mutate(reimbursement.id, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const handleReject = () => {
    if (!reimbursement) return;
    rejectMutation.mutate(
      { reimbursementId: reimbursement.id, reason: rejectReason },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setRejectReason('');
          onOpenChange(false);
        },
      }
    );
  };

  if (!reimbursement) return null;

  const cfg = statusConfig[reimbursement.status] || statusConfig.pending;

  const imageAttachments = attachments.filter(a => isImageFile(a.file_name));
  const otherAttachments = attachments.filter(a => !isImageFile(a.file_name));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Detalhes do Reembolso
              <Badge variant={cfg.variant} className={cfg.className}>{cfg.label}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Solicitante</p>
                <p className="font-medium">{reimbursement.requester_name || 'Desconhecido'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Valor</p>
                <p className="font-medium">{formatCurrency(reimbursement.total_amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Data da Solicitação</p>
                <p className="font-medium">
                  {format(new Date(reimbursement.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Tipo</p>
                <p className="font-medium">
                  {reimbursement.is_internal ? 'Interno' : reimbursement.project_name || 'Projeto'}
                </p>
              </div>
              {reimbursement.client_name && (
                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{reimbursement.client_name}</p>
                </div>
              )}
            </div>

            {/* Expense Items */}
            {expenseItems.length > 0 ? (
              <div className="text-sm">
                <p className="text-muted-foreground mb-2">Despesas</p>
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-2 font-medium">Data</th>
                        <th className="text-left p-2 font-medium">Descrição</th>
                        <th className="text-right p-2 font-medium">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseItems.map((item) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="p-2 whitespace-nowrap">
                            {format(new Date(item.expense_date + 'T12:00:00'), 'dd/MM/yyyy')}
                          </td>
                          <td className="p-2">{item.description}</td>
                          <td className="p-2 text-right whitespace-nowrap">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    {expenseItems.length > 1 && (
                      <tfoot>
                        <tr className="bg-muted/30">
                          <td colSpan={2} className="p-2 font-medium text-right">Total</td>
                          <td className="p-2 text-right font-medium">{formatCurrency(reimbursement.total_amount)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">Descrição</p>
                <p>{reimbursement.description}</p>
              </div>
            )}

            {reimbursement.status === 'rejected' && reimbursement.rejection_reason && (
              <div className="text-sm rounded-md bg-destructive/10 p-3">
                <p className="text-destructive font-medium mb-1">Motivo da Rejeição</p>
                <p className="text-destructive/80">{reimbursement.rejection_reason}</p>
              </div>
            )}

            {/* Attachments */}
            <div className="text-sm">
              <p className="text-muted-foreground mb-2">Comprovantes</p>
              {loadingAttachments ? (
                <p className="text-muted-foreground text-xs">Carregando...</p>
              ) : attachments.length === 0 ? (
                <p className="text-muted-foreground text-xs italic">Nenhum anexo encontrado.</p>
              ) : (
                <div className="space-y-3">
                  {/* Image thumbnails */}
                  {imageAttachments.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {imageAttachments.map((a) => {
                        const url = signedUrls.get(a.id);
                        return (
                          <button
                            key={a.id}
                            onClick={() => openFile(a.id)}
                            className="relative group rounded-lg border overflow-hidden aspect-square bg-muted hover:ring-2 hover:ring-primary transition-all"
                          >
                            {url ? (
                              <img
                                src={url}
                                alt={a.file_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Paperclip className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                              {a.file_name}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {/* Other files */}
                  {otherAttachments.length > 0 && (
                    <ul className="space-y-1.5">
                      {otherAttachments.map((a) => (
                        <li key={a.id} className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <button
                            className="text-sm text-primary hover:underline truncate"
                            onClick={() => openFile(a.id)}
                          >
                            {a.file_name}
                          </button>
                          {a.file_size && (
                            <span className="text-xs text-muted-foreground shrink-0">
                              {(a.file_size / 1024).toFixed(0)} KB
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Timeline / History */}
            <div className="text-sm">
              <p className="text-muted-foreground mb-3">Histórico</p>
              <div className="relative pl-6 space-y-4">
                {/* Vertical line */}
                <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />

                {/* Correction reference */}
                {reimbursement.corrected_from_id && (
                  <div className="relative flex items-start gap-3">
                    <Clock className="absolute -left-6 top-0.5 h-[18px] w-[18px] text-amber-500" />
                    <div>
                      <p className="font-medium">Correção de pedido anterior</p>
                      <p className="text-muted-foreground text-xs">Este pedido é uma correção de um reembolso rejeitado.</p>
                    </div>
                  </div>
                )}

                {/* Created */}
                <div className="relative flex items-start gap-3">
                  <Circle className="absolute -left-6 top-0.5 h-[18px] w-[18px] text-muted-foreground fill-background" />
                  <div>
                    <p className="font-medium">Solicitado</p>
                    <p className="text-muted-foreground text-xs">
                      {format(new Date(reimbursement.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      {reimbursement.requester_name && ` · ${reimbursement.requester_name}`}
                    </p>
                  </div>
                </div>

                {/* Reviewed */}
                {reimbursement.reviewed_at && (
                  <div className="relative flex items-start gap-3">
                    {reimbursement.status === 'approved' ? (
                      <CheckCircle className="absolute -left-6 top-0.5 h-[18px] w-[18px] text-green-600" />
                    ) : (
                      <XCircle className="absolute -left-6 top-0.5 h-[18px] w-[18px] text-destructive" />
                    )}
                    <div>
                      <p className="font-medium">
                        {reimbursement.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(reimbursement.reviewed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {reimbursement.reviewer_name && ` · ${reimbursement.reviewer_name}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {canAct && (
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  onClick={handleApprove}
                  disabled={approveMutation.isPending}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setRejectOpen(true)}
                  disabled={rejectMutation.isPending}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar
                </Button>
              </div>
            )}

            {canCorrect && (
              <div className="pt-2 border-t">
                <Button
                  onClick={() => {
                    onCorrectAndResend!(reimbursement);
                    onOpenChange(false);
                  }}
                  className="w-full bg-green-700 hover:bg-green-800 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Corrigir e Reenviar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeitar Reembolso</AlertDialogTitle>
            <AlertDialogDescription>
              Informe o motivo da rejeição deste pedido de reembolso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Motivo da rejeição..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Rejeição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
