import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  ProjectMilestone,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  MilestoneStatus,
} from '@/types/projectMilestone';

export const useProjectMilestones = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_milestones')
        .select('*')
        .eq('project_id', projectId!)
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data.map((m) => ({
        ...m,
        status: m.status as MilestoneStatus,
      })) as ProjectMilestone[];
    },
    enabled: !!projectId,
  });
};

export const useCreateMilestone = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateMilestoneInput) => {
      const { data, error } = await supabase
        .from('project_milestones')
        .insert({
          project_id: input.projectId,
          title: input.title,
          deliverables: input.deliverables || null,
          start_date: input.startDate,
          end_date: input.endDate,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', variables.projectId] });
      toast({
        title: 'Marco criado',
        description: 'O marco foi adicionado ao cronograma.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar marco',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateMilestone = () => {
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
      updates: UpdateMilestoneInput;
    }) => {
      const { data, error } = await supabase
        .from('project_milestones')
        .update({
          title: updates.title,
          deliverables: updates.deliverables,
          start_date: updates.startDate,
          end_date: updates.endDate,
          completed_date: updates.completedDate,
          status: updates.status,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', result.projectId] });
      toast({
        title: 'Marco atualizado',
        description: 'O marco foi atualizado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar marco',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteMilestone = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('project_milestones').delete().eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', data.projectId] });
      toast({
        title: 'Marco excluído',
        description: 'O marco foi removido do cronograma.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir marco',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
