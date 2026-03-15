import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceService } from '@/services/serviceService';
import { dbToService, CreateServiceInput, DEFAULT_SERVICES } from '@/types/service';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useServices = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['services', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const data = await serviceService.getAll(tenantId);
      return data.map(dbToService);
    },
    enabled: !!tenantId,
  });
};

export const useSeedDefaultServices = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('No tenant ID');
      await serviceService.seedDefaults(tenantId, DEFAULT_SERVICES);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async (input: CreateServiceInput) => {
      if (!tenantId) throw new Error('No tenant ID');
      return serviceService.create(input, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({ title: 'Serviço cadastrado', description: 'O serviço foi cadastrado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao cadastrar serviço', description: error.message || undefined, variant: 'destructive' });
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateServiceInput> }) => {
      return serviceService.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({ title: 'Serviço atualizado', description: 'O serviço foi atualizado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar serviço', description: error.message || undefined, variant: 'destructive' });
    },
  });
};

export const useToggleServiceActive = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return serviceService.toggleActive(id, isActive);
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({ title: isActive ? 'Serviço ativado' : 'Serviço desativado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!tenantId) throw new Error('No tenant ID');
      await serviceService.delete(id, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast({ title: 'Serviço excluído', description: 'O serviço foi excluído com sucesso.' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir serviço',
        description: error.message || 'Ocorreu um erro ao excluir o serviço.',
        variant: 'destructive',
      });
    },
  });
};
