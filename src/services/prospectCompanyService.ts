import { tabela } from '@/services/prospectingTables';
import type { ProspectCompanyDB } from '@/types/prospect';

export interface ProspectCompanyInput {
  name: string;
  cnpj?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  website?: string | null;
  segment?: string | null;
  ring?: string | null;
  tier?: string | null;
  client_id?: string | null;
  notes?: string | null;
}

function normalize(input: ProspectCompanyInput) {
  return {
    name: input.name.trim(),
    cnpj: input.cnpj?.replace(/\D/g, '') || null,
    linkedin_url: input.linkedin_url?.trim() || null,
    instagram_url: input.instagram_url?.trim() || null,
    website: input.website?.trim() || null,
    segment: input.segment?.trim() || null,
    ring: input.ring?.trim() || null,
    tier: input.tier?.trim() || null,
    client_id: input.client_id || null,
    notes: input.notes?.trim() || null,
  };
}

export const prospectCompanyService = {
  async getAll(tenantId: string): Promise<ProspectCompanyDB[]> {
    const { data, error } = await tabela('prospect_companies')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');
    if (error) throw error;
    return (data || []) as unknown as ProspectCompanyDB[];
  },

  async getById(id: string): Promise<ProspectCompanyDB | null> {
    const { data, error } = await tabela('prospect_companies')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as ProspectCompanyDB) ?? null;
  },

  async search(query: string, tenantId: string): Promise<ProspectCompanyDB[]> {
    const termo = query.trim();
    if (!termo) return [];
    const digitos = termo.replace(/\D/g, '');
    const filtros = [`name.ilike.%${termo}%`];
    if (digitos) filtros.push(`cnpj.ilike.%${digitos}%`);

    const { data, error } = await tabela('prospect_companies')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(filtros.join(','))
      .order('name')
      .limit(20);
    if (error) throw error;
    return (data || []) as unknown as ProspectCompanyDB[];
  },

  async create(input: ProspectCompanyInput, tenantId: string, createdBy?: string): Promise<ProspectCompanyDB> {
    const { data, error } = await tabela('prospect_companies')
      .insert({ tenant_id: tenantId, created_by: createdBy ?? null, ...normalize(input) })
      .select()
      .single();
    if (error) throw error;
    return data as unknown as ProspectCompanyDB;
  },

  async update(id: string, input: ProspectCompanyInput): Promise<ProspectCompanyDB> {
    const { data, error } = await tabela('prospect_companies')
      .update(normalize(input))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as ProspectCompanyDB;
  },
};
