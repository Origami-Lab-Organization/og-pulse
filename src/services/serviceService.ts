import { supabase } from '@/integrations/supabase/client';
import { ServiceDB, CreateServiceInput } from '@/types/service';

export const serviceService = {
  async getAll(tenantId: string): Promise<ServiceDB[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('project_type')
      .order('name');

    if (error) {
      console.error('Error fetching services:', error);
      throw error;
    }

    return (data || []) as unknown as ServiceDB[];
  },

  async create(input: CreateServiceInput, tenantId: string): Promise<ServiceDB> {
    const { data, error } = await supabase
      .from('services')
      .insert({
        tenant_id: tenantId,
        name: input.name,
        project_type: input.projectType,
        description: input.description || null,
        unit_price: input.unitPrice ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating service:', error);
      if (error.code === '23505') throw new Error('Já existe um serviço com este nome.');
      throw error;
    }

    return data as unknown as ServiceDB;
  },

  async update(id: string, input: Partial<CreateServiceInput>): Promise<ServiceDB> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.projectType !== undefined) updates.project_type = input.projectType;
    if (input.description !== undefined) updates.description = input.description || null;
    if (input.unitPrice !== undefined) updates.unit_price = input.unitPrice ?? null;

    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service:', error);
      if (error.code === '23505') throw new Error('Já existe um serviço com este nome.');
      throw error;
    }

    return data;
  },

  async delete(id: string, tenantId: string): Promise<void> {
    // Guard: at least one service must remain
    const { count, error: countError } = await supabase
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (countError) throw countError;
    if ((count ?? 0) <= 1) {
      throw new Error('É necessário ao menos um serviço cadastrado.');
    }

    const { error } = await supabase.from('services').delete().eq('id', id);

    if (error) {
      console.error('Error deleting service:', error);
      throw error;
    }
  },

  async seedDefaults(tenantId: string, defaults: CreateServiceInput[]): Promise<void> {
    const rows = defaults.map((s) => ({
      tenant_id: tenantId,
      name: s.name,
      project_type: s.projectType,
      description: s.description || null,
    }));

    const { error } = await supabase.from('services').insert(rows);

    if (error) {
      console.error('Error seeding default services:', error);
      throw error;
    }
  },
};
