import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProspectBudget, fetchProspectProject } from '@/services/prospectDealService';

/** Orçamento vinculado ao contato. Sem `orcamento:ler`, nem consulta: a resposta seria vazia. */
export function useProspectBudget(prospectId: string | null) {
  const { can } = useAuth();
  return useQuery({
    queryKey: ['prospect-budget', prospectId],
    queryFn: () => fetchProspectBudget(prospectId!),
    enabled: !!prospectId && can('orcamento:ler'),
  });
}

/** Projeto criado a partir do Ganho do contato. */
export function useProspectProject(prospectId: string | null) {
  return useQuery({
    queryKey: ['prospect-project', prospectId],
    queryFn: () => fetchProspectProject(prospectId!),
    enabled: !!prospectId,
  });
}
