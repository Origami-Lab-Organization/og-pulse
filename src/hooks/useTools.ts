import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toolService } from '@/services/toolService';
import { dbToTool, CreateToolInput } from '@/types/tool';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useTools = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['tools', tenantId],
    queryFn: async () => {
      const data = await toolService.getAll(tenantId!);
      return data.map(dbToTool);
    },
    enabled: !!tenantId,
  });
};

export const useCreateTool = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async (input: CreateToolInput) => {
      if (!tenantId) throw new Error('No tenant ID');
      return toolService.create(input, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      toast({ title: 'Ferramenta cadastrada', description: 'A ferramenta foi cadastrada com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao cadastrar ferramenta', description: error.message || undefined, variant: 'destructive' });
    },
  });
};

export const useUpdateTool = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateToolInput> }) => {
      return toolService.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      toast({ title: 'Ferramenta atualizada', description: 'A ferramenta foi atualizada com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar ferramenta', description: error.message || undefined, variant: 'destructive' });
    },
  });
};

export const useToggleToolActive = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return toolService.toggleActive(id, isActive);
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      toast({ title: isActive ? 'Ferramenta ativada' : 'Ferramenta desativada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteTool = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      return toolService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      toast({ title: 'Ferramenta excluída', description: 'A ferramenta foi excluída com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir ferramenta', description: error.message || 'Ocorreu um erro ao excluir a ferramenta.', variant: 'destructive' });
    },
  });
};
