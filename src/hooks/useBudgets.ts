import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { budgetService } from '@/services/budgetService';
import { CreateBudgetInput, UpdateBudgetInput, BudgetStatus } from '@/types/budget';
import { useToast } from '@/hooks/use-toast';

export function useBudgets() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['budgets', tenantId],
    queryFn: () => budgetService.getAll(tenantId!),
    enabled: !!tenantId,
  });
}

export function useBudget(id: string | null) {
  return useQuery({
    queryKey: ['budget', id],
    queryFn: () => budgetService.getById(id!),
    enabled: !!id,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;
  const createdBy = employee?.id;

  return useMutation({
    mutationFn: (input: CreateBudgetInput) =>
      budgetService.create(input, tenantId!, createdBy!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Sucesso',
        description: 'Orçamento criado com sucesso!',
      });
    },
    onError: (error: any) => {
      console.error('Error creating budget:', error);
      toast({
        title: 'Erro ao criar orçamento',
        description: error?.message || error?.details || JSON.stringify(error),
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const createdBy = employee?.id;

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBudgetInput }) =>
      budgetService.update(id, input, createdBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budget-versions'] });
      toast({
        title: 'Sucesso',
        description: 'Orçamento atualizado com sucesso!',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar orçamento. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateBudgetStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: BudgetStatus }) =>
      budgetService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Sucesso',
        description: 'Status atualizado com sucesso!',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar status. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => budgetService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Sucesso',
        description: 'Orçamento excluído com sucesso!',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir orçamento. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useDuplicateBudget() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;
  const createdBy = employee?.id;

  return useMutation({
    mutationFn: (id: string) =>
      budgetService.duplicate(id, tenantId!, createdBy!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: 'Sucesso',
        description: 'Orçamento duplicado com sucesso!',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao duplicar orçamento. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}
