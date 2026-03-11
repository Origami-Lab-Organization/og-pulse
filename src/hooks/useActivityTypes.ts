import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
export interface ActivityType {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  applies_to_all: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  employee_count?: number;
}

export interface CreateActivityTypeInput {
  name: string;
  description?: string;
  applies_to_all: boolean;
  employee_ids?: string[];
}

export interface UpdateActivityTypeInput extends CreateActivityTypeInput {
  id: string;
}

const QUERY_KEY = 'activity-types';

export const useActivityTypes = () => {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_types')
        .select(`
          *,
          activity_type_employees(employee_id)
        `)
        .order('name');

      if (error) throw error;

      return (data || []).map((at: any) => ({
        ...at,
        employee_count: at.applies_to_all ? null : (at.activity_type_employees?.length ?? 0),
      })) as ActivityType[];
    },
  });
};

export const useCreateActivityType = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateActivityTypeInput) => {
      if (!employee?.tenant_id) throw new Error('Tenant não encontrado');
      const { data, error } = await supabase
        .from('activity_types')
        .insert([{
          tenant_id: employee.tenant_id,
          name: input.name,
          description: input.description || null,
          applies_to_all: input.applies_to_all,
        }])
        .select()
        .single();

      if (error) throw error;

      if (!input.applies_to_all && input.employee_ids && input.employee_ids.length > 0) {
        const { error: linkError } = await supabase
          .from('activity_type_employees')
          .insert(input.employee_ids.map(eid => ({ activity_type_id: data.id, employee_id: eid })));
        if (linkError) throw linkError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['my-activity-types'] });
      toast({ title: 'Atividade criada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar atividade', description: error.message, variant: 'destructive' });
    },
  });
};

export const useUpdateActivityType = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: UpdateActivityTypeInput) => {
      const { error } = await supabase
        .from('activity_types')
        .update({
          name: input.name,
          description: input.description || null,
          applies_to_all: input.applies_to_all,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id);

      if (error) throw error;

      // Replace employee assignments
      await supabase.from('activity_type_employees').delete().eq('activity_type_id', input.id);

      if (!input.applies_to_all && input.employee_ids && input.employee_ids.length > 0) {
        const { error: linkError } = await supabase
          .from('activity_type_employees')
          .insert(input.employee_ids.map(eid => ({ activity_type_id: input.id, employee_id: eid })));
        if (linkError) throw linkError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['my-activity-types'] });
      toast({ title: 'Atividade atualizada com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar atividade', description: error.message, variant: 'destructive' });
    },
  });
};

export const useToggleActivityTypeStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('activity_types')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['my-activity-types'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao alterar status', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteActivityType = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('activity_types').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['my-activity-types'] });
      toast({ title: 'Atividade excluída com sucesso' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir atividade', description: error.message, variant: 'destructive' });
    },
  });
};
