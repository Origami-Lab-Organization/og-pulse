import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { terminationService, TerminationFilters, TerminationWithEmployee } from '@/services/terminationService';
import { EmployeeTerminationFormData } from '@/types/termination';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useTerminations = (filters: TerminationFilters = {}) => {
  return useQuery({
    queryKey: ['terminations', filters],
    queryFn: () => terminationService.getAll(filters),
  });
};

export const useTerminationDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: ['termination', id],
    queryFn: () => terminationService.getById(id!),
    enabled: !!id,
  });
};

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
      toast({ title: 'Desligamento criado', description: 'Processo de desligamento iniciado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar desligamento', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateTermination = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<EmployeeTerminationFormData> }) =>
      terminationService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminations'] });
      queryClient.invalidateQueries({ queryKey: ['termination'] });
      toast({ title: 'Desligamento atualizado', description: 'Processo atualizado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });
};

export const useCancelTermination = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => terminationService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terminations'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: 'Desligamento cancelado', description: 'O processo foi cancelado e o funcionário reativado.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao cancelar', description: error.message, variant: 'destructive' });
    },
  });
};
