import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityCardType, ActivityColumnName, UpdateActivityInput } from '@/types/projectActivity';

// Fields tracked in history (column_name is handled by the DB trigger)
type HistoryEntry = {
  field: string;
  old_value: string | null;
  new_value: string | null;
};

function buildHistoryEntries(
  updates: UpdateActivityInput,
  prev: PreviousCardValues
): HistoryEntry[] {
  const rows: HistoryEntry[] = [];

  const compare = (field: string, newVal: string | null | undefined, oldVal: string | null | undefined) => {
    const n = newVal ?? null;
    const o = oldVal ?? null;
    if (n !== o) rows.push({ field, old_value: o, new_value: n });
  };

  if (updates.title !== undefined) compare('title', updates.title, prev.title);
  if (updates.cardType !== undefined) compare('card_type', updates.cardType, prev.card_type);
  if (updates.points !== undefined) compare('points', updates.points?.toString(), prev.points?.toString());
  if (updates.assigneeId !== undefined) compare('assignee_id', updates.assigneeId, prev.assignee_id);
  if (updates.userStory !== undefined) compare('user_story', updates.userStory, prev.user_story);
  if (updates.acceptanceCriteria !== undefined) compare('acceptance_criteria', updates.acceptanceCriteria, prev.acceptance_criteria);
  if (updates.isBlocked !== undefined) compare('is_blocked', String(updates.isBlocked), String(prev.is_blocked));
  if (updates.blockedReason !== undefined) compare('blocked_reason', updates.blockedReason, prev.blocked_reason);
  // columnName skipped — DB trigger handles it

  return rows;
}

export interface PreviousCardValues {
  title: string;
  card_type: string | null;
  points: number | null;
  assignee_id: string | null;
  user_story: string | null;
  acceptance_criteria: string | null;
  is_blocked: boolean;
  blocked_reason: string | null;
}

export interface CardHistoryEntry {
  id: string;
  card_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
  changed_by_employee: {
    nome: string;
    foto_url: string | null;
  } | null;
}

export const useCardHistory = (cardId: string) =>
  useQuery({
    queryKey: ['card-history', cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_activity_card_history')
        .select('*, changed_by_employee:employees!project_activity_card_history_changed_by_fkey(nome, foto_url)')
        .eq('card_id', cardId)
        .order('changed_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CardHistoryEntry[];
    },
    enabled: !!cardId,
  });

export const useUpdateActivityCard = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      tenantId,
      updates,
      previousCard,
    }: {
      id: string;
      projectId: string;
      tenantId: string;
      updates: UpdateActivityInput;
      previousCard: PreviousCardValues;
    }) => {
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.cardType !== undefined) payload.card_type = updates.cardType as ActivityCardType;
      if (updates.points !== undefined) payload.points = updates.points;
      if (updates.assigneeId !== undefined) payload.assignee_id = updates.assigneeId;
      if (updates.columnName !== undefined) payload.column_name = updates.columnName as ActivityColumnName;
      if (updates.position !== undefined) payload.position = updates.position;
      if (updates.userStory !== undefined) payload.user_story = updates.userStory;
      if (updates.acceptanceCriteria !== undefined) payload.acceptance_criteria = updates.acceptanceCriteria;
      if (updates.isBlocked !== undefined) payload.is_blocked = updates.isBlocked;
      if (updates.blockedReason !== undefined) payload.blocked_reason = updates.blockedReason;
      if (updates.sprintId !== undefined) payload.sprint_id = updates.sprintId;

      const { error: updateError } = await supabase
        .from('project_activity_cards')
        .update(payload)
        .eq('id', id);

      if (updateError) throw updateError;

      const historyEntries = buildHistoryEntries(updates, previousCard);
      if (historyEntries.length > 0) {
        const rows = historyEntries.map((e) => ({
          card_id: id,
          tenant_id: tenantId,
          changed_by: employee!.id,
          field: e.field,
          old_value: e.old_value,
          new_value: e.new_value,
        }));
        const { error: historyError } = await supabase
          .from('project_activity_card_history')
          .insert(rows);
        if (historyError) throw historyError;
      }

      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', data.projectId] });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar alteração', variant: 'destructive' });
    },
  });
};
