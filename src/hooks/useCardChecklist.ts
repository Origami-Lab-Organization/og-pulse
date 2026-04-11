import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { checklistService } from '@/services/checklistService';
import { CardChecklistItemDB, ChecklistTemplateDB, ChecklistType } from '@/types/projectActivity';

// ── Template hooks ────────────────────────────────────────────────────────────

export const useChecklistTemplates = (projectId: string | undefined) =>
  useQuery({
    queryKey: ['checklist-templates', projectId],
    queryFn: () => checklistService.getTemplates(projectId!),
    enabled: !!projectId,
    select: (data) => data as ChecklistTemplateDB[],
  });

export const useSaveChecklistTemplate = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      projectId,
      type,
      items,
    }: {
      projectId: string;
      type: ChecklistType;
      items: { text: string }[];
    }) => {
      await checklistService.upsertTemplate(projectId, employee!.tenant_id, type, items);
      return { projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates', projectId] });
      toast({ title: 'Checklist salvo' });
    },
    onError: () => {
      toast({ title: 'Erro ao salvar checklist', variant: 'destructive' });
    },
  });
};

// ── Card checklist hooks ──────────────────────────────────────────────────────

export const useCardChecklist = (cardId: string, type: ChecklistType) => {
  return useQuery({
    queryKey: ['card-checklist', cardId, type],
    queryFn: async () => {
      const all = await checklistService.getCardItems(cardId);
      return all.filter((i) => i.type === type);
    },
    enabled: !!cardId,
  });
};

export const useToggleChecklistItem = (cardId: string, cardTenantId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async ({
      item,
      isChecked,
    }: {
      item: CardChecklistItemDB;
      isChecked: boolean;
    }) => {
      await checklistService.toggleItem(item.id, isChecked);

      // Registrar no histórico do card
      await supabase.from('project_activity_card_history').insert({
        card_id: cardId,
        tenant_id: cardTenantId,
        changed_by: employee!.id,
        field: item.type,
        old_value: isChecked ? `[ ] ${item.item_text}` : `[x] ${item.item_text}`,
        new_value: isChecked ? `[x] ${item.item_text}` : `[ ] ${item.item_text}`,
      });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['card-checklist', cardId, vars.item.type] });
      queryClient.invalidateQueries({ queryKey: ['card-history', cardId] });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar item', variant: 'destructive' });
    },
  });
};
