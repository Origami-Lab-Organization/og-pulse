import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Check, X, Paperclip } from 'lucide-react';
import {
  usePendingReimbursements,
  useApproveReimbursement,
  useRejectReimbursement,
  useReimbursementAttachments,
} from '@/hooks/useReimbursements';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReimbursementInbox({ open, onOpenChange }: Props) {
  const { data: pending = [], isLoading } = usePendingReimbursements();
  const approveMutation = useApproveReimbursement();
  const rejectMutation = useRejectReimbursement();

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewAttachmentsId, setViewAttachmentsId] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = () => {
    if (!rejectId || !rejectReason.trim()) return;
    rejectMutation.mutate(
      { reimbursementId: rejectId, reason: rejectReason },
      { onSuccess: () => { setRejectId(null); setRejectReason(''); } }
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Pedidos de Reembolso Pendentes</SheetTitle>
          </SheetHeader>

          <div className="mt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum pedido pendente.</p>
            ) : (
              <div className="space-y-3">
                {pending.map((r) => (
                  <div key={r.id} className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{r.requester_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <span className="font-semibold text-sm">
                        {r.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    <p className="text-sm">{r.description}</p>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {r.is_internal ? (
                        <Badge variant="secondary">Interno</Badge>
                      ) : (
                        <>
                          {r.client_name && <Badge variant="outline">{r.client_name}</Badge>}
                          {r.project_name && <Badge variant="outline">{r.project_name}</Badge>}
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => setViewAttachmentsId(r.id)}
                      >
                        <Paperclip className="h-3 w-3 mr-1" />
                        Anexos
                      </Button>
                      <div className="flex-1" />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-xs"
                        onClick={() => setRejectId(r.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Rejeitar
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => handleApprove(r.id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Aprovar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={(v) => { if (!v) { setRejectId(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Rejeição</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Informe o motivo da rejeição..."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(''); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attachments dialog */}
      <AttachmentsDialog
        reimbursementId={viewAttachmentsId}
        onClose={() => setViewAttachmentsId(null)}
      />
    </>
  );
}

function AttachmentsDialog({ reimbursementId, onClose }: { reimbursementId: string | null; onClose: () => void }) {
  const { data: attachments = [], isLoading } = useReimbursementAttachments(reimbursementId);

  const downloadFile = async (fileUrl: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from('reimbursement-receipts')
      .createSignedUrl(fileUrl, 300);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, '_blank');
  };

  return (
    <Dialog open={!!reimbursementId} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comprovantes Anexados</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum anexo encontrado.</p>
        ) : (
          <ul className="space-y-2">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <button
                  className="text-sm text-primary hover:underline truncate"
                  onClick={() => downloadFile(a.file_url, a.file_name)}
                >
                  {a.file_name}
                </button>
                {a.file_size && (
                  <span className="text-xs text-muted-foreground">
                    {(a.file_size / 1024).toFixed(0)} KB
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
