import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityCardType, ActivityColumnName, UpdateActivityInput } from '@/types/projectActivity';
import { getEmployeeDirectoryMap } from '@/services/employeeDirectoryService';

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
  // Block/unblock: tracked as a single "blocked" entry to keep history readable
  if (updates.isBlocked !== undefined && updates.isBlocked !== prev.is_blocked) {
    rows.push({
      field: 'blocked',
      old_value: prev.is_blocked ? 'true' : 'false',
      new_value: updates.isBlocked
        ? `true: ${(updates.blockedReason ?? '').trim()}`
        : 'false',
    });
  }
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

export const useCardHistory = (cardId: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['card-history', cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_activity_card_history')
        .select('*')
        .eq('card_id', cardId)
        .order('changed_at', { ascending: false });
      if (error) throw error;

      const directory = await getEmployeeDirectoryMap(queryClient);
      return (data || []).map((entry) => {
        const author = entry.changed_by ? directory.get(entry.changed_by) : undefined;
        return {
          ...entry,
          changed_by_employee: author ? { nome: author.nome, foto_url: author.foto_url } : null,
        };
      }) as CardHistoryEntry[];
    },
    enabled: !!cardId,
  });
};

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
      if (updates.targetSprintId !== undefined) payload.target_sprint_id = updates.targetSprintId;
      if (updates.releaseId      !== undefined) payload.release_id       = updates.releaseId;

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

// ── Archive card ─────────────────────────────────────────────────────────────

export const useArchiveCard = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      tenantId,
    }: {
      id: string;
      projectId: string;
      tenantId: string;
    }) => {
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('project_activity_cards')
        .update({ is_archived: true, archived_at: now, archived_by: employee!.id, updated_at: now })
        .eq('id', id);
      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('project_activity_card_history')
        .insert({
          card_id:    id,
          tenant_id:  tenantId,
          changed_by: employee!.id,
          field:      'archived',
          old_value:  'false',
          new_value:  'true',
        });
      if (historyError) throw historyError;

      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', data.projectId] });
      toast({ title: 'Card arquivado' });
    },
    onError: () => {
      toast({ title: 'Erro ao arquivar card', variant: 'destructive' });
    },
  });
};

// ── Archived cards query ──────────────────────────────────────────────────────

export interface ArchivedCardRow {
  id: string;
  title: string;
  card_type: string;
  column_name: string;
  tenant_id: string;
  archived_at: string | null;
  archived_by: string | null;
  points: number | null;
  assignee_id: string | null;
  card_type_label?: string;
  archived_by_employee: { nome: string } | null;
}

export const useArchivedCards = (projectId: string | undefined) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['archived-cards', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_activity_cards')
        .select('id, title, card_type, column_name, tenant_id, archived_at, archived_by, points, assignee_id')
        .eq('project_id', projectId!)
        .eq('is_archived', true)
        .order('archived_at', { ascending: false });
      if (error) throw error;

      const directory = await getEmployeeDirectoryMap(queryClient);
      return (data || []).map((card) => {
        const archiver = card.archived_by ? directory.get(card.archived_by) : undefined;
        return {
          ...card,
          archived_by_employee: archiver ? { nome: archiver.nome } : null,
        };
      }) as ArchivedCardRow[];
    },
    enabled: !!projectId,
  });
};

// ── Restore card ─────────────────────────────────────────────────────────────

export const useRestoreCard = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
      tenantId,
    }: {
      id: string;
      projectId: string;
      tenantId: string;
    }) => {
      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('project_activity_cards')
        .update({ is_archived: false, archived_at: null, archived_by: null, updated_at: now })
        .eq('id', id);
      if (updateError) throw updateError;

      const { error: historyError } = await supabase
        .from('project_activity_card_history')
        .insert({
          card_id:    id,
          tenant_id:  tenantId,
          changed_by: employee!.id,
          field:      'archived',
          old_value:  'true',
          new_value:  'false',
        });
      if (historyError) throw historyError;

      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-activities', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['archived-cards', data.projectId] });
      toast({ title: 'Card restaurado' });
    },
    onError: () => {
      toast({ title: 'Erro ao restaurar card', variant: 'destructive' });
    },
  });
};

// ── Permanent delete (admin only) ─────────────────────────────────────────────

export const useDeleteCardPermanently = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_activity_cards')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['archived-cards', data.projectId] });
      toast({ title: 'Card excluído permanentemente' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir card', variant: 'destructive' });
    },
  });
};
