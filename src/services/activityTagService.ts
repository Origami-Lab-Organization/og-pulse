import { supabase } from '@/integrations/supabase/client';
import {
  ProjectActivityTagDB,
  ProjectActivityCardTagWithTag,
} from '@/types/projectActivity';

export const activityTagService = {
  async getTagsByProject(projectId: string): Promise<ProjectActivityTagDB[]> {
    const { data, error } = await supabase
      .from('project_activity_tags')
      .select('*')
      .eq('project_id', projectId)
      .order('name');
    if (error) throw error;
    return (data || []) as ProjectActivityTagDB[];
  },

  async createTag(
    projectId: string,
    tenantId: string,
    name: string,
    color: string
  ): Promise<ProjectActivityTagDB> {
    const { data, error } = await supabase
      .from('project_activity_tags')
      .insert({ project_id: projectId, tenant_id: tenantId, name, color })
      .select()
      .single();
    if (error) throw error;
    return data as ProjectActivityTagDB;
  },

  async updateTag(
    id: string,
    updates: { name?: string; color?: string }
  ): Promise<void> {
    const { error } = await supabase
      .from('project_activity_tags')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },

  async deleteTag(id: string): Promise<void> {
    const { error } = await supabase
      .from('project_activity_tags')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getCardTags(cardId: string): Promise<ProjectActivityCardTagWithTag[]> {
    const { data, error } = await supabase
      .from('project_activity_card_tags')
      .select('*, tag:tag_id(*)')
      .eq('card_id', cardId);
    if (error) throw error;
    return (data || []) as ProjectActivityCardTagWithTag[];
  },

  async addTagToCard(cardId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from('project_activity_card_tags')
      .insert({ card_id: cardId, tag_id: tagId });
    if (error) throw error;
  },

  async removeTagFromCard(cardId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from('project_activity_card_tags')
      .delete()
      .eq('card_id', cardId)
      .eq('tag_id', tagId);
    if (error) throw error;
  },
};
