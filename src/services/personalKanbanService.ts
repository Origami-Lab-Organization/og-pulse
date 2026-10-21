import { supabase } from '@/integrations/supabase/client';
import {
  PersonalKanbanCardWithTags,
  PersonalKanbanColumnDB,
  PersonalKanbanSettingsDB,
  PersonalKanbanTagDB,
  CreatePersonalKanbanCardInput,
  CreatePersonalKanbanColumnInput,
  UpdatePersonalKanbanCardInput,
  UpdatePersonalKanbanColumnInput,
  UpdatePersonalKanbanSettingsInput,
  AssignedProjectCard,
  ProjectOption,
} from '@/types/personalKanban';
import type { ActivityColumnName } from '@/types/projectActivity';

const CARD_SELECT =
  '*, card_tags:personal_kanban_card_tags(*, tag:personal_kanban_tags(*)), ' +
  'project_activity:project_activity_cards(id, title, column_name, card_number, is_blocked, is_archived, sprint_id, project_id, ' +
  'project:projects!project_activity_cards_project_id_fkey(id, name))';

// Projeto que ainda recebe trabalho: o seletor de vínculo não oferece concluído nem cancelado.
const LINKABLE_PROJECT_STATUSES = ['planning', 'active', 'paused'] as const;

export const personalKanbanService = {
  // ── Columns ────────────────────────────────────────────────────────────────

  async getColumns(employeeId: string): Promise<PersonalKanbanColumnDB[]> {
    const { data, error } = await supabase
      .from('personal_kanban_columns')
      .select('*')
      .eq('employee_id', employeeId)
      .order('position');
    if (error) throw error;
    return (data || []) as PersonalKanbanColumnDB[];
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
    return data as PersonalKanbanColumnDB;
  },

  async updateColumn(id: string, updates: UpdatePersonalKanbanColumnInput): Promise<PersonalKanbanColumnDB> {
    const { data, error } = await supabase
      .from('personal_kanban_columns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as PersonalKanbanColumnDB;
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
    const { data, error } = await supabase
      .from('personal_kanban_cards')
      .select(CARD_SELECT)
      .eq('employee_id', employeeId)
      .is('archived_at', null)
      .order('position');
    if (error) throw error;
    return (data || []) as unknown as PersonalKanbanCardWithTags[];
  },

  async getArchivedCards(employeeId: string): Promise<PersonalKanbanCardWithTags[]> {
    const { data, error } = await supabase
      .from('personal_kanban_cards')
      .select(CARD_SELECT)
      .eq('employee_id', employeeId)
      .not('archived_at', 'is', null)
      .order('archived_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data || []) as unknown as PersonalKanbanCardWithTags[];
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
        project_activity_card_id: input.project_activity_card_id ?? null,
        employee_id: employeeId,
        tenant_id: tenantId,
      })
      .select(CARD_SELECT)
      .single();
    if (error) throw error;
    return data as unknown as PersonalKanbanCardWithTags;
  },

  async updateCard(id: string, updates: UpdatePersonalKanbanCardInput): Promise<PersonalKanbanCardWithTags> {
    const { data, error } = await supabase
      .from('personal_kanban_cards')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(CARD_SELECT)
      .single();
    if (error) throw error;
    return data as unknown as PersonalKanbanCardWithTags;
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

  // ── Settings ───────────────────────────────────────────────────────────────

  // A base vem dos DEFAULTs da tabela (ADR-0050): inserir só com as chaves e ler de volta.
  async ensureSettings(employeeId: string, tenantId: string): Promise<PersonalKanbanSettingsDB> {
    const { error: insertError } = await supabase
      .from('personal_kanban_settings')
      .upsert({ employee_id: employeeId, tenant_id: tenantId }, { onConflict: 'employee_id', ignoreDuplicates: true });
    if (insertError) throw insertError;
    const { data, error } = await supabase
      .from('personal_kanban_settings')
      .select('*')
      .eq('employee_id', employeeId)
      .single();
    if (error) throw error;
    return data as PersonalKanbanSettingsDB;
  },

  async updateSettings(
    employeeId: string,
    updates: UpdatePersonalKanbanSettingsInput,
  ): Promise<PersonalKanbanSettingsDB> {
    const { data, error } = await supabase
      .from('personal_kanban_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('employee_id', employeeId)
      .select('*')
      .single();
    if (error) throw error;
    return data as PersonalKanbanSettingsDB;
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

  // ── Atividade de projeto vinculada (ADR-0050) ─────────────────────────────

  async listLinkableProjects(): Promise<ProjectOption[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .in('status', LINKABLE_PROJECT_STATUSES)
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  // Entra no fim da coluna de destino, como no drag & drop do board do projeto.
  async moveProjectActivity(activityId: string, projectId: string, column: ActivityColumnName): Promise<void> {
    const { data: last, error: lastError } = await supabase
      .from('project_activity_cards')
      .select('position')
      .eq('project_id', projectId)
      .eq('column_name', column)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) throw lastError;
    const { data, error } = await supabase
      .from('project_activity_cards')
      .update({ column_name: column, position: (last?.position ?? -1) + 1 })
      .eq('id', activityId)
      .select('id');
    if (error) throw error;
    // harness-ok: UPDATE barrado pela RLS volta sem erro e sem linha; vira toast no hook.
    if (!data?.length) throw new Error('Atividade não atualizada');
  },

  async renameProjectActivity(activityId: string, title: string): Promise<void> {
    const { error } = await supabase.from('project_activity_cards').update({ title }).eq('id', activityId);
    if (error) throw error;
  },

  // Mesma regra do board: sem item de Done, conta como completo.
  async isActivityDodComplete(activityId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('project_activity_card_checklist')
      .select('is_checked')
      .eq('card_id', activityId)
      .eq('type', 'dod');
    if (error) throw error;
    return (data ?? []).every((item) => item.is_checked);
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
