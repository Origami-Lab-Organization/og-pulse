import { supabase } from '@/integrations/supabase/client';
import {
  ServiceRevenueModelDB,
  CreateServiceRevenueModelInput,
} from '@/types/serviceRevenueModel';

export const serviceRevenueModelService = {
  async getAll(tenantId: string): Promise<ServiceRevenueModelDB[]> {
    const { data, error } = await supabase
      .from('service_revenue_models')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order')
      .order('name');

    if (error) {
      console.error('Error fetching service revenue models:', error);
      throw error;
    }

    return (data || []) as unknown as ServiceRevenueModelDB[];
  },

  async create(
    input: CreateServiceRevenueModelInput,
    tenantId: string
  ): Promise<ServiceRevenueModelDB> {
    const { data, error } = await supabase
      .from('service_revenue_models')
      .insert({
        tenant_id: tenantId,
        service_id: input.serviceId,
        name: input.name,
        model_type: input.modelType,
        base_value: input.baseValue ?? null,
        billing_unit: input.billingUnit ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating service revenue model:', error);
      throw error;
    }

    return data as unknown as ServiceRevenueModelDB;
  },

  async update(
    id: string,
    input: Partial<CreateServiceRevenueModelInput>
  ): Promise<ServiceRevenueModelDB> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.modelType !== undefined) updates.model_type = input.modelType;
    if (input.baseValue !== undefined) updates.base_value = input.baseValue ?? null;
    if (input.billingUnit !== undefined) updates.billing_unit = input.billingUnit ?? null;

    const { data, error } = await supabase
      .from('service_revenue_models')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating service revenue model:', error);
      throw error;
    }

    return data as unknown as ServiceRevenueModelDB;
  },

  async toggleActive(id: string, isActive: boolean): Promise<ServiceRevenueModelDB> {
    const { data, error } = await supabase
      .from('service_revenue_models')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ServiceRevenueModelDB;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('service_revenue_models').delete().eq('id', id);

    if (error) {
      console.error('Error deleting service revenue model:', error);
      throw error;
    }
  },
};
