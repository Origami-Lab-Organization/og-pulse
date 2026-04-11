import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityTaskWithRelations } from '@/types/projectActivity';

// ── Query ─────────────────────────────────────────────────────────────────────

export const useCardTasks = (cardId: string) =>
  useQuery({
    queryKey: ['card-tasks', cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_activity_tasks')
        .select('*, assignee:employees!project_activity_tasks_assignee_id_fkey(id, nome, foto_url)')
        .eq('card_id', cardId)
        .order('position');
      if (error) throw error;
      return (data || []) as ActivityTaskWithRelations[];
    },
    enabled: !!cardId,
  });

// ── Helpers ───────────────────────────────────────────────────────────────────

async function logHistory(
  cardId: string,
  tenantId: string,
  changedBy: string,
  field: string,
  oldValue: string | null,
  newValue: string | null
) {
  await supabase.from('project_activity_card_history').insert({
    card_id: cardId,
    tenant_id: tenantId,
    changed_by: changedBy,
    field,
    old_value: oldValue,
    new_value: newValue,
  });
}

// ── Create ────────────────────────────────────────────────────────────────────

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      cardId,
      tenantId,
      projectId,
      description,
      assigneeId,
      dueDate,
      position,
    }: {
      cardId: string;
      tenantId: string;
      projectId: string;
      description: string;
      assigneeId?: string;
      dueDate?: string;
      position: number;
    }) => {
      const { error } = await supabase.from('project_activity_tasks').insert({
        card_id:     cardId,
        tenant_id:   tenantId,
        description,
        assignee_id: assigneeId ?? null,
        due_date:    dueDate ?? null,
        created_by:  employee!.id,
        position,
      });
      if (error) throw error;

      // History
      await logHistory(cardId, tenantId, employee!.id, 'task_added', null, description);

      return { cardId, projectId };
    },
    onSuccess: ({ cardId, projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['card-tasks', cardId] });
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] });
    },
    onError: () => {
      toast({ title: 'Erro ao criar tarefa', variant: 'destructive' });
    },
  });
};

// ── Update ────────────────────────────────────────────────────────────────────

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      cardId,
      description,
      assigneeId,
      dueDate,
    }: {
      id: string;
      cardId: string;
      description: string;
      assigneeId: string | null;
      dueDate: string | null;
    }) => {
      const { error } = await supabase
        .from('project_activity_tasks')
        .update({ description, assignee_id: assigneeId, due_date: dueDate })
        .eq('id', id);
      if (error) throw error;
      return { cardId };
    },
    onSuccess: ({ cardId }) => {
      queryClient.invalidateQueries({ queryKey: ['card-tasks', cardId] });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar tarefa', variant: 'destructive' });
    },
  });
};

// ── Toggle completion ─────────────────────────────────────────────────────────

export const useToggleTask = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      task,
      tenantId,
      projectId,
    }: {
      task: ActivityTaskWithRelations;
      tenantId: string;
      projectId: string;
    }) => {
      const completing = !task.completed_at;
      const completedAt = completing ? new Date().toISOString() : null;

      const { error } = await supabase
        .from('project_activity_tasks')
        .update({ completed_at: completedAt })
        .eq('id', task.id);
      if (error) throw error;

      // History
      await logHistory(
        task.card_id,
        tenantId,
        employee!.id,
        'task_completed',
        completing ? `[ ] ${task.description}` : `[x] ${task.description}`,
        completing ? `[x] ${task.description}` : `[ ] ${task.description}`
      );

      return { cardId: task.card_id, projectId };
    },
    onSuccess: ({ cardId, projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['card-tasks', cardId] });
      queryClient.invalidateQueries({ queryKey: ['card-history', cardId] });
      queryClient.invalidateQueries({ queryKey: ['project-activities', projectId] });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar tarefa', variant: 'destructive' });
    },
  });
};

// ── Delete ────────────────────────────────────────────────────────────────────

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, cardId }: { id: string; cardId: string }) => {
      const { error } = await supabase.from('project_activity_tasks').delete().eq('id', id);
      if (error) throw error;
      return { cardId };
    },
    onSuccess: ({ cardId }) => {
      queryClient.invalidateQueries({ queryKey: ['card-tasks', cardId] });
    },
    onError: () => {
      toast({ title: 'Erro ao remover tarefa', variant: 'destructive' });
    },
  });
};
