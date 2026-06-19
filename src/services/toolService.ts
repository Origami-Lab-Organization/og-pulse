import { supabase as _supabase } from '@/integrations/supabase/client';
import { ToolDB, CreateToolInput } from '@/types/tool';

// Cast necessário até a migration rodar e o types.ts ser regenerado com a tabela tools
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;

export const toolService = {
  async getAll(tenantId: string): Promise<ToolDB[]> {
    const { data, error } = await supabase
      .from('tools')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) throw error;
    return (data || []) as unknown as ToolDB[];
  },

  async create(input: CreateToolInput, tenantId: string): Promise<ToolDB> {
    const { data, error } = await supabase
      .from('tools')
      .insert({
        tenant_id: tenantId,
        name: input.name,
        description: input.description || null,
        value: input.value,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Já existe uma ferramenta com este nome.');
      throw error;
    }

    return data as unknown as ToolDB;
  },

  async update(id: string, input: Partial<CreateToolInput>): Promise<ToolDB> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description || null;
    if (input.value !== undefined) updates.value = input.value;

    const { data, error } = await supabase
      .from('tools')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Já existe uma ferramenta com este nome.');
      throw error;
    }

    return data as unknown as ToolDB;
  },

  async toggleActive(id: string, isActive: boolean): Promise<ToolDB> {
    const { data, error } = await supabase
      .from('tools')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ToolDB;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('tools').delete().eq('id', id);
    if (error) throw error;
  },
};
