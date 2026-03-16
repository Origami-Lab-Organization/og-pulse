import { supabase } from '@/integrations/supabase/client';
import { ServiceDB, CreateServiceInput } from '@/types/service';

export const serviceService = {
  async getAll(tenantId: string): Promise<ServiceDB[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('tenant_id', tenantId)
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
        project_type: input.billingType,
        billing_type: input.billingType,
        description: input.description || null,
        has_default_value: input.hasDefaultValue,
        default_value: input.hasDefaultValue ? (input.defaultValue ?? null) : null,
        billing_unit: input.hasDefaultValue ? (input.billingUnit ?? null) : null,
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
    if (input.billingType !== undefined) updates.billing_type = input.billingType;
    if (input.description !== undefined) updates.description = input.description || null;
    if (input.hasDefaultValue !== undefined) {
      updates.has_default_value = input.hasDefaultValue;
      if (!input.hasDefaultValue) {
        updates.default_value = null;
        updates.billing_unit = null;
      }
    }
    if (input.defaultValue !== undefined) updates.default_value = input.defaultValue ?? null;
    if (input.billingUnit !== undefined) updates.billing_unit = input.billingUnit ?? null;

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

    return data as unknown as ServiceDB;
  },

  async toggleActive(id: string, isActive: boolean): Promise<ServiceDB> {
    const { data, error } = await supabase
      .from('services')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ServiceDB;
  },

  async delete(id: string, tenantId: string): Promise<void> {
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
      billing_type: s.billingType,
      description: s.description || null,
      has_default_value: false,
    }));

    const { error } = await supabase.from('services').insert(rows);

    if (error) {
      console.error('Error seeding default services:', error);
      throw error;
    }
  },
};
