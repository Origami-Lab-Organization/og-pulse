import { supabase } from '@/integrations/supabase/client';
import { RoleRateDB, CreateRoleRateInput, UpdateRoleRateInput, RoleRateStatus } from '@/types/roleRate';

export const roleRateService = {
  async getAll(tenantId: string): Promise<RoleRateDB[]> {
    const { data, error } = await supabase
      .from('role_rates')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('role_name', { ascending: true })
      .order('seniority', { ascending: true });

    if (error) throw error;
    return (data || []) as RoleRateDB[];
  },

  async getActive(tenantId: string): Promise<RoleRateDB[]> {
    const { data, error } = await supabase
      .from('role_rates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('role_name', { ascending: true })
      .order('seniority', { ascending: true });

    if (error) throw error;
    return (data || []) as RoleRateDB[];
  },

  async getById(id: string): Promise<RoleRateDB | null> {
    const { data, error } = await supabase
      .from('role_rates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as RoleRateDB;
  },

  async create(input: CreateRoleRateInput, tenantId: string): Promise<RoleRateDB> {
    const { data, error } = await supabase
      .from('role_rates')
      .insert({
        tenant_id: tenantId,
        role_name: input.roleName,
        seniority: input.seniority,
        hourly_rate: input.hourlyRate,
        description: input.description || null,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data as RoleRateDB;
  },

  async update(id: string, input: UpdateRoleRateInput): Promise<RoleRateDB> {
    const updates: Record<string, unknown> = {};
    
    if (input.roleName !== undefined) updates.role_name = input.roleName;
    if (input.seniority !== undefined) updates.seniority = input.seniority;
    if (input.hourlyRate !== undefined) updates.hourly_rate = input.hourlyRate;
    if (input.description !== undefined) updates.description = input.description;

    const { data, error } = await supabase
      .from('role_rates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as RoleRateDB;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('role_rates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async setStatus(id: string, status: RoleRateStatus): Promise<RoleRateDB> {
    const { data, error } = await supabase
      .from('role_rates')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as RoleRateDB;
  },

  async createMultiple(inputs: CreateRoleRateInput[], tenantId: string): Promise<RoleRateDB[]> {
    const records = inputs.map(input => ({
      tenant_id: tenantId,
      role_name: input.roleName,
      seniority: input.seniority,
      hourly_rate: input.hourlyRate,
      description: input.description || null,
      status: 'active' as const,
    }));

    const { data, error } = await supabase
      .from('role_rates')
      .insert(records)
      .select();

    if (error) throw error;
    return (data || []) as RoleRateDB[];
  },
};
