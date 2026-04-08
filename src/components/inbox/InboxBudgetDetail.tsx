import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Check, X, ExternalLink } from 'lucide-react';
import { Notification } from '@/hooks/useNotifications';
import { useResolveNotification } from '@/hooks/useInboxNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { useNavigate } from 'react-router-dom';

interface Props {
  notification: Notification;
  onActionComplete: () => void;
}

export function InboxBudgetDetail({ notification, onActionComplete }: Props) {
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const resolveNotif = useResolveNotification();
  const navigate = useNavigate();
  const meta = notification.metadata || {};
  const budgetId = notification.reference_id;
  const isPending = notification.type === 'budget_margin_pending';

  const { data: budget, isLoading } = useQuery({
    queryKey: ['inbox-budget', budgetId],
    queryFn: async () => {
      if (!budgetId) return null;
      const { data, error } = await supabase
        .from('budgets' as any)
        .select('id, title, margin_override_approved, margin_override_pending, discount_value, created_by')
        .eq('id', budgetId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!budgetId,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!budgetId || !employee) return;
      const { error } = await supabase
        .from('budgets' as any)
        .update({
          margin_override_approved: true,
          margin_override_pending: false,
          margin_override_approved_by: employee.id,
          margin_override_approved_at: new Date().toISOString(),
        } as any)
        .eq('id', budgetId);
      if (error) throw error;

      // Notify the requester
      if (meta.requester_id) {
        await supabase.from('notifications' as any).insert({
          tenant_id: employee.tenant_id,
          recipient_id: meta.requester_id,
          type: 'budget_margin_approved',
          category: 'budget',
          priority: 'normal',
          title: `Desconto aprovado — ${meta.budget_title || budget?.title}`,
          message: `O desconto no orçamento "${meta.budget_title || budget?.title}" foi aprovado por ${employee.nome}.`,
          reference_id: budgetId,
          metadata: { budget_title: meta.budget_title, approver_name: employee.nome },
        } as any);
      }

      resolveNotif.mutate(notification.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-budget', budgetId] });
      onActionComplete();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!budgetId || !employee) return;
      const { error } = await supabase
        .from('budgets' as any)
        .update({ margin_override_pending: false } as any)
        .eq('id', budgetId);
      if (error) throw error;

      // Notify the requester
      if (meta.requester_id) {
        await supabase.from('notifications' as any).insert({
          tenant_id: employee.tenant_id,
          recipient_id: meta.requester_id,
          type: 'budget_margin_rejected',
          category: 'budget',
          priority: 'normal',
          title: `Desconto não aprovado — ${meta.budget_title || budget?.title}`,
          message: `O desconto no orçamento "${meta.budget_title || budget?.title}" não foi aprovado por ${employee.nome}. Edite o orçamento para ajustar o desconto.`,
          reference_id: budgetId,
          metadata: { budget_title: meta.budget_title, approver_name: employee.nome },
        } as any);
      }

      resolveNotif.mutate(notification.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['inbox-budget', budgetId] });
      onActionComplete();
    },
  });

  const isActing = approveMutation.isPending || rejectMutation.isPending;
  const isApproved = budget?.margin_override_approved;
  const isResolved = notification.is_resolved;
  const canAct = isPending && !isApproved && !isResolved && (employee?.isAdmin ?? false);
  const fmtCurrency = (v: number) => formatCurrency(v);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="space-y-4">
      {/* Details */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
        {meta.requester_name && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Solicitado por</span>
            <span className="font-medium">{meta.requester_name}</span>
          </div>
        )}
        {meta.effective_margin != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Margem líquida efetiva</span>
            <span className="font-medium text-destructive">{Number(meta.effective_margin).toFixed(1)}%</span>
          </div>
        )}
        {meta.discount_value != null && Number(meta.discount_value) > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Desconto aplicado</span>
            <span className="font-medium">{fmtCurrency(meta.discount_value)}</span>
          </div>
        )}
        {meta.min_margin != null && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Margem mínima</span>
            <span className="font-medium">{meta.min_margin}%</span>
          </div>
        )}
      </div>

      {/* Status */}
      {isApproved && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-900/30 dark:bg-green-900/10 p-3">
          <p className="text-sm text-green-700 dark:text-green-400 font-medium">Desconto aprovado</p>
        </div>
      )}
      {isResolved && !isApproved && (
        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="text-sm text-muted-foreground">Solicitação resolvida</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {canAct && (
          <>
            <Button size="sm" onClick={() => approveMutation.mutate()} disabled={isActing}>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              Aprovar desconto
            </Button>
            <Button size="sm" variant="outline" onClick={() => rejectMutation.mutate()} disabled={isActing}>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Não aprovar
            </Button>
          </>
        )}
        {budgetId && (
          <Button size="sm" variant="ghost" onClick={() => navigate(`/budgets/${budgetId}/edit`)}>
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Ver orçamento
          </Button>
        )}
      </div>
    </div>
  );
}
