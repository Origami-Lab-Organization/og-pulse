import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Paperclip } from 'lucide-react';
import { ReimbursementRequest, useReimbursementAttachments } from '@/hooks/useReimbursements';
import { supabase } from '@/integrations/supabase/client';

interface ReimbursementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reimbursement: (ReimbursementRequest & { requester_name?: string; reviewer_name?: string }) | null;
}

export function ReimbursementDetailDialog({ open, onOpenChange, reimbursement }: ReimbursementDetailDialogProps) {
  const { data: attachments = [], isLoading } = useReimbursementAttachments(reimbursement?.id || null);

  const downloadFile = async (fileUrl: string) => {
    const { data, error } = await supabase.storage
      .from('reimbursement-receipts')
      .createSignedUrl(fileUrl, 300);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, '_blank');
  };

  if (!reimbursement) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Detalhes do Reembolso</DialogTitle>
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
                {format(parseISO(reimbursement.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Data de Aprovação</p>
              <p className="font-medium">
                {reimbursement.reviewed_at
                  ? format(parseISO(reimbursement.reviewed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : '-'}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Aprovado por</p>
              <p className="font-medium">{reimbursement.reviewer_name || '-'}</p>
            </div>
          </div>

          <div className="text-sm">
            <p className="text-muted-foreground mb-1">Descrição</p>
            <p>{reimbursement.description}</p>
          </div>

          <div className="text-sm">
            <p className="text-muted-foreground mb-2">Comprovantes</p>
            {isLoading ? (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
