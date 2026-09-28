import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useProspectCompanies } from '@/hooks/useProspectCompanies';
import {
  fetchActivitiesSince,
  fetchResponseActivities,
  fetchStageChanges,
} from '@/services/prospectService';

/**
 * O que a aba Métricas lê além dos contatos.
 *
 * As chaves começam por `prospects` e `prospect-activities-metrics` de propósito: são os
 * prefixos que as mutações de contato e de atividade já invalidam, então mover um card ou
 * registrar um toque atualiza as métricas sem ninguém lembrar de mais uma chave.
 */
export function useProspectMetricsData(activitiesSince: string) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const habilitado = !!tenantId;

  const empresas = useProspectCompanies();
  const mudancas = useQuery({
    queryKey: ['prospects', 'stage-changes', tenantId],
    queryFn: () => fetchStageChanges(tenantId!),
    enabled: habilitado,
  });
  const respostas = useQuery({
    queryKey: ['prospect-activities-metrics', tenantId, 'respostas'],
    queryFn: () => fetchResponseActivities(tenantId!),
    enabled: habilitado,
  });
  const atividades = useQuery({
    queryKey: ['prospect-activities-metrics', tenantId, 'desde', activitiesSince],
    queryFn: () => fetchActivitiesSince(tenantId!, activitiesSince),
    enabled: habilitado,
  });

  const consultas = [empresas, mudancas, respostas, atividades];
  return {
    companies: empresas.data ?? [],
    changes: mudancas.data ?? [],
    responses: respostas.data ?? [],
    activities: atividades.data ?? [],
    isLoading: consultas.some((c) => c.isLoading),
    isError: consultas.some((c) => c.isError),
    refetch: () => consultas.forEach((c) => c.refetch()),
  };
}
