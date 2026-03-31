import { supabase } from '@/integrations/supabase/client';
import { MaterialDB, CreateMaterialInput } from '@/types/material';

export const materialService = {
  async getAll(tenantId: string): Promise<MaterialDB[]> {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) {
      console.error('Error fetching materials:', error);
      throw error;
    }

    return data || [];
  },

  async getById(id: string, tenantId?: string): Promise<MaterialDB | null> {
    let query = supabase.from('materials').select('*').eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching material:', error);
      return null;
    }

    return data;
  },

  async create(input: CreateMaterialInput, tenantId: string): Promise<MaterialDB> {
    const { data, error } = await supabase
      .from('materials')
      .insert({
        tenant_id: tenantId,
        name: input.name,
        description: input.description || null,
        category: input.category || 'outros',
        unit: input.unit || 'un',
        unit_cost: input.unitCost,
        sku: input.sku || null,
        status: input.status,
        notes: input.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating material:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, updates: Partial<CreateMaterialInput>): Promise<MaterialDB> {
    const updateData: Record<string, unknown> = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description || null;
    if (updates.category !== undefined) updateData.category = updates.category || null;
    if (updates.unit !== undefined) updateData.unit = updates.unit || null;
    if (updates.unitCost !== undefined) updateData.unit_cost = updates.unitCost;
    if (updates.sku !== undefined) updateData.sku = updates.sku || null;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;

    const { data, error } = await supabase
      .from('materials')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating material:', error);
      throw error;
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting material:', error);
      throw error;
    }
  },
};
