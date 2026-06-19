import { supabase as _supabase } from '@/integrations/supabase/client';
import { BenefitDB, CreateBenefitInput } from '@/types/benefit';

// Cast necessário até a migration rodar e o types.ts ser regenerado com a tabela benefits
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as any;

export const benefitService = {
  async getAll(tenantId: string): Promise<BenefitDB[]> {
    const { data, error } = await supabase
      .from('benefits')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) throw error;
    return (data || []) as unknown as BenefitDB[];
  },

  async create(input: CreateBenefitInput, tenantId: string): Promise<BenefitDB> {
    const { data, error } = await supabase
      .from('benefits')
      .insert({
        tenant_id: tenantId,
        name: input.name,
        description: input.description || null,
        value: input.value,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Já existe um benefício com este nome.');
      throw error;
    }

    return data as unknown as BenefitDB;
  },

  async update(id: string, input: Partial<CreateBenefitInput>): Promise<BenefitDB> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description || null;
    if (input.value !== undefined) updates.value = input.value;

    const { data, error } = await supabase
      .from('benefits')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new Error('Já existe um benefício com este nome.');
      throw error;
    }

    return data as unknown as BenefitDB;
  },

  async toggleActive(id: string, isActive: boolean): Promise<BenefitDB> {
    const { data, error } = await supabase
      .from('benefits')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as BenefitDB;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('benefits').delete().eq('id', id);
    if (error) throw error;
  },
};
