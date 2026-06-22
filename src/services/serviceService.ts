import { supabase } from '@/integrations/supabase/client';
import { ServiceDB, CreateServiceInput, DefaultServiceTemplate } from '@/types/service';

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
        service_line_id: input.serviceLineId,
        name: input.name,
        project_type: input.billingType ?? 'fixed_scope',
        billing_type: input.billingType ?? 'fixed_scope',
        description: input.description || null,
        has_default_value: input.hasDefaultValue ?? false,
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
    if (input.serviceLineId !== undefined) updates.service_line_id = input.serviceLineId;
    if (input.name !== undefined) updates.name = input.name;
    if (input.billingType !== undefined) {
      updates.billing_type = input.billingType;
      updates.project_type = input.billingType;
    }
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

  async delete(id: string): Promise<void> {
    // Guard (Cenário 3): bloquear exclusão se houver modelo de receita ATIVO vinculado.
    const { count, error: countError } = await supabase
      .from('service_revenue_models')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', id)
      .eq('is_active', true);

    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      throw new Error(
        'Este serviço possui modelos de receita ativos. Desative os modelos antes de excluir — ou desabilite o serviço.'
      );
    }

    const { error } = await supabase.from('services').delete().eq('id', id);

    if (error) {
      console.error('Error deleting service:', error);
      // 23503 = foreign key violation (serviço referenciado por leads/orçamentos).
      if (error.code === '23503') {
        throw new Error(
          'Este serviço está vinculado a leads ou orçamentos. Desabilite-o em vez de excluir.'
        );
      }
      throw error;
    }
  },

  async linkTemplateBudget(serviceId: string, budgetId: string | null): Promise<void> {
    const { error } = await supabase
      .from('services')
      .update({ template_budget_id: budgetId, updated_at: new Date().toISOString() } as any)
      .eq('id', serviceId);

    if (error) {
      console.error('Error linking template budget to service:', error);
      throw error;
    }
  },

  async seedDefaults(
    tenantId: string,
    serviceLineId: string,
    defaults: DefaultServiceTemplate[]
  ): Promise<void> {
    const rows = defaults.map((s) => ({
      tenant_id: tenantId,
      service_line_id: serviceLineId,
      name: s.name,
      project_type: s.billingType ?? 'fixed_scope',
      billing_type: s.billingType ?? 'fixed_scope',
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
