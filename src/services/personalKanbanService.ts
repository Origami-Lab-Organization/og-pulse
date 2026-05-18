import { supabase } from '@/integrations/supabase/client';
import {
  PersonalKanbanCardWithTags,
  PersonalKanbanColumnDB,
  PersonalKanbanTagDB,
  CreatePersonalKanbanCardInput,
  CreatePersonalKanbanColumnInput,
  UpdatePersonalKanbanCardInput,
  AssignedProjectCard,
} from '@/types/personalKanban';

export const personalKanbanService = {
  // ── Columns ────────────────────────────────────────────────────────────────

  async getColumns(employeeId: string): Promise<PersonalKanbanColumnDB[]> {
    const { data, error } = await supabase
      .from('personal_kanban_columns')
      .select('*')
      .eq('employee_id', employeeId)
      .order('position');
    if (error) throw error;
    return data || [];
  },

  async createColumn(
    input: CreatePersonalKanbanColumnInput,
    employeeId: string,
    tenantId: string,
  ): Promise<PersonalKanbanColumnDB> {
    const { data, error } = await supabase
      .from('personal_kanban_columns')
      .insert({ ...input, employee_id: employeeId, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateColumn(id: string, updates: { name: string }): Promise<PersonalKanbanColumnDB> {
    const { data, error } = await supabase
      .from('personal_kanban_columns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteColumn(id: string): Promise<void> {
    const { error } = await supabase.from('personal_kanban_columns').delete().eq('id', id);
    if (error) throw error;
  },

  async batchUpdateColumnPositions(columns: { id: string; position: number }[]): Promise<void> {
    await Promise.all(
      columns.map(({ id, position }) =>
        supabase.from('personal_kanban_columns').update({ position }).eq('id', id),
      ),
    );
  },

  // ── Cards ──────────────────────────────────────────────────────────────────

  async getCards(employeeId: string): Promise<PersonalKanbanCardWithTags[]> {
    const { data, error } = await (supabase
      .from('personal_kanban_cards')
      .select('*, card_tags:personal_kanban_card_tags(*, tag:personal_kanban_tags(*))')
      .eq('employee_id', employeeId)
      .order('position') as any);
    if (error) throw error;
    return (data || []) as PersonalKanbanCardWithTags[];
  },

  async createCard(
    input: CreatePersonalKanbanCardInput,
    employeeId: string,
    tenantId: string,
  ): Promise<PersonalKanbanCardWithTags> {
    const { data, error } = await supabase
      .from('personal_kanban_cards')
      .insert({
        column_id: input.column_id,
        title: input.title,
        description: input.description ?? null,
        employee_id: employeeId,
        tenant_id: tenantId,
      })
      .select('*, card_tags:personal_kanban_card_tags(*, tag:personal_kanban_tags(*))')
      .single() as any;
    if (error) throw error;
    return data as PersonalKanbanCardWithTags;
  },

  async updateCard(id: string, updates: UpdatePersonalKanbanCardInput): Promise<PersonalKanbanCardWithTags> {
    const { data, error } = await supabase
      .from('personal_kanban_cards')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*, card_tags:personal_kanban_card_tags(*, tag:personal_kanban_tags(*))')
      .single() as any;
    if (error) throw error;
    return data as PersonalKanbanCardWithTags;
  },

  async deleteCard(id: string): Promise<void> {
    const { error } = await supabase.from('personal_kanban_cards').delete().eq('id', id);
    if (error) throw error;
  },

  async batchUpdateCardPositions(
    cards: { id: string; position: number; column_id: string }[],
  ): Promise<void> {
    await Promise.all(
      cards.map(({ id, position, column_id }) =>
        supabase.from('personal_kanban_cards').update({ position, column_id }).eq('id', id),
      ),
    );
  },

  // ── Tags ───────────────────────────────────────────────────────────────────

  async getTags(employeeId: string): Promise<PersonalKanbanTagDB[]> {
    const { data, error } = await supabase
      .from('personal_kanban_tags')
      .select('*')
      .eq('employee_id', employeeId)
      .order('name');
    if (error) throw error;
    return data || [];
  },

  async createTag(
    name: string,
    color: string,
    employeeId: string,
    tenantId: string,
  ): Promise<PersonalKanbanTagDB> {
    const { data, error } = await supabase
      .from('personal_kanban_tags')
      .insert({ name, color, employee_id: employeeId, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTag(id: string): Promise<void> {
    const { error } = await supabase.from('personal_kanban_tags').delete().eq('id', id);
    if (error) throw error;
  },

  async addTagToCard(cardId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from('personal_kanban_card_tags')
      .insert({ card_id: cardId, tag_id: tagId });
    if (error) throw error;
  },

  async removeTagFromCard(cardId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from('personal_kanban_card_tags')
      .delete()
      .eq('card_id', cardId)
      .eq('tag_id', tagId);
    if (error) throw error;
  },

  // ── Project integration ────────────────────────────────────────────────────

  async getAssignedProjectCards(employeeId: string, tenantId: string): Promise<AssignedProjectCard[]> {
    const { data, error } = await (supabase
      .from('project_activity_cards')
      .select('id, project_id, tenant_id, title, user_story, card_type, points, column_name, is_blocked, project:projects!project_activity_cards_project_id_fkey(id, name)')
      .eq('assignee_id', employeeId)
      .eq('tenant_id', tenantId)
      .eq('is_archived', false)
      .order('column_name')
      .order('position') as any);
    if (error) throw error;
    return ((data || []) as any[]).map((row): AssignedProjectCard => ({
      id: `proj-${row.id}`,
      projectCardId: row.id,
      project_id: row.project_id,
      tenant_id: row.tenant_id,
      title: row.title,
      user_story: row.user_story,
      card_type: row.card_type,
      points: row.points,
      column_name: row.column_name,
      is_blocked: row.is_blocked,
      project: row.project ?? null,
    }));
  },
};
