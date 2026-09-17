import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import {
  deleteActivity,
  fetchActivitiesForMetrics,
  fetchProspectActivities,
  registerActivity,
  type RegisterActivityInput,
} from '@/services/prospectService';
import type { ProspectActivityWithOwner } from '@/types/prospect';

export function useProspectActivities(prospectId: string | null) {
  const { employee } = useAuth();
  return useQuery<ProspectActivityWithOwner[]>({
    queryKey: ['prospect-activities', prospectId],
    queryFn: () => fetchProspectActivities(prospectId!),
    enabled: !!prospectId && !!employee?.tenant_id,
  });
}

export function useProspectMetricsActivities(since: string) {
  const { employee } = useAuth();
  return useQuery<ProspectActivityWithOwner[]>({
    queryKey: ['prospect-activities-metrics', employee?.tenant_id, since],
    queryFn: () => fetchActivitiesForMetrics(employee!.tenant_id, since),
    enabled: !!employee?.tenant_id,
  });
}

/**
 * O registro de atividade — a escrita que precisa caber num clique.
 *
 * O contador, a próxima data e a mudança de etapa vêm do trigger no banco; aqui só se
 * invalida o que a tela mostra.
 */
export function useRegisterActivity() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: Omit<RegisterActivityInput, 'tenant_id' | 'created_by' | 'owner_id'>) =>
      registerActivity({
        ...input,
        tenant_id: employee!.tenant_id,
        created_by: employee!.id,
        owner_id: employee!.id,
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['prospect-activities', variables.prospect_id] });
      qc.invalidateQueries({ queryKey: ['prospect-activities-metrics'] });
      qc.invalidateQueries({ queryKey: ['prospects'] });
      qc.invalidateQueries({ queryKey: ['prospect'] });
    },
    onError: (err: unknown) => {
      toast({
        title: 'Erro ao registrar a atividade',
        description: mensagemParaUsuario(err),
        variant: 'destructive',
      });
    },
  });
}

/**
 * Desfaz o clique errado.
 *
 * Apaga o registro, mas `prospects.activity_count` não regride — o índice único
 * (prospect_id, sequence_no) impediria reaproveitar o número, e reescrever a contagem da
 * cadência para trás faria a métrica de resposta por número de toque mentir.
 */
export function useDeleteProspectActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; prospect_id: string }) => deleteActivity(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['prospect-activities', variables.prospect_id] });
      qc.invalidateQueries({ queryKey: ['prospect-activities-metrics'] });
      qc.invalidateQueries({ queryKey: ['prospects'] });
      qc.invalidateQueries({ queryKey: ['prospect'] });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao desfazer', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}
