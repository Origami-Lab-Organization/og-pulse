import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { vacationService, VacationRequester } from '@/services/vacationService';
import { computeBalanceFromRequests } from '@/lib/vacationBalanceCalculator';
import { CreateVacationRequestInput } from '@/types/vacation';

function buildRequester(employee: ReturnType<typeof useAuth>['employee']): VacationRequester | null {
  if (!employee) return null;
  return {
    employeeId: employee.id,
    tenantId: employee.tenant_id,
    nome: employee.nome,
    isAdmin: employee.isAdmin,
    isManager: employee.is_gerente,
  };
}

/** Perfil + pedidos + saldo do funcionário logado.
 *  A eligibilidade depende só do perfil; uma falha ao listar pedidos não pode
 *  fazer a tela concluir, erroneamente, que o contrato não tem direito a férias. */
export function useMyVacation() {
  const { employee } = useAuth();
  return useQuery({
    queryKey: ['vacation', 'my', employee?.id],
    enabled: !!employee?.id,
    retry: 1,
    queryFn: async () => {
      const employeeId = employee!.id;
      // Perfil precisa carregar — é o que define eligibilidade e a data de admissão.
      const profile = await vacationService.getEmployeeProfile(employeeId);

      // Pedidos são best-effort: se a tabela ainda não existir / falhar, mostramos
      // o saldo acumulado mesmo assim e sinalizamos o erro, sem bloquear a tela.
      let requests: Awaited<ReturnType<typeof vacationService.listMyRequests>> = [];
      let requestsError = false;
      try {
        requests = await vacationService.listMyRequests(employeeId);
      } catch (e) {
        requestsError = true;
        console.error('Erro ao listar solicitações de férias:', e);
      }

      const balance = computeBalanceFromRequests(profile.admissionDate ?? '', requests);
      return { profile, requests, balance, requestsError };
    },
  });
}

export function usePendingVacationApprovals() {
  const { employee } = useAuth();
  const canApprove = !!employee && (employee.is_gerente || employee.isAdmin);
  return useQuery({
    queryKey: ['vacation', 'pending', employee?.id],
    enabled: canApprove,
    retry: 1,
    queryFn: () => vacationService.listPendingApprovals(employee!.id),
  });
}

export function usePendingVacationApprovalsCount() {
  const { employee } = useAuth();
  const canApprove = !!employee && (employee.is_gerente || employee.isAdmin);
  return useQuery({
    queryKey: ['vacation', 'pending-count', employee?.id],
    enabled: canApprove,
    refetchInterval: 30000,
    queryFn: async () => (await vacationService.listPendingApprovals(employee!.id)).length,
  });
}

export function useTeamVacationRequests() {
  const { employee } = useAuth();
  const canApprove = !!employee && (employee.is_gerente || employee.isAdmin);
  return useQuery({
    queryKey: ['vacation', 'team', employee?.tenant_id, employee?.id],
    enabled: canApprove,
    retry: 1,
    queryFn: () => vacationService.listTeamRequests(buildRequester(employee)!),
  });
}

function useInvalidateVacation() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['vacation'] });
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
  };
}

export function useCreateVacationRequest() {
  const { employee } = useAuth();
  const invalidate = useInvalidateVacation();
  return useMutation({
    mutationFn: (input: CreateVacationRequestInput) => {
      const ctx = buildRequester(employee);
      if (!ctx) throw new Error('Não autenticado');
      return vacationService.createRequest(ctx, input);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Solicitação de férias enviada!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao solicitar férias: ' + (error?.message ?? 'tente novamente'));
    },
  });
}

export function useApproveVacation() {
  const { employee } = useAuth();
  const invalidate = useInvalidateVacation();
  return useMutation({
    mutationFn: (requestId: string) => {
      const ctx = buildRequester(employee);
      if (!ctx) throw new Error('Não autenticado');
      return vacationService.approve(ctx, requestId);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Férias aprovadas.');
    },
    onError: (error: Error) => {
      toast.error('Erro ao aprovar: ' + (error?.message ?? 'tente novamente'));
    },
  });
}

export function useRejectVacation() {
  const { employee } = useAuth();
  const invalidate = useInvalidateVacation();
  return useMutation({
    mutationFn: (params: { requestId: string; reason: string }) => {
      const ctx = buildRequester(employee);
      if (!ctx) throw new Error('Não autenticado');
      return vacationService.reject(ctx, params.requestId, params.reason);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Solicitação recusada.');
    },
    onError: (error: Error) => {
      toast.error('Erro ao recusar: ' + (error?.message ?? 'tente novamente'));
    },
  });
}

export function useCancelVacationRequest() {
  const { employee } = useAuth();
  const invalidate = useInvalidateVacation();
  return useMutation({
    mutationFn: (requestId: string) => {
      if (!employee) throw new Error('Não autenticado');
      return vacationService.cancelRequest(employee.id, requestId);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Solicitação cancelada.');
    },
    onError: (error: Error) => {
      toast.error('Erro ao cancelar: ' + (error?.message ?? 'tente novamente'));
    },
  });
}
