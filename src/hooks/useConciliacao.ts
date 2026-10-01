import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { conciliacaoService } from '@/services/conciliacaoService';

const RECEIVABLES_KEY = 'conciliacao-receber';

export function useReceivablesReconciliation(from: string, to: string, enabled: boolean) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  return useQuery({
    queryKey: [RECEIVABLES_KEY, tenantId, from, to],
    queryFn: () => conciliacaoService.getReceivables(tenantId as string, from, to),
    enabled: enabled && Boolean(tenantId),
  });
}

export enum ReconciliationAction {
  Confirm = 'confirmar',
  Undo = 'desfazer',
  ApplyPayment = 'aplicar_baixa',
}

const RUN: Record<ReconciliationAction, (matchId: string) => Promise<void>> = {
  [ReconciliationAction.Confirm]: conciliacaoService.confirm,
  [ReconciliationAction.Undo]: conciliacaoService.undo,
  [ReconciliationAction.ApplyPayment]: conciliacaoService.applyPayment,
};

const DONE: Record<ReconciliationAction, string> = {
  [ReconciliationAction.Confirm]: 'Casamento confirmado',
  [ReconciliationAction.Undo]: 'Casamento desfeito',
  [ReconciliationAction.ApplyPayment]: 'Parcela marcada como recebida',
};

/** Confirmar, desfazer ou levar a baixa. Desfazer e baixa mexem na parcela: o financeiro do projeto recarrega. */
export function useReconciliationAction() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ action, matchId }: { action: ReconciliationAction; matchId: string }) => RUN[action](matchId),
    onSuccess: (_data, { action }) => {
      for (const key of [RECEIVABLES_KEY, 'project-installments', 'project', 'projects']) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast({ title: DONE[action] });
    },
    onError: (error) =>
      toast({
        title: 'Não foi possível concluir',
        description: mensagemParaUsuario(error),
        variant: 'destructive',
      }),
  });
}
