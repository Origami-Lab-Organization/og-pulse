import { supabase } from '@/integrations/supabase/client';
import { CardChecklistItemDB, ChecklistTemplateDB, ChecklistType } from '@/types/projectActivity';

export const checklistService = {
  async getTemplates(projectId: string): Promise<ChecklistTemplateDB[]> {
    const { data, error } = await supabase
      .from('project_activity_checklist_templates')
      .select('*')
      .eq('project_id', projectId);
    if (error) throw error;
    return (data || []) as ChecklistTemplateDB[];
  },

  async getCardItems(cardId: string): Promise<CardChecklistItemDB[]> {
    const { data, error } = await supabase
      .from('project_activity_card_checklist')
      .select('*')
      .eq('card_id', cardId)
      .order('position');
    if (error) throw error;
    return (data || []) as CardChecklistItemDB[];
  },

  async seedFromTemplates(cardId: string, projectId: string): Promise<void> {
    const templates = await checklistService.getTemplates(projectId);
    if (templates.length === 0) return;

    const rows: { card_id: string; type: ChecklistType; item_text: string; position: number }[] = [];
    for (const tmpl of templates) {
      tmpl.items.forEach((item, idx) => {
        rows.push({
          card_id: cardId,
          type: tmpl.type,
          item_text: item.text,
          position: idx,
        });
      });
    }
    if (rows.length === 0) return;

    const { error } = await supabase
      .from('project_activity_card_checklist')
      .insert(rows);
    if (error) throw error;
  },

  async toggleItem(id: string, isChecked: boolean): Promise<void> {
    const { error } = await supabase
      .from('project_activity_card_checklist')
      .update({ is_checked: isChecked })
      .eq('id', id);
    if (error) throw error;
  },
};
