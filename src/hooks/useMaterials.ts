import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { materialService } from '@/services/materialService';
import { dbToMaterial, CreateMaterialInput } from '@/types/material';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useMaterials = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['materials', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const data = await materialService.getAll(tenantId);
      return data.map(dbToMaterial);
    },
    enabled: !!tenantId,
  });
};

export const useCreateMaterial = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async (input: CreateMaterialInput) => {
      if (!tenantId) throw new Error('No tenant ID');
      return materialService.create(input, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast({
        title: 'Material cadastrado',
        description: 'O material foi cadastrado com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error creating material:', error);
      toast({
        title: 'Erro ao cadastrar material',
        description: 'Ocorreu um erro ao cadastrar o material.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateMaterial = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateMaterialInput> }) => {
      return materialService.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast({
        title: 'Material atualizado',
        description: 'O material foi atualizado com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error updating material:', error);
      toast({
        title: 'Erro ao atualizar material',
        description: 'Ocorreu um erro ao atualizar o material.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteMaterial = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      await materialService.delete(id);
      return { name };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast({
        title: 'Material excluído',
        description: `${data.name} foi excluído com sucesso.`,
      });
    },
    onError: (error) => {
      console.error('Error deleting material:', error);
      toast({
        title: 'Erro ao excluir material',
        description: 'Ocorreu um erro ao excluir o material.',
        variant: 'destructive',
      });
    },
  });
};
