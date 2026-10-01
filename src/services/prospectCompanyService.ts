import { tabela } from '@/services/prospectingTables';
import { supabase } from '@/integrations/supabase/client';
import type { ClientOption } from '@/types/cnpjLookup';
import { FATURAMENTO_BASE_PADRAO, type FaturamentoBase, type ProspectCompanyDB } from '@/types/prospect';

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
  /** Ausente = não mexe: quem edita a empresa sem esse campo não apaga o que já existe. */
  faturamento_anual?: number | null;
  faturamento_anual_base?: FaturamentoBase | null;
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
    ...faturamentoDe(input),
  };
}

/** Valor e base andam juntos (o banco recusa um sem o outro); zero é "não informado". */
function faturamentoDe(input: ProspectCompanyInput) {
  if (input.faturamento_anual === undefined) return {};
  const valor = input.faturamento_anual && input.faturamento_anual > 0 ? input.faturamento_anual : null;
  return {
    faturamento_anual: valor,
    faturamento_anual_base: valor === null ? null : input.faturamento_anual_base ?? FATURAMENTO_BASE_PADRAO,
  };
}

/** Vírgula e parêntese quebram o `.or()` do PostgREST; o resto do termo passa como é. */
function termoSeguro(termo: string): string {
  return termo.replace(/[,()]/g, ' ').trim();
}

export const prospectCompanyService = {
  /**
   * Clientes da carteira para o seletor de empresa (29/09/2026). Passa pela RLS de
   * `clients`: sem `cliente:ler`, a lista vem vazia e o seletor mostra só a Prospecção.
   */
  async searchClients(query: string, tenantId: string): Promise<ClientOption[]> {
    const termo = termoSeguro(query);
    if (!termo) return [];
    const digitos = termo.replace(/\D/g, '');
    const filtros = [`company_name.ilike.%${termo}%`, `trading_name.ilike.%${termo}%`];
    if (digitos.length >= 3) filtros.push(`cnpj.ilike.%${digitos}%`);
    const { data, error } = await supabase
      .from('clients')
      .select('id, company_name, trading_name, cnpj')
      .eq('tenant_id', tenantId)
      .or(filtros.join(','))
      .order('company_name')
      .limit(10);
    if (error) throw error;
    return (data || []) as ClientOption[];
  },

  /** A empresa da Prospecção já ligada a este cliente, se houver — para não duplicar. */
  /** Empresas do tenant com estes CNPJs — a deduplicação do cadastro em lote. */
  async findByCnpjs(cnpjs: string[], tenantId: string): Promise<ProspectCompanyDB[]> {
    if (cnpjs.length === 0) return [];
    const { data, error } = await tabela('prospect_companies')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('cnpj', cnpjs);
    if (error) throw error;
    return (data || []) as unknown as ProspectCompanyDB[];
  },

  async findByClientId(clientId: string, tenantId: string): Promise<ProspectCompanyDB | null> {
    const { data, error } = await tabela('prospect_companies')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('client_id', clientId)
      .order('created_at')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as ProspectCompanyDB) ?? null;
  },

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
    const termo = termoSeguro(query);
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
