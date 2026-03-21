import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import { Check, X, RotateCcw, ExternalLink } from 'lucide-react';
import {
  useApproveReimbursement,
  useRejectReimbursement,
  ReimbursementRequest,
} from '@/hooks/useReimbursements';
import { Notification, useMarkNotificationResolved } from '@/hooks/useNotifications';
import { useResolveNotification } from '@/hooks/useInboxNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { CorrectionData } from '@/components/reimbursements/ReimbursementFormDialog';
import { ReimbursementDetailDialog } from '@/components/reimbursements/ReimbursementDetailDialog';

interface Props {
  notification: Notification;
  onActionComplete: () => void;
  onOpenCorrectForm: (data: CorrectionData) => void;
  onLiveStatusLoaded?: (status: string) => void;
}

export function InboxReimbursementDetail({ notification, onActionComplete, onOpenCorrectForm, onLiveStatusLoaded }: Props) {
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const approveMutation = useApproveReimbursement();
  const rejectMutation = useRejectReimbursement();
  const markResolvedMutation = useMarkNotificationResolved();
  const resolveNotif = useResolveNotification();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [correctLoading, setCorrectLoading] = useState(false);

  const isPending = notification.type === 'reimbursement_pending';
  const isRejected = notification.type === 'reimbursement_rejected';
  const meta = notification.metadata || {};

  const { data: reimbursement, isLoading } = useQuery({
    queryKey: ['inbox-reimbursement', notification.reference_id],
    queryFn: async () => {
      if (!notification.reference_id) return null;
      const { data, error } = await supabase
        .from('reimbursement_requests' as any)
        .select('*')
        .eq('id', notification.reference_id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ReimbursementRequest | null;
    },
    enabled: !!notification.reference_id,
  });

  useEffect(() => {
    if (reimbursement?.status) onLiveStatusLoaded?.(reimbursement.status);
  }, [reimbursement?.status]);

  const [managedProjectIds, setManagedProjectIds] = useState<string[]>([]);
  useEffect(() => {
    if (!employee?.is_gerente || !employee?.id) { setManagedProjectIds([]); return; }
    supabase.from('projects' as any).select('id').eq('manager_id', employee.id)
      .then(({ data }) => setManagedProjectIds(((data || []) as any[]).map((p: any) => p.id)));
  }, [employee?.id, employee?.is_gerente]);

  const canApprove = useMemo(() => {
    if (!reimbursement || reimbursement.status !== 'pending') return false;
    if (employee?.isAdmin) return true;
    if (employee?.is_gerente && !reimbursement.is_internal && reimbursement.project_id) {
      return managedProjectIds.includes(reimbursement.project_id);
    }
    return false;
  }, [reimbursement, employee, managedProjectIds]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['inbox-notifications'] });
    queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    queryClient.invalidateQueries({ queryKey: ['pending-reimbursements'] });
    queryClient.invalidateQueries({ queryKey: ['all-my-reimbursements'] });
  };

  const handleApprove = () => {
    approveMutation.mutate(notification.reference_id!, {
      onSuccess: () => {
        markResolvedMutation.mutate(notification.id, {
          onSuccess: () => { invalidateAll(); onActionComplete(); },
        });
      },
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) return;
    rejectMutation.mutate(
      { reimbursementId: notification.reference_id!, reason: rejectReason },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setRejectReason('');
          markResolvedMutation.mutate(notification.id, {
            onSuccess: () => { invalidateAll(); onActionComplete(); },
          });
        },
      },
    );
  };

  const handleCorrect = async () => {
    if (!notification.reference_id) return;
    setCorrectLoading(true);
    try {
      const [{ data: r }, { data: itemsData }] = await Promise.all([
        supabase.from('reimbursement_requests' as any).select('*').eq('id', notification.reference_id).single(),
        supabase.from('reimbursement_items' as any).select('*').eq('reimbursement_id', notification.reference_id).order('expense_date', { ascending: true }),
      ]);
      const items = ((itemsData || []) as any[]).map((it: any) => ({
        date: new Date(it.expense_date + 'T12:00:00'),
        description: it.description as string,
        amount: it.amount as number,
      }));
      const corrData: CorrectionData = {
        correctedFromId: (r as any).id,
        rejectedAt: (r as any).reviewed_at || (r as any).created_at,
        rejectionReason: (r as any).rejection_reason || '',
        type: (r as any).is_internal ? 'internal' : 'project',
        clientId: (r as any).client_id || '',
        projectId: (r as any).project_id || '',
        items,
      };
      onOpenCorrectForm(corrData);
      resolveNotif.mutate(notification.id, { onSuccess: () => invalidateAll() });
    } finally {
      setCorrectLoading(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!reimbursement) return null;

  const amount = meta.amount ?? reimbursement.total_amount;
  const requesterName = meta.requester_name || (reimbursement as any).requester_name;
  const projectName = meta.project_name || (reimbursement as any).project_name;

  return (
    <>
      {/* Info grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {requesterName && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Solicitante</p>
            <p className="text-sm font-medium">{requesterName}</p>
          </div>
        )}
        {amount > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Valor</p>
            <p className="text-sm font-medium">{formatCurrency(amount)}</p>
          </div>
        )}
        {projectName && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Projeto</p>
            <p className="text-sm font-medium">{projectName}</p>
          </div>
        )}
        {reimbursement.created_at && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Data</p>
            <p className="text-sm font-medium">
              {new Date(reimbursement.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        )}
      </div>

      {/* Rejection reason */}
      {isRejected && reimbursement.rejection_reason && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 mb-4">
          <p className="text-xs font-medium text-destructive mb-1">Motivo da rejeição</p>
          <p className="text-sm text-destructive/80">{reimbursement.rejection_reason}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {isPending && canApprove && (
          <>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={approveMutation.isPending || markResolvedMutation.isPending}
            >
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setRejectOpen(true)}
              disabled={rejectMutation.isPending}
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Rejeitar
            </Button>
          </>
        )}

        {isRejected && (
          <Button
            size="sm"
            onClick={handleCorrect}
            disabled={correctLoading}
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            {correctLoading ? 'Carregando...' : 'Corrigir e Reenviar'}
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={() => setDetailOpen(true)}
        >
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
          Ver detalhes
        </Button>
      </div>

      {/* Reject dialog */}
      <AlertDialog open={rejectOpen} onOpenChange={(v) => { setRejectOpen(v); if (!v) setRejectReason(''); }}>
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

      {/* Detail dialog */}
      <ReimbursementDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        reimbursement={reimbursement}
      />
    </>
  );
}
