import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '@/services/clientService';
import { dbToClient, CreateClientInput } from '@/types/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useClients = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['clients', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const data = await clientService.getAll(tenantId);
      return data.map(dbToClient);
    },
    enabled: !!tenantId,
  });
};

export const useSearchClients = (query: string) => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['clients', 'search', query, tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const data = await clientService.search(query, tenantId);
      return data.map(dbToClient);
    },
    enabled: !!tenantId && query.length > 0,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async (input: CreateClientInput) => {
      if (!tenantId) throw new Error('No tenant ID');
      return clientService.create(input, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Cliente cadastrado',
        description: 'O cliente foi cadastrado com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error creating client:', error);
      toast({
        title: 'Erro ao cadastrar cliente',
        description: 'Ocorreu um erro ao cadastrar o cliente.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateClientInput> }) => {
      return clientService.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Cliente atualizado',
        description: 'O cliente foi atualizado com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error updating client:', error);
      toast({
        title: 'Erro ao atualizar cliente',
        description: 'Ocorreu um erro ao atualizar o cliente.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, companyName }: { id: string; companyName: string }) => {
      await clientService.delete(id);
      return { companyName };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Cliente excluído',
        description: `${data.companyName} foi excluído com sucesso.`,
      });
    },
    onError: (error) => {
      console.error('Error deleting client:', error);
      toast({
        title: 'Erro ao excluir cliente',
        description: 'Ocorreu um erro ao excluir o cliente.',
        variant: 'destructive',
      });
    },
  });
};
