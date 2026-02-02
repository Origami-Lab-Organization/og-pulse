import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ProjectSupplierDB,
  ProjectMaterialDB,
  CreateProjectSupplierInput,
  CreateProjectMaterialInput,
} from '@/types/project';

// Project Suppliers hooks
export const useProjectSuppliers = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project-suppliers', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_suppliers')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ProjectSupplierDB[];
    },
    enabled: !!projectId,
  });
};

export const useAddProjectSupplier = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateProjectSupplierInput) => {
      const { data, error } = await supabase
        .from('project_suppliers')
        .insert({
          project_id: input.projectId,
          supplier_id: input.supplierId || null,
          name: input.name,
          description: input.description || null,
          monthly_value: input.monthlyValue,
          start_month: input.startMonth,
          end_month: input.endMonth || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-suppliers', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      toast({
        title: 'Fornecedor adicionado',
        description: 'O fornecedor foi adicionado ao projeto.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar fornecedor',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useRemoveProjectSupplier = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-suppliers', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
      toast({
        title: 'Fornecedor removido',
        description: 'O fornecedor foi removido do projeto.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover fornecedor',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

// Project Materials hooks
export const useProjectMaterials = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project-materials', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('project_materials')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ProjectMaterialDB[];
    },
    enabled: !!projectId,
  });
};

export const useAddProjectMaterial = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateProjectMaterialInput) => {
      const { data, error } = await supabase
        .from('project_materials')
        .insert({
          project_id: input.projectId,
          description: input.description,
          value: input.value,
          purchase_date: input.purchaseDate || null,
          is_realized: input.isRealized || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-materials', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.projectId] });
      toast({
        title: 'Material adicionado',
        description: 'O material foi adicionado ao projeto.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar material',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateProjectMaterial = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      updates,
    }: {
      id: string;
      projectId: string;
      updates: { isRealized?: boolean; value?: number; description?: string; purchaseDate?: string };
    }) => {
      const updateData: Record<string, unknown> = {};
      if (updates.isRealized !== undefined) updateData.is_realized = updates.isRealized;
      if (updates.value !== undefined) updateData.value = updates.value;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.purchaseDate !== undefined) updateData.purchase_date = updates.purchaseDate;

      const { data, error } = await supabase
        .from('project_materials')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['project-materials', result.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', result.projectId] });
      toast({
        title: 'Material atualizado',
        description: 'O material foi atualizado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar material',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useRemoveProjectMaterial = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-materials', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
      toast({
        title: 'Material removido',
        description: 'O material foi removido do projeto.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover material',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
