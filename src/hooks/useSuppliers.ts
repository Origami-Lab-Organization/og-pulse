import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supplierService } from '@/services/supplierService';
import { dbToSupplier, CreateSupplierInput } from '@/types/supplier';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useSuppliers = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['suppliers', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const data = await supplierService.getAll(tenantId);
      return data.map(dbToSupplier);
    },
    enabled: !!tenantId,
  });
};

export const useSearchSuppliers = (query: string) => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['suppliers', 'search', query, tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const data = await supplierService.search(query, tenantId);
      return data.map(dbToSupplier);
    },
    enabled: !!tenantId && query.length > 0,
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async (input: CreateSupplierInput) => {
      if (!tenantId) throw new Error('No tenant ID');
      return supplierService.create(input, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: 'Fornecedor cadastrado',
        description: 'O fornecedor foi cadastrado com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error creating supplier:', error);
      toast({
        title: 'Erro ao cadastrar fornecedor',
        description: 'Ocorreu um erro ao cadastrar o fornecedor.',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CreateSupplierInput> }) => {
      return supplierService.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: 'Fornecedor atualizado',
        description: 'O fornecedor foi atualizado com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error updating supplier:', error);
      toast({
        title: 'Erro ao atualizar fornecedor',
        description: 'Ocorreu um erro ao atualizar o fornecedor.',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, companyName }: { id: string; companyName: string }) => {
      await supplierService.delete(id);
      return { companyName };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({
        title: 'Fornecedor excluído',
        description: `${data.companyName} foi excluído com sucesso.`,
      });
    },
    onError: (error) => {
      console.error('Error deleting supplier:', error);
      toast({
        title: 'Erro ao excluir fornecedor',
        description: 'Ocorreu um erro ao excluir o fornecedor.',
        variant: 'destructive',
      });
    },
  });
};
