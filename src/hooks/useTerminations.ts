import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { terminationService, TerminationFilters, TerminationWithEmployee } from '@/services/terminationService';
import { EmployeeTerminationFormData, TerminationStatus } from '@/types/termination';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// ─── List with filters & pagination ────────────────────────────
export const useTerminations = (filters: TerminationFilters = {}) => {
  return useQuery({
    queryKey: ['terminations', filters],
    queryFn: () => terminationService.getAll(filters),
    staleTime: 2 * 60 * 1000, // 2 min
  });
};

// ─── Single detail (employee + docs + adjustments) ─────────────
export const useTermination = (id: string | undefined) => {
  return useQuery({
    queryKey: ['termination', id],
    queryFn: () => terminationService.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 min
  });
};

// ─── Create ────────────────────────────────────────────────────
export const useCreateTermination = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: (data: EmployeeTerminationFormData) =>
      terminationService.create(data, employee?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminations'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      // Folha de Pagamento/Custo x Hora leem termination_type/is_just_cause/notice_* ao vivo
      // (usePayrollHistory.ts) — sem isso, ficam com os dados de antes do desligamento até o
      // cache expirar (staleTime de 2min) ou a página ser recarregada.
      queryClient.invalidateQueries({ queryKey: ['payroll-history-raw'] });
      toast({ title: 'Desligamento criado', description: 'Processo de desligamento iniciado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar desligamento', description: error.message, variant: 'destructive' });
    },
  });
};

// ─── Update (optimistic) ──────────────────────────────────────
export const useUpdateTermination = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<EmployeeTerminationFormData> }) =>
      terminationService.update(id, updates),

    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['termination', id] });
      const previous = queryClient.getQueryData(['termination', id]);

      queryClient.setQueryData(['termination', id], (old: any) => {
        if (!old) return old;
        return { ...old, ...updates };
      });

      return { previous, id };
    },

    onError: (error: Error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['termination', context.id], context.previous);
      }
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },

    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: ['termination', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['terminations'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-history-raw'] });
    },

    onSuccess: () => {
      toast({ title: 'Desligamento atualizado', description: 'Processo atualizado com sucesso.' });
    },
  });
};

// ─── Cancel ───────────────────────────────────────────────────
export const useCancelTermination = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => terminationService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminations'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['termination'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-history-raw'] });
      toast({ title: 'Desligamento cancelado', description: 'O processo foi cancelado e o funcionário reativado.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao cancelar', description: error.message, variant: 'destructive' });
    },
  });
};
