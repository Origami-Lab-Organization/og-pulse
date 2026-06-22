import { supabase } from '@/integrations/supabase/client';
import { ClientDB, CreateClientInput } from '@/types/client';

export const clientService = {
  async getAll(tenantId: string): Promise<ClientDB[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('company_name');

    if (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }

    return data || [];
  },

  async getById(id: string, tenantId?: string): Promise<ClientDB | null> {
    let query = supabase.from('clients').select('*').eq('id', id);
    if (tenantId) query = query.eq('tenant_id', tenantId);
    const { data, error } = await query.single();

    if (error) {
      console.error('Error fetching client:', error);
      return null;
    }

    return data;
  },

  async create(input: CreateClientInput, tenantId: string): Promise<ClientDB> {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        tenant_id: tenantId,
        company_name: input.companyName,
        trading_name: input.tradingName || null,
        cnpj: input.cnpj || null,
        cep: input.cep || null,
        logradouro: input.logradouro || null,
        numero: input.numero || null,
        complemento: input.complemento || null,
        bairro: input.bairro || null,
        cidade: input.cidade || null,
        estado: input.estado || null,
        logo_url: input.logoUrl || null,
        contact_name: input.contactName || null,
        contact_email: input.contactEmail || null,
        contact_phone: input.contactPhone || null,
        segment: input.segment || null,
        website: input.website || null,
        notes: input.notes || null,
        status: input.status,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      throw error;
    }

    return data;
  },

  async update(id: string, updates: Partial<CreateClientInput>): Promise<ClientDB> {
    const updateData: Record<string, unknown> = {};

    if (updates.companyName !== undefined) updateData.company_name = updates.companyName;
    if (updates.tradingName !== undefined) updateData.trading_name = updates.tradingName || null;
    if (updates.cnpj !== undefined) updateData.cnpj = updates.cnpj || null;
    if (updates.cep !== undefined) updateData.cep = updates.cep || null;
    if (updates.logradouro !== undefined) updateData.logradouro = updates.logradouro || null;
    if (updates.numero !== undefined) updateData.numero = updates.numero || null;
    if (updates.complemento !== undefined) updateData.complemento = updates.complemento || null;
    if (updates.bairro !== undefined) updateData.bairro = updates.bairro || null;
    if (updates.cidade !== undefined) updateData.cidade = updates.cidade || null;
    if (updates.estado !== undefined) updateData.estado = updates.estado || null;
    if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl || null;
    if (updates.contactName !== undefined) updateData.contact_name = updates.contactName || null;
    if (updates.contactEmail !== undefined) updateData.contact_email = updates.contactEmail || null;
    if (updates.contactPhone !== undefined) updateData.contact_phone = updates.contactPhone || null;
    if (updates.segment !== undefined) updateData.segment = updates.segment || null;
    if (updates.website !== undefined) updateData.website = updates.website || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;
    if (updates.status !== undefined) updateData.status = updates.status;

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating client:', error);
      throw error;
    }

    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  },

  async getRelationCounts(
    clientId: string,
    tenantId: string,
  ): Promise<{ opportunities: number; projects: number }> {
    const [opps, projs] = await Promise.all([
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .eq('archived', false),
      supabase
        .from('projects')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId),
    ]);

    return {
      opportunities: opps.count ?? 0,
      projects: projs.count ?? 0,
    };
  },

  async search(query: string, tenantId: string): Promise<ClientDB[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`company_name.ilike.%${query}%,trading_name.ilike.%${query}%,cnpj.ilike.%${query}%`)
      .order('company_name');

    if (error) {
      console.error('Error searching clients:', error);
      throw error;
    }

    return data || [];
  },
};
