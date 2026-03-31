import { supabase } from '@/integrations/supabase/client';
import { SubscriptionDB, CreateSubscriptionInput, UpdateSubscriptionInput } from '@/types/subscription';

export const subscriptionService = {
  async getAll(tenantId: string): Promise<SubscriptionDB[]> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) {
      console.error('Error fetching subscriptions:', error);
      throw error;
    }

    return data || [];
  },

  async getActive(tenantId: string): Promise<SubscriptionDB[]> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching active subscriptions:', error);
      throw error;
    }

    return data || [];
  },

  async getById(id: string, tenantId?: string): Promise<SubscriptionDB | null> {
    let query = supabase.from('subscriptions').select('*').eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Error fetching subscription:', error);
      throw error;
    }

    return data;
  },

  async create(input: CreateSubscriptionInput, tenantId: string): Promise<SubscriptionDB> {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        tenant_id: tenantId,
        name: input.name,
        vendor: input.vendor || null,
        description: input.description || null,
        category: input.category || null,
        monthly_cost: input.monthlyCost,
        annual_cost: input.annualCost ?? input.monthlyCost * 12,
        billing_cycle: input.billingCycle || null,
        url: input.url || null,
        notes: input.notes || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, input: UpdateSubscriptionInput): Promise<SubscriptionDB> {
    const updateData: Record<string, unknown> = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.vendor !== undefined) updateData.vendor = input.vendor || null;
    if (input.description !== undefined) updateData.description = input.description || null;
    if (input.category !== undefined) updateData.category = input.category || null;
    if (input.monthlyCost !== undefined) updateData.monthly_cost = input.monthlyCost;
    if (input.annualCost !== undefined) updateData.annual_cost = input.annualCost;
    if (input.billingCycle !== undefined) updateData.billing_cycle = input.billingCycle || null;
    if (input.url !== undefined) updateData.url = input.url || null;
    if (input.notes !== undefined) updateData.notes = input.notes || null;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }

    return data;
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      console.error('Error toggling subscription active state:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting subscription:', error);
      throw error;
    }
  },
};
