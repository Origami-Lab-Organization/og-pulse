import { supabase } from '@/integrations/supabase/client';
import { rpc, tabela } from '@/services/prospectingTables';
import type { ProspectCompanyPartnerDB, ReceitaSnapshot, SiteScan } from '@/types/receita';

/**
 * Retrato da Receita e quadro de sócios da empresa (29/09/2026, ADR-0041).
 *
 * A gravação é uma RPC só (`save_prospect_company_receita`): empresa e sócios mudam juntos
 * ou não mudam. Sócio não vira contato aqui — isso é escolha de quem conduz.
 */
export async function saveCompanyReceita(companyId: string, receita: ReceitaSnapshot): Promise<void> {
  const { error } = await rpc('save_prospect_company_receita', { p_company_id: companyId, p_receita: receita });
  if (error) throw error;
}

export async function fetchCompanyPartners(companyId: string): Promise<ProspectCompanyPartnerDB[]> {
  const { data, error } = await tabela('prospect_company_partners')
    .select('*')
    .eq('company_id', companyId)
    .order('ativo', { ascending: false })
    .order('nome');
  if (error) throw error;
  return (data || []) as ProspectCompanyPartnerDB[];
}

export type PartnerContactFields = Partial<
  Pick<ProspectCompanyPartnerDB, 'linkedin_url' | 'instagram_url' | 'telefone' | 'prospect_id'>
>;

export async function updatePartner(id: string, campos: PartnerContactFields): Promise<void> {
  const limpo = Object.fromEntries(
    Object.entries(campos).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || null : v]),
  );
  const { error } = await tabela('prospect_company_partners').update(limpo).eq('id', id);
  if (error) throw error;
}

export class SiteScanError extends Error {}

/**
 * Lê o site oficial da empresa e grava o que achou (Edge Function `company-site-scan`).
 * A função roda com a sessão de quem chama: sem `prospeccao:editar`, não grava.
 */
export async function scanCompanySite(companyId: string): Promise<SiteScan> {
  const { data, error } = await supabase.functions.invoke('company-site-scan', { body: { company_id: companyId } });
  if (error) {
    const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new SiteScanError(corpo?.error ?? 'Não foi possível ler o site agora.');
  }
  return (data as { achados: SiteScan }).achados;
}
