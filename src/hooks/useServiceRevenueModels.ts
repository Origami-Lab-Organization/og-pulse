import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceRevenueModelService } from '@/services/serviceRevenueModelService';
import {
  dbToServiceRevenueModel,
  CreateServiceRevenueModelInput,
} from '@/types/serviceRevenueModel';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useServiceRevenueModels = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['service-revenue-models', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const data = await serviceRevenueModelService.getAll(tenantId);
      return data.map(dbToServiceRevenueModel);
    },
    enabled: !!tenantId,
  });
};

export const useCreateServiceRevenueModel = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async (input: CreateServiceRevenueModelInput) => {
      if (!tenantId) throw new Error('No tenant ID');
      return serviceRevenueModelService.create(input, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-revenue-models'] });
      toast({ title: 'Modelo de receita criado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar modelo', description: error.message || undefined, variant: 'destructive' });
    },
  });
};

export const useUpdateServiceRevenueModel = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CreateServiceRevenueModelInput>;
    }) => {
      return serviceRevenueModelService.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-revenue-models'] });
      toast({ title: 'Modelo de receita atualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar modelo', description: error.message || undefined, variant: 'destructive' });
    },
  });
};

export const useToggleServiceRevenueModelActive = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return serviceRevenueModelService.toggleActive(id, isActive);
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['service-revenue-models'] });
      toast({ title: isActive ? 'Modelo ativado' : 'Modelo desativado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteServiceRevenueModel = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await serviceRevenueModelService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-revenue-models'] });
      toast({ title: 'Modelo de receita excluído' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir modelo',
        description: error.message || 'Ocorreu um erro ao excluir o modelo.',
        variant: 'destructive',
      });
    },
  });
};
