import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProjectSupplierActualDB {
  id: string;
  project_supplier_id: string;
  month_number: number;
  value: number;
  invoice_number: string | null;
  invoice_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateSupplierActualInput {
  projectSupplierId: string;
  monthNumber: number;
  value: number;
  invoiceNumber?: string;
  invoiceDate?: string;
  notes?: string;
}

export const useProjectSupplierActuals = (projectSupplierIds: string[]) => {
  return useQuery({
    queryKey: ['project-supplier-actuals', projectSupplierIds],
    queryFn: async () => {
      if (projectSupplierIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('project_supplier_actuals')
        .select('*')
        .in('project_supplier_id', projectSupplierIds)
        .order('month_number', { ascending: true });

      if (error) throw error;
      return data as ProjectSupplierActualDB[];
    },
    enabled: projectSupplierIds.length > 0,
  });
};

export const useCreateSupplierActual = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateSupplierActualInput) => {
      const { data, error } = await supabase
        .from('project_supplier_actuals')
        .insert({
          project_supplier_id: input.projectSupplierId,
          month_number: input.monthNumber,
          value: input.value,
          invoice_number: input.invoiceNumber || null,
          invoice_date: input.invoiceDate || null,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-supplier-actuals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      toast({
        title: 'Custo registrado',
        description: 'O valor real do fornecedor foi registrado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao registrar custo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpsertSupplierActual = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateSupplierActualInput) => {
      const { data, error } = await supabase
        .from('project_supplier_actuals')
        .upsert(
          {
            project_supplier_id: input.projectSupplierId,
            month_number: input.monthNumber,
            value: input.value,
            invoice_number: input.invoiceNumber || null,
            invoice_date: input.invoiceDate || null,
            notes: input.notes || null,
          },
          { onConflict: 'project_supplier_id,month_number' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-supplier-actuals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar custo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteSupplierActual = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('project_supplier_actuals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-supplier-actuals'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
      toast({
        title: 'Custo removido',
        description: 'O registro foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover custo',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
