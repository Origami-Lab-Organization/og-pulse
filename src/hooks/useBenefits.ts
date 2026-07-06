import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { benefitService } from '@/services/benefitService';
import { dbToBenefit, CreateBenefitInput } from '@/types/benefit';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useBenefits = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['benefits', tenantId],
    queryFn: async () => {
      const data = await benefitService.getAll(tenantId!);
      return data.map(dbToBenefit);
    },
    enabled: !!tenantId,
  });
};

export const useCreateBenefit = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async (input: CreateBenefitInput) => {
      if (!tenantId) throw new Error('No tenant ID');
      return benefitService.create(input, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefits'] });
      toast({ title: 'Benefício cadastrado', description: 'O benefício foi cadastrado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao cadastrar benefício', description: error.message || undefined, variant: 'destructive' });
    },
  });
};

export const useUpdateBenefit = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateBenefitInput> }) => {
      return benefitService.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefits'] });
      toast({ title: 'Benefício atualizado', description: 'O benefício foi atualizado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar benefício', description: error.message || undefined, variant: 'destructive' });
    },
  });
};

export const useToggleBenefitActive = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return benefitService.toggleActive(id, isActive);
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['benefits'] });
      toast({ title: isActive ? 'Benefício ativado' : 'Benefício desativado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteBenefit = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      return benefitService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['benefits'] });
      toast({ title: 'Benefício excluído', description: 'O benefício foi excluído com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir benefício', description: error.message || 'Ocorreu um erro ao excluir o benefício.', variant: 'destructive' });
    },
  });
};
