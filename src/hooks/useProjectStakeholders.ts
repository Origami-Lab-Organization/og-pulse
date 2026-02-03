import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ProjectStakeholder,
  CreateStakeholderInput,
  UpdateStakeholderInput,
  InfluenceLevel,
  InterestLevel,
} from '@/types/projectStakeholder';

export const useProjectStakeholders = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project-stakeholders', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_stakeholders')
        .select('*')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data.map((s) => ({
        ...s,
        influence_level: s.influence_level as InfluenceLevel | null,
        interest_level: s.interest_level as InterestLevel | null,
      })) as ProjectStakeholder[];
    },
    enabled: !!projectId,
  });
};

export const useCreateStakeholder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateStakeholderInput) => {
      const { data, error } = await supabase
        .from('project_stakeholders')
        .insert({
          project_id: input.projectId,
          name: input.name,
          role: input.role,
          organization: input.organization || null,
          email: input.email || null,
          phone: input.phone || null,
          influence_level: input.influenceLevel || null,
          interest_level: input.interestLevel || null,
          notes: input.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-stakeholders', variables.projectId] });
      toast({
        title: 'Stakeholder adicionado',
        description: 'O stakeholder foi adicionado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar stakeholder',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateStakeholder = () => {
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
      updates: UpdateStakeholderInput;
    }) => {
      const { data, error } = await supabase
        .from('project_stakeholders')
        .update({
          name: updates.name,
          role: updates.role,
          organization: updates.organization,
          email: updates.email,
          phone: updates.phone,
          influence_level: updates.influenceLevel,
          interest_level: updates.interestLevel,
          notes: updates.notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['project-stakeholders', result.projectId] });
      toast({
        title: 'Stakeholder atualizado',
        description: 'O stakeholder foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar stakeholder',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteStakeholder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('project_stakeholders').delete().eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-stakeholders', data.projectId] });
      toast({
        title: 'Stakeholder removido',
        description: 'O stakeholder foi removido com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover stakeholder',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
