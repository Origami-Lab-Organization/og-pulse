import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Paperclip, CheckCircle, XCircle } from 'lucide-react';
import {
  ReimbursementRequest,
  useReimbursementAttachments,
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

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'outline' },
  approved: { label: 'Aprovado', variant: 'default' },
  rejected: { label: 'Rejeitado', variant: 'destructive' },
};

interface ReimbursementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reimbursement: (ReimbursementRequest & { requester_name?: string; reviewer_name?: string; project_name?: string; client_name?: string }) | null;
}

export function ReimbursementDetailDialog({ open, onOpenChange, reimbursement }: ReimbursementDetailDialogProps) {
  const { employee } = useAuth();
  const { data: attachments = [], isLoading: loadingAttachments } = useReimbursementAttachments(reimbursement?.id || null);
  const approveMutation = useApproveReimbursement();
  const rejectMutation = useRejectReimbursement();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const isManager = employee?.is_gerente || employee?.isAdmin;
  const isPending = reimbursement?.status === 'pending';
  const canAct = isManager && isPending;

  const downloadFile = async (fileUrl: string) => {
    const { data, error } = await supabase.storage
      .from('reimbursement-receipts')
      .createSignedUrl(fileUrl, 300);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, '_blank');
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Detalhes do Reembolso
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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
              {reimbursement.reviewed_at && (
                <div>
                  <p className="text-muted-foreground">Revisado em</p>
                  <p className="font-medium">
                    {format(new Date(reimbursement.reviewed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}
              {reimbursement.reviewer_name && (
                <div>
                  <p className="text-muted-foreground">Revisado por</p>
                  <p className="font-medium">{reimbursement.reviewer_name}</p>
                </div>
              )}
            </div>

            <div className="text-sm">
              <p className="text-muted-foreground mb-1">Descrição</p>
              <p>{reimbursement.description}</p>
            </div>

            {reimbursement.status === 'rejected' && reimbursement.rejection_reason && (
              <div className="text-sm rounded-md bg-destructive/10 p-3">
                <p className="text-destructive font-medium mb-1">Motivo da Rejeição</p>
                <p className="text-destructive/80">{reimbursement.rejection_reason}</p>
              </div>
            )}

            <div className="text-sm">
              <p className="text-muted-foreground mb-2">Comprovantes</p>
              {loadingAttachments ? (
                <p className="text-muted-foreground text-xs">Carregando...</p>
              ) : attachments.length === 0 ? (
                <p className="text-muted-foreground text-xs italic">Nenhum anexo encontrado.</p>
              ) : (
                <ul className="space-y-1.5">
                  {attachments.map((a) => (
                    <li key={a.id} className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                      <button
                        className="text-sm text-primary hover:underline truncate"
                        onClick={() => downloadFile(a.file_url)}
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
