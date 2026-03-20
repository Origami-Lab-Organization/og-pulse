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
import { Check, X, RotateCcw } from 'lucide-react';
import {
  useApproveReimbursement,
  useRejectReimbursement,
} from '@/hooks/useReimbursements';
import { useMarkNotificationResolved, Notification } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { CorrectionData } from '@/components/reimbursements/ReimbursementFormDialog';

interface Props {
  notification: Notification;
  onResolved: () => void;
  onOpenCorrectForm: (data: CorrectionData) => void;
}

export function InboxReimbursementDetail({ notification, onResolved, onOpenCorrectForm }: Props) {
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const approveMutation = useApproveReimbursement();
  const rejectMutation = useRejectReimbursement();
  const markResolvedMutation = useMarkNotificationResolved();

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [correctLoading, setCorrectLoading] = useState(false);

  const isPending = notification.type === 'reimbursement_pending';
  const isRejected = notification.type === 'reimbursement_rejected';

  const { data: reimbursement, isLoading } = useQuery({
    queryKey: ['inbox-reimbursement', notification.reference_id],
    queryFn: async () => {
      if (!notification.reference_id) return null;
      const { data, error } = await supabase
        .from('reimbursement_requests' as any)
        .select('id, status, total_amount, project_id, is_internal, requested_by, rejection_reason, reviewed_at, client_id')
        .eq('id', notification.reference_id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!notification.reference_id,
  });

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
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
    queryClient.invalidateQueries({ queryKey: ['pending-reimbursements'] });
    queryClient.invalidateQueries({ queryKey: ['pending-reimbursements-count'] });
    queryClient.invalidateQueries({ queryKey: ['all-my-reimbursements'] });
  };

  const handleApprove = () => {
    approveMutation.mutate(notification.reference_id!, {
      onSuccess: () => {
        markResolvedMutation.mutate(notification.id, {
          onSuccess: () => {
            invalidateAll();
            onResolved();
          },
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
            onSuccess: () => {
              invalidateAll();
              onResolved();
            },
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

      const expItems = ((itemsData || []) as any[]).map((it: any) => ({
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
        items: expItems,
      };

      onOpenCorrectForm(corrData);

      markResolvedMutation.mutate(notification.id, {
        onSuccess: () => invalidateAll(),
      });
    } finally {
      setCorrectLoading(false);
    }
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground pt-2">Carregando...</p>;
  }

  if (!reimbursement) return null;

  // Already resolved: show no actions
  if (notification.is_resolved) return null;

  const amount = (notification.metadata as any)?.amount ?? reimbursement.total_amount;

  return (
    <>
      <div className="mt-2 pt-2 border-t border-primary/10 space-y-2">
        {amount > 0 && (
          <p className="text-xs text-muted-foreground">
            Valor: <span className="font-medium text-foreground">{formatCurrency(amount)}</span>
          </p>
        )}

        {isPending && canApprove && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
              className="flex-1 h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={approveMutation.isPending || markResolvedMutation.isPending}
            >
              <Check className="h-3 w-3 mr-1" />
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 h-8 text-xs"
              onClick={() => setRejectOpen(true)}
              disabled={rejectMutation.isPending}
            >
              <X className="h-3 w-3 mr-1" />
              Rejeitar
            </Button>
          </div>
        )}

        {isRejected && (
          <div className="space-y-1.5">
            {reimbursement.rejection_reason && (
              <p className="text-xs text-destructive/80">
                Motivo: {reimbursement.rejection_reason}
              </p>
            )}
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              onClick={handleCorrect}
              disabled={correctLoading}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              {correctLoading ? 'Carregando...' : 'Corrigir e Reenviar'}
            </Button>
          </div>
        )}
      </div>

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
    </>
  );
}
