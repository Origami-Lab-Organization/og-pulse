import { supabase } from '@/integrations/supabase/client';
import { ServiceLineDB, CreateServiceLineInput } from '@/types/serviceLine';

export const serviceLineService = {
  async getAll(tenantId: string): Promise<ServiceLineDB[]> {
    const { data, error } = await supabase
      .from('service_lines')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order')
      .order('name');

    if (error) {
      console.error('Error fetching service lines:', error);
      throw error;
    }

    return (data || []) as unknown as ServiceLineDB[];
  },

  async create(input: CreateServiceLineInput, tenantId: string): Promise<ServiceLineDB> {
    const { data, error } = await supabase
      .from('service_lines')
      .insert({
        tenant_id: tenantId,
        name: input.name,
        description: input.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating service line:', error);
      if (error.code === '23505') throw new Error('Já existe uma linha de serviço com este nome.');
      throw error;
    }

    return data as unknown as ServiceLineDB;
  },

  async update(id: string, input: Partial<CreateServiceLineInput>): Promise<ServiceLineDB> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description || null;

    const { data, error } = await supabase
      .from('service_lines')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service line:', error);
      if (error.code === '23505') throw new Error('Já existe uma linha de serviço com este nome.');
      throw error;
    }

    return data as unknown as ServiceLineDB;
  },

  async toggleActive(id: string, isActive: boolean): Promise<ServiceLineDB> {
    const { data, error } = await supabase
      .from('service_lines')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ServiceLineDB;
  },

  async delete(id: string): Promise<void> {
    // Guard (Cenário 3): bloquear exclusão se houver serviço ativo vinculado.
    const { count, error: countError } = await supabase
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('service_line_id', id)
      .eq('is_active', true);

    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      throw new Error(
        'Esta linha possui serviços ativos vinculados. Desative ou mova os serviços antes de excluir — ou desabilite a linha.'
      );
    }

    const { error } = await supabase.from('service_lines').delete().eq('id', id);

    if (error) {
      console.error('Error deleting service line:', error);
      throw error;
    }
  },
};
