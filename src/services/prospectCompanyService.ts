import { todasAsPaginas } from '@/lib/paginacao';
import type { CamposDaPagina } from '@/types/paginaDaEmpresa';
import { tabela } from '@/services/prospectingTables';
import { supabase } from '@/integrations/supabase/client';
import type { ClientOption } from '@/types/cnpjLookup';
import { FATURAMENTO_BASE_PADRAO, type FaturamentoBase, type ProspectCompanyDB, type RetratoDaBase, type TipoDeConta } from '@/types/prospect';

export interface ProspectCompanyInput {
  name: string;
  cnpj?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  website?: string | null;
  segment?: string | null;
  client_id?: string | null;
  notes?: string | null;
  /** Ausente = não mexe: quem edita a empresa sem esse campo não apaga o que já existe. */
  faturamento_anual?: number | null;
  faturamento_anual_base?: FaturamentoBase | null;
  /** Ausente = não mexe (US-0008). */
  tipo_conta?: TipoDeConta | null;
  /** Ausente = não mexe (US-0020). */
  funcionarios_informados?: number | null;
}

function normalize(input: ProspectCompanyInput) {
  return {
    name: input.name.trim(),
    cnpj: input.cnpj?.replace(/\D/g, '') || null,
    linkedin_url: input.linkedin_url?.trim() || null,
    instagram_url: input.instagram_url?.trim() || null,
    website: input.website?.trim() || null,
    segment: input.segment?.trim() || null,
    client_id: input.client_id || null,
    notes: input.notes?.trim() || null,
    ...faturamentoDe(input),
    ...(input.tipo_conta !== undefined ? { tipo_conta: input.tipo_conta } : {}),
    ...(input.funcionarios_informados !== undefined ? { funcionarios_informados: input.funcionarios_informados } : {}),
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
      // US-0050: o CNPJ pode ser o da matriz ou o de uma filial.
      .or(`cnpj.in.(${cnpjs.join(',')}),filiais.ov.{${cnpjs.join(',')}}`);
    if (error) throw error;
    return (data || []) as unknown as ProspectCompanyDB[];
  },

  /** US-0050: a empresa do tenant com este CNPJ, como matriz ou como filial. */
  async findByAnyCnpj(cnpj: string, tenantId: string): Promise<ProspectCompanyDB | null> {
    const { data, error } = await tabela('prospect_companies')
      .select('*')
      .eq('tenant_id', tenantId)
      .or(`cnpj.eq.${cnpj},filiais.cs.{${cnpj}}`)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as ProspectCompanyDB) ?? null;
  },

  /** US-0050: grava as filiais; o banco confere a raiz e recusa CNPJ de outra empresa. */
  async setFiliais(id: string, filiais: string[]): Promise<void> {
    const { error } = await tabela('prospect_companies').update({ filiais }).eq('id', id);
    if (error) throw error;
  },

  /** US-0050: junta a empresa `de` na `para` (Oportunidades, contatos, cliente) e apaga `de`. */
  async juntar(de: string, para: string): Promise<void> {
    const { error } = await supabase.rpc('juntar_empresas', { p_de: de, p_para: para });
    if (error) throw error;
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

  /**
   * Todas as empresas, página a página: o PostgREST corta em 1000 linhas sem erro, e a
   * importação em lote passa disso fácil — a empresa existia, o CNPJ batia no índice único,
   * e a tela Empresas não a mostrava (01/10/2026).
   */
  async getAll(tenantId: string): Promise<ProspectCompanyDB[]> {
    return todasAsPaginas<ProspectCompanyDB>((de, ate) =>
      tabela('prospect_companies')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name')
        .order('id')
        .range(de, ate),
    );
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
    // Razão social e nome fantasia: a empresa importada por CNPJ leva o fantasia como nome.
    const filtros = [`name.ilike.%${termo}%`, `razao_social.ilike.%${termo}%`, `nome_fantasia.ilike.%${termo}%`];
    // US-0050: cnpj_busca tem a matriz e as filiais.
    if (digitos) filtros.push(`cnpj_busca.ilike.%${digitos}%`);

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

  /**
   * Liga a empresa ao cliente — só a coluna `client_id`. `update` regrava a empresa inteira e
   * apagaria o que não viesse junto.
   */
  async linkClient(id: string, clientId: string): Promise<void> {
    const { error } = await tabela('prospect_companies').update({ client_id: clientId }).eq('id', id);
    if (error) throw error;
  },

  /** Só o tipo de conta (US-0008), sem regravar o resto da empresa. */
  async setTipoDeConta(id: string, tipo: TipoDeConta): Promise<void> {
    const { error } = await tabela('prospect_companies').update({ tipo_conta: tipo }).eq('id', id);
    if (error) throw error;
  },

  /**
   * Site, redes e síntese editados no lugar, na página da empresa (US-0053): grava só o campo
   * mexido, sem regravar a empresa. Vazio vira nulo.
   */
  async setCampos(id: string, campos: CamposDaPagina): Promise<void> {
    const limpos = Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || null : v]));
    const { error } = await tabela('prospect_companies').update(limpos).eq('id', id);
    if (error) throw error;
  },

  /** Retrato da Base (US-0014, ADR-0055): os números da VPS guardados ao entrar no Pulse. */
  async setRetratoDaBase(id: string, retrato: RetratoDaBase): Promise<void> {
    const { error } = await tabela('prospect_companies')
      .update({
        base_funcionarios: retrato.funcionarios,
        base_divida_ajuizada: retrato.dividaAjuizada,
        base_distancia_km: retrato.distanciaKm,
        base_faturamento_estimado: retrato.faturamentoEstimado,
        base_faturamento_base: retrato.faturamentoBase,
        base_retrato_em: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  },

  /** Só os funcionários confirmados pelo time (US-0020); nulo volta a valer a RAIS. */
  async setFuncionarios(id: string, funcionarios: number | null): Promise<void> {
    const { error } = await tabela('prospect_companies').update({ funcionarios_informados: funcionarios }).eq('id', id);
    if (error) throw error;
  },

  /** Só o faturamento (US-0008): grava o calculado pela base sem regravar o resto da empresa. */
  async setFaturamento(id: string, valor: number, base: FaturamentoBase): Promise<void> {
    const { error } = await tabela('prospect_companies').update({ faturamento_anual: valor, faturamento_anual_base: base }).eq('id', id);
    if (error) throw error;
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
