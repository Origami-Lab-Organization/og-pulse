import { supabase } from '@/integrations/supabase/client';
import { ActivityCardType, CardChecklistItemDB, ChecklistTemplateDB, ChecklistType } from '@/types/projectActivity';

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

  /**
   * Seeds DoR and DoD checklist items for a newly-created card.
   * Combines common templates (card_type = null) with card-type-specific ones.
   * Common items are listed first; type-specific items follow.
   */
  async seedFromTemplates(
    cardId: string,
    projectId: string,
    cardType: ActivityCardType,
  ): Promise<void> {
    const templates = await checklistService.getTemplates(projectId);
    if (templates.length === 0) return;

    const relevant = templates.filter(
      (t) => t.card_type === null || t.card_type === cardType,
    );
    if (relevant.length === 0) return;

    // Collect items per checklist type (dor / dod), common first then specific
    const buckets: Record<ChecklistType, string[]> = { dor: [], dod: [] };

    const commonTemplates  = relevant.filter((t) => t.card_type === null);
    const specificTemplates = relevant.filter((t) => t.card_type === cardType);

    for (const tmpl of [...commonTemplates, ...specificTemplates]) {
      buckets[tmpl.type].push(...tmpl.items.map((i) => i.text));
    }

    const rows: { card_id: string; type: ChecklistType; item_text: string; position: number }[] = [];
    for (const [type, texts] of Object.entries(buckets) as [ChecklistType, string[]][]) {
      texts.forEach((text, idx) => {
        rows.push({ card_id: cardId, type, item_text: text, position: idx });
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

  /**
   * Replaces the template for (project, type, cardType).
   * cardType = null means the "common to all types" template.
   * Uses SELECT + (UPDATE or INSERT) to avoid needing a DELETE RLS policy.
   */
  async upsertTemplate(
    projectId: string,
    tenantId: string,
    type: ChecklistType,
    cardType: ActivityCardType | null,
    items: { text: string }[],
  ): Promise<void> {
    // Find existing row — must check error too (maybeSingle errors on multiple rows)
    const base = supabase
      .from('project_activity_checklist_templates')
      .select('id')
      .eq('project_id', projectId)
      .eq('type', type);

    const { data: existing, error: selectErr } = await (
      cardType === null ? base.is('card_type', null) : base.eq('card_type', cardType)
    ).maybeSingle();
    if (selectErr) throw selectErr;

    if (existing?.id) {
      // Update items in place — no DELETE needed
      const { error } = await supabase
        .from('project_activity_checklist_templates')
        .update({ items })
        .eq('id', existing.id);
      if (error) throw error;
    } else if (items.length > 0) {
      // No existing row — insert
      const { error } = await supabase
        .from('project_activity_checklist_templates')
        .insert({ project_id: projectId, tenant_id: tenantId, type, card_type: cardType, items });
      if (error) throw error;
    }
  },
};
