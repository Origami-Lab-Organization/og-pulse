import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  ActivityCardType,
  ActivityColumnName,
  CreateActivityInput,
  ProjectActivityCardWithRelations,
  UpdateActivityInput,
} from '@/types/projectActivity';
import { checklistService } from '@/services/checklistService';

export const useProjectActivities = (projectId: string | undefined) => {
  return useQuery({
    queryKey: ['project-activities', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_activity_cards')
        .select('*, assignee:employees!project_activity_cards_assignee_id_fkey(id, nome, foto_url), card_tags:project_activity_card_tags(*, tag:project_activity_tags(*)), card_checklist:project_activity_card_checklist(id, type, is_checked), card_tasks:project_activity_tasks(id, completed_at)')
        .eq('project_id', projectId!)
        .order('column_name')
        .order('position');

      if (error) throw error;
      return (data || []) as ProjectActivityCardWithRelations[];
    },
    enabled: !!projectId,
  });
};

export const useCreateActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateActivityInput) => {
      const { data, error } = await supabase
        .from('project_activity_cards')
        .insert({
          project_id: input.projectId,
          tenant_id: employee!.tenant_id,
          title: input.title,
          card_type: (input.cardType ?? 'story') as ActivityCardType,
          user_story: input.userStory ?? null,
          acceptance_criteria: input.acceptanceCriteria ?? null,
          points: input.points ?? null,
          assignee_id: input.assigneeId ?? null,
          column_name: (input.columnName ?? 'product_backlog') as ActivityColumnName,
          sprint_id: input.sprintId ?? null,
          is_blocked: input.isBlocked ?? false,
          blocked_reason: input.blockedReason ?? null,
          created_by: employee!.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (newCard, variables) => {
      // Semeia checklist a partir dos templates do projeto
      try {
        await checklistService.seedFromTemplates(newCard.id, variables.projectId, newCard.card_type as ActivityCardType);
      } catch {
        // templates ausentes ou erro de seeding não impede a criação
      }
      queryClient.invalidateQueries({ queryKey: ['project-activities', variables.projectId] });
      toast({ title: 'Atividade criada' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar atividade', variant: 'destructive' });
    },
  });
};

export const useUpdateActivity = () => {
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
      updates: UpdateActivityInput;
    }) => {
      const { data, error } = await supabase
        .from('project_activity_cards')
        .update({
          title: updates.title,
          card_type: updates.cardType as ActivityCardType | undefined,
          user_story: updates.userStory,
          acceptance_criteria: updates.acceptanceCriteria,
          points: updates.points,
          assignee_id: updates.assigneeId,
          column_name: updates.columnName as ActivityColumnName | undefined,
          position: updates.position,
          sprint_id: updates.sprintId,
          is_blocked: updates.isBlocked,
          blocked_reason: updates.blockedReason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, projectId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', result.projectId] });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar atividade', variant: 'destructive' });
    },
  });
};

export const useDeleteActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase.from('project_activity_cards').delete().eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', data.projectId] });
      toast({ title: 'Atividade removida' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover atividade', variant: 'destructive' });
    },
  });
};

export const useMoveActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      columnName,
      position,
    }: {
      id: string;
      projectId: string;
      columnName: ActivityColumnName;
      position: number;
    }) => {
      const { error } = await supabase
        .from('project_activity_cards')
        .update({ column_name: columnName, position, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', data.projectId] });
    },
    onError: () => {
      toast({ title: 'Erro ao mover atividade', variant: 'destructive' });
    },
  });
};

export const useBatchUpdatePositions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      cards,
    }: {
      projectId: string;
      cards: { id: string; position: number }[];
    }) => {
      await Promise.all(
        cards.map(({ id, position }) =>
          supabase
            .from('project_activity_cards')
            .update({ position })
            .eq('id', id)
        )
      );
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] });
    },
  });
};
