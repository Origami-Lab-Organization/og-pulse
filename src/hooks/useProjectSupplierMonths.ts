import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ProjectSupplierMonthDB } from '@/types/project';

export const useProjectSupplierMonths = (projectSupplierIds: string[]) => {
  return useQuery({
    queryKey: ['project-supplier-months', projectSupplierIds],
    queryFn: async () => {
      if (projectSupplierIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('project_supplier_months')
        .select('*')
        .in('project_supplier_id', projectSupplierIds)
        .order('month_number', { ascending: true });

      if (error) throw error;
      return data as ProjectSupplierMonthDB[];
    },
    enabled: projectSupplierIds.length > 0,
  });
};

export const useUpsertSupplierMonth = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      projectSupplierId,
      monthNumber,
      value,
    }: {
      projectSupplierId: string;
      monthNumber: number;
      value: number;
    }) => {
      const { data, error } = await supabase
        .from('project_supplier_months')
        .upsert(
          {
            project_supplier_id: projectSupplierId,
            month_number: monthNumber,
            value,
          },
          { onConflict: 'project_supplier_id,month_number' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-supplier-months'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar valor',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteSupplierMonths = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectSupplierId: string) => {
      const { error } = await supabase
        .from('project_supplier_months')
        .delete()
        .eq('project_supplier_id', projectSupplierId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-supplier-months'] });
    },
  });
};
