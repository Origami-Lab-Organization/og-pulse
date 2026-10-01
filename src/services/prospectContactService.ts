import { todasAsPaginas } from '@/lib/paginacao';
import { tabela } from '@/services/prospectingTables';
import type { ProspectContactDB, ProspectContactWithCompany } from '@/types/prospect';

/**
 * Contatos — a pessoa, separada do card do Pipeline (01/10/2026, ADR-0045).
 *
 * Editar aqui muda todos os cards da pessoa: o banco copia os dados para `prospects.contact_*`
 * (trigger `prospect_contacts_propagate`). A deduplicação são os índices únicos de e-mail e
 * LinkedIn por organização; a busca existe para a pessoa achar quem já está cadastrado
 * ANTES de esbarrar neles.
 */

export interface ProspectContactInput {
  company_id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
}

/** Na edição a empresa é opcional: a ficha do card edita a pessoa sem mudar a empresa dela. */
export type ProspectContactUpdate = Omit<ProspectContactInput, 'company_id'> & { company_id?: string };

const COM_EMPRESA = '*, company:prospect_companies!prospect_contacts_company_id_fkey(id, name)';

function normalize(input: ProspectContactUpdate) {
  return {
    ...(input.company_id ? { company_id: input.company_id } : {}),
    name: input.name.trim(),
    role: input.role?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    linkedin_url: input.linkedin_url?.trim() || null,
    instagram_url: input.instagram_url?.trim() || null,
  };
}

/** Vírgula e parêntese quebram o `.or()` do PostgREST; o resto do termo passa como é. */
function termoSeguro(termo: string): string {
  return termo.replace(/[,()]/g, ' ').trim();
}

/** Mesma chave dos índices únicos: `lower(btrim(...))`. `ilike` sem curinga compara sem caixa. */
function semCuringa(valor: string): string {
  return valor.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
}

export const prospectContactService = {
  /** Página a página: o PostgREST corta em 1000 linhas sem erro. */
  async getAll(tenantId: string): Promise<ProspectContactWithCompany[]> {
    return todasAsPaginas<ProspectContactWithCompany>((de, ate) =>
      tabela('prospect_contacts')
        .select(COM_EMPRESA)
        .eq('tenant_id', tenantId)
        .order('name')
        .order('id')
        .range(de, ate),
    );
  },

  /** Nome, e-mail ou LinkedIn: o combobox de contato mostra quem já existe. */
  async search(query: string, tenantId: string): Promise<ProspectContactWithCompany[]> {
    const termo = termoSeguro(query);
    if (!termo) return [];
    const { data, error } = await tabela('prospect_contacts')
      .select(COM_EMPRESA)
      .eq('tenant_id', tenantId)
      .or([`name.ilike.%${termo}%`, `email.ilike.%${termo}%`, `linkedin_url.ilike.%${termo}%`].join(','))
      .order('name')
      .limit(20);
    if (error) throw error;
    return (data || []) as unknown as ProspectContactWithCompany[];
  },

  /** O contato que já usa este e-mail ou LinkedIn — o aviso antes de o banco recusar. */
  async findDuplicate(
    tenantId: string,
    chaves: { email?: string | null; linkedin_url?: string | null },
    ignorarId?: string,
  ): Promise<ProspectContactWithCompany | null> {
    const filtros = [
      chaves.email?.trim() ? `email.ilike.${termoSeguro(semCuringa(chaves.email))}` : null,
      chaves.linkedin_url?.trim() ? `linkedin_url.ilike.${termoSeguro(semCuringa(chaves.linkedin_url))}` : null,
    ].filter(Boolean);
    if (filtros.length === 0) return null;
    let consulta = tabela('prospect_contacts').select(COM_EMPRESA).eq('tenant_id', tenantId).or(filtros.join(','));
    if (ignorarId) consulta = consulta.neq('id', ignorarId);
    const { data, error } = await consulta.limit(1).maybeSingle();
    if (error) throw error;
    return (data as unknown as ProspectContactWithCompany) ?? null;
  },

  async create(input: ProspectContactInput, tenantId: string, createdBy?: string): Promise<ProspectContactWithCompany> {
    const { data, error } = await tabela('prospect_contacts')
      .insert({ tenant_id: tenantId, created_by: createdBy ?? null, ...normalize(input) })
      .select(COM_EMPRESA)
      .single();
    if (error) throw error;
    return data as unknown as ProspectContactWithCompany;
  },

  async update(id: string, input: ProspectContactUpdate): Promise<ProspectContactDB> {
    const { data, error } = await tabela('prospect_contacts')
      .update(normalize(input))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as ProspectContactDB;
  },

  /** Só sai quem não tem card: com card, a FK de `prospects.contact_id` recusa. */
  async remove(id: string): Promise<void> {
    const { error } = await tabela('prospect_contacts').delete().eq('id', id);
    if (error) throw error;
  },
};
