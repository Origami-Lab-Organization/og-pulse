import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { checklistService } from '@/services/checklistService';
import { CardChecklistItemDB, ChecklistType } from '@/types/projectActivity';

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
