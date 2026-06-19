import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceLineService } from '@/services/serviceLineService';
import { dbToServiceLine, CreateServiceLineInput } from '@/types/serviceLine';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useServiceLines = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['service-lines', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const data = await serviceLineService.getAll(tenantId);
      return data.map(dbToServiceLine);
    },
    enabled: !!tenantId,
  });
};

export const useCreateServiceLine = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async (input: CreateServiceLineInput) => {
      if (!tenantId) throw new Error('No tenant ID');
      return serviceLineService.create(input, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-lines'] });
      toast({ title: 'Linha de serviço criada', description: 'A linha foi criada com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar linha', description: error.message || undefined, variant: 'destructive' });
    },
  });
};

export const useUpdateServiceLine = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateServiceLineInput> }) => {
      return serviceLineService.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-lines'] });
      toast({ title: 'Linha de serviço atualizada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar linha', description: error.message || undefined, variant: 'destructive' });
    },
  });
};

export const useToggleServiceLineActive = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return serviceLineService.toggleActive(id, isActive);
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['service-lines'] });
      toast({ title: isActive ? 'Linha ativada' : 'Linha desativada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteServiceLine = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await serviceLineService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-lines'] });
      toast({ title: 'Linha de serviço excluída' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir linha',
        description: error.message || 'Ocorreu um erro ao excluir a linha.',
        variant: 'destructive',
      });
    },
  });
};
