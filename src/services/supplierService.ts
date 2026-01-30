import { supabase } from '@/integrations/supabase/client';
import { SupplierDB, CreateSupplierInput } from '@/types/supplier';

export const supplierService = {
  async getAll(tenantId: string): Promise<SupplierDB[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('company_name');

    if (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }

    return data || [];
  },

  async getById(id: string): Promise<SupplierDB | null> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching supplier:', error);
      return null;
    }

    return data;
  },

  async create(input: CreateSupplierInput, tenantId: string): Promise<SupplierDB> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        tenant_id: tenantId,
        company_name: input.companyName,
        trading_name: input.tradingName || null,
        cnpj: input.cnpj || null,
        category: input.category || null,
        contact_name: input.contactName || null,
        contact_email: input.contactEmail || null,
        contact_phone: input.contactPhone || null,
        cep: input.cep || null,
        logradouro: input.logradouro || null,
        numero: input.numero || null,
        complemento: input.complemento || null,
        bairro: input.bairro || null,
        cidade: input.cidade || null,
        estado: input.estado || null,
        notes: input.notes || null,
        status: input.status,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, updates: Partial<CreateSupplierInput>): Promise<SupplierDB> {
    const updateData: Record<string, unknown> = {};

    if (updates.companyName !== undefined) updateData.company_name = updates.companyName;
    if (updates.tradingName !== undefined) updateData.trading_name = updates.tradingName || null;
    if (updates.cnpj !== undefined) updateData.cnpj = updates.cnpj || null;
    if (updates.category !== undefined) updateData.category = updates.category || null;
    if (updates.contactName !== undefined) updateData.contact_name = updates.contactName || null;
    if (updates.contactEmail !== undefined) updateData.contact_email = updates.contactEmail || null;
    if (updates.contactPhone !== undefined) updateData.contact_phone = updates.contactPhone || null;
    if (updates.cep !== undefined) updateData.cep = updates.cep || null;
    if (updates.logradouro !== undefined) updateData.logradouro = updates.logradouro || null;
    if (updates.numero !== undefined) updateData.numero = updates.numero || null;
    if (updates.complemento !== undefined) updateData.complemento = updates.complemento || null;
    if (updates.bairro !== undefined) updateData.bairro = updates.bairro || null;
    if (updates.cidade !== undefined) updateData.cidade = updates.cidade || null;
    if (updates.estado !== undefined) updateData.estado = updates.estado || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { data, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
  },

  async search(query: string, tenantId: string): Promise<SupplierDB[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`company_name.ilike.%${query}%,trading_name.ilike.%${query}%,cnpj.ilike.%${query}%`)
      .order('company_name');

    if (error) {
      console.error('Error searching suppliers:', error);
      throw error;
    }

    return data || [];
  },
};
