import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { projectRitoService } from '@/services/projectRitoService';
import type { CreateProjectRitoInput } from '@/types/projectRito';

const RITO_LINKS_KEY = 'project-rito-links';

/** Códigos de erro do Postgres que a UI trata de forma específica. */
const PG_ERROR = {
  UNIQUE_VIOLATION: '23505',
} as const;

/** Vínculos de rito desta reunião, identificada pelo `iCalUId`. */
export function useRitoLinks(icalUid: string | null) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: [RITO_LINKS_KEY, tenantId, icalUid],
    enabled: Boolean(tenantId && icalUid),
    queryFn: () => projectRitoService.listByIcalUid(tenantId as string, icalUid as string),
  });
}

/** Projetos em que a pessoa pode vincular rito (membro ou gerente). */
export function useRitoEligibleProjects() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const employeeId = employee?.id;

  return useQuery({
    queryKey: ['rito-eligible-projects', tenantId, employeeId],
    enabled: Boolean(tenantId && employeeId),
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      projectRitoService.listEligibleProjects(tenantId as string, employeeId as string),
  });
}

export function useLinkProjectRito() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: (input: CreateProjectRitoInput) => {
      if (!employee?.tenant_id || !employee?.id) {
        throw new Error('Sessão sem funcionário identificado.');
      }
      return projectRitoService.create(employee.tenant_id, employee.id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RITO_LINKS_KEY] });
      toast.success('Rito vinculado ao projeto.');
    },
    onError: (error) => {
      console.error('Erro ao vincular rito:', error);
      const isDuplicate =
        (error as { code?: string })?.code === PG_ERROR.UNIQUE_VIOLATION;
      toast.error(
        isDuplicate
          ? 'Esta reunião já está vinculada a este projeto.'
          : 'Não foi possível vincular o rito. Verifique se você participa do projeto.',
      );
    },
  });
}

export function useUnlinkProjectRito() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectRitoService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RITO_LINKS_KEY] });
      toast.success('Vínculo removido.');
    },
    onError: (error) => {
      console.error('Erro ao remover vínculo de rito:', error);
      toast.error('Não foi possível remover o vínculo.');
    },
  });
}
