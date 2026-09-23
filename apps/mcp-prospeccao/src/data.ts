/**
 * Acesso ao banco da Prospecção, SOB A RLS da pessoa logada.
 *
 * Nada aqui decide regra de etapa por conta própria:
 *   - o que muda por atividade (contador, próxima data, respondeu, sem resposta) é do trigger
 *     `prospect_activities_advance`, no banco — aqui só se insere a linha;
 *   - descartar e reabrir montam a linha com `@/lib/prospecting/transitions`, o mesmo módulo
 *     que o `prospectService` da tela usa. Um lugar só, para não repetir o TD-0022.
 *
 * `tenant_id` e autoria vêm SEMPRE da sessão (`currentEmployee`), nunca de parâmetro de tool.
 */

import { discardUpdate, reopenUpdate } from '@/lib/prospecting/transitions';
import {
  PROSPECT_FUNNEL_STAGES,
  toISODate,
  type ProspectActivityDB,
  type ProspectCompanyDB,
  type ProspectStage,
  type ProspectWithCompany,
} from '@/types/prospect';
import { currentEmployee, getSupabase } from './supabase.js';
import type { ActivityInput, CompanyFields, ContactFields, ContactFilter, PgError } from './types.js';

const PROSPECT_SELECT = '*, company:prospect_companies!prospects_company_id_fkey(*)';
const PROSPECT_SELECT_INNER = '*, company:prospect_companies!prospects_company_id_fkey!inner(*)';

/** Erro com frase pronta para a pessoa — o index devolve a mensagem sem traduzir. */
export class ProspeccaoError extends Error {}

/** Mesma tradução de `src/hooks/useProspectCompanies.ts` para a deduplicação de empresa. */
const POR_INDICE: Array<[string, string]> = [
  ['prospect_companies_tenant_cnpj_key', 'Já existe uma empresa com este CNPJ. Use search_companies e reaproveite o cadastro.'],
  ['prospect_companies_tenant_linkedin_key', 'Já existe uma empresa com este LinkedIn. Use search_companies e reaproveite o cadastro.'],
];

const POR_CODIGO: Record<string, (texto: string) => string> = {
  PU001: (texto) => texto,
  '42501': () => 'Seu perfil no Pulse não tem permissão para esta ação na Prospecção (prospeccao:editar).',
  '23514': (texto) => `Valor recusado pelo banco: ${texto}`,
};

export function explicar(error: PgError): ProspeccaoError {
  const texto = error.message ?? '';
  const indice = POR_INDICE.find(([chave]) => texto.includes(chave));
  if (indice) return new ProspeccaoError(indice[1]);
  const porCodigo = POR_CODIGO[error.code ?? ''];
  return new ProspeccaoError(porCodigo ? porCodigo(texto) : texto || 'Erro desconhecido no banco.');
}

/** `.or()` do PostgREST usa vírgula e parênteses como sintaxe: tirar do termo digitado. */
function termoSeguro(termo: string): string {
  return termo.replace(/[,()*%\\]/g, ' ').trim();
}

// --------------------------------------------------------------------------
// Diretório de pessoas
// --------------------------------------------------------------------------

let diretorio: Map<string, string> | null = null;

/**
 * Nome dos responsáveis pela RPC `get_employee_directory`, como a tela faz: o embed de
 * `employees` volta vazio para quem não é admin/gerente desde PUL-162.
 */
export async function nomesDasPessoas(): Promise<Map<string, string>> {
  if (diretorio) return diretorio;
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc('get_employee_directory');
  if (error) throw explicar(error);
  const linhas = (data ?? []) as Array<{ id: string; nome: string }>;
  diretorio = new Map(linhas.map((p) => [p.id, p.nome]));
  return diretorio;
}

/** Resolve "eu", um id ou parte do nome para o `employees.id`. */
export async function resolverPessoa(valor: string): Promise<string> {
  const eu = await currentEmployee();
  if (valor.trim().toLowerCase() === 'eu') return eu.employeeId;
  const pessoas = await nomesDasPessoas();
  if (pessoas.has(valor)) return valor;
  const termo = valor.trim().toLowerCase();
  const achadas = [...pessoas.entries()].filter(([, nome]) => nome.toLowerCase().includes(termo));
  if (achadas.length === 1) return achadas[0][0];
  if (achadas.length === 0) throw new ProspeccaoError(`Nenhuma pessoa do time corresponde a "${valor}".`);
  throw new ProspeccaoError(
    `"${valor}" é ambíguo: ${achadas.map(([, nome]) => nome).join(', ')}. Seja mais específico.`,
  );
}

// --------------------------------------------------------------------------
// Empresas
// --------------------------------------------------------------------------

export async function buscarEmpresas(termo: string, limite: number): Promise<ProspectCompanyDB[]> {
  const eu = await currentEmployee();
  const supabase = await getSupabase();
  const seguro = termoSeguro(termo);
  let query = supabase.from('prospect_companies').select('*').eq('tenant_id', eu.tenantId);
  if (seguro) {
    const filtros = [`name.ilike.*${seguro}*`];
    const digitos = seguro.replace(/\D/g, '');
    if (digitos.length >= 3) filtros.push(`cnpj.ilike.*${digitos}*`);
    query = query.or(filtros.join(','));
  }
  const { data, error } = await query.order('name').limit(limite);
  if (error) throw explicar(error);
  return (data ?? []) as ProspectCompanyDB[];
}

/** Quantos contatos cada empresa tem — responde "já tem gente dessa empresa na lista?". */
export async function contarContatos(companyIds: string[]): Promise<Map<string, number>> {
  if (companyIds.length === 0) return new Map();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('prospects')
    .select('company_id')
    .in('company_id', companyIds);
  if (error) throw explicar(error);
  const contagem = new Map<string, number>();
  for (const linha of (data ?? []) as Array<{ company_id: string }>) {
    contagem.set(linha.company_id, (contagem.get(linha.company_id) ?? 0) + 1);
  }
  return contagem;
}

export async function buscarEmpresa(id: string): Promise<ProspectCompanyDB> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('prospect_companies').select('*').eq('id', id).maybeSingle();
  if (error) throw explicar(error);
  if (!data) throw new ProspeccaoError('Empresa não encontrada (ou sem permissão para vê-la).');
  return data as ProspectCompanyDB;
}

export async function empresasComMesmoNome(nome: string): Promise<ProspectCompanyDB[]> {
  const eu = await currentEmployee();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('prospect_companies')
    .select('*')
    .eq('tenant_id', eu.tenantId)
    .ilike('name', termoSeguro(nome));
  if (error) throw explicar(error);
  return (data ?? []) as ProspectCompanyDB[];
}

/** Mesma normalização de `prospectCompanyService.normalize`: vazio vira NULL, CNPJ só dígitos. */
function normalizarEmpresa(campos: CompanyFields): Record<string, string | null> {
  const saida: Record<string, string | null> = {};
  for (const [chave, valor] of Object.entries(campos)) {
    if (valor === undefined) continue;
    const limpo = typeof valor === 'string' ? valor.trim() : valor;
    saida[chave] = chave === 'cnpj' && limpo ? String(limpo).replace(/\D/g, '') : limpo || null;
  }
  return saida;
}

export async function criarEmpresa(campos: CompanyFields & { name: string }): Promise<ProspectCompanyDB> {
  const eu = await currentEmployee();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('prospect_companies')
    .insert({ tenant_id: eu.tenantId, created_by: eu.employeeId, ...normalizarEmpresa(campos) })
    .select()
    .single();
  if (error) throw explicar(error);
  return data as ProspectCompanyDB;
}

export async function atualizarEmpresa(id: string, campos: CompanyFields): Promise<ProspectCompanyDB> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('prospect_companies')
    .update(normalizarEmpresa(campos))
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw explicar(error);
  if (!data) throw new ProspeccaoError('Empresa não encontrada (ou sem permissão para editá-la).');
  return data as ProspectCompanyDB;
}

// --------------------------------------------------------------------------
// Contatos
// --------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- builder do PostgREST sem tipo gerado
type Consulta = any;

/** Um aplicador por critério: campo vazio não restringe nada, como no filtro da tela. */
const APLICADORES: Array<(q: Consulta, f: ContactFilter) => Consulta> = [
  (q, f) => (f.companyId ? q.eq('company_id', f.companyId) : q),
  (q, f) => (f.empresa ? q.ilike('company.name', `%${termoSeguro(f.empresa)}%`) : q),
  (q, f) => (f.contato ? q.ilike('contact_name', `%${termoSeguro(f.contato)}%`) : q),
  (q, f) => (f.responsavelId ? q.eq('owner_id', f.responsavelId) : q),
  (q, f) => (f.alavanca ? q.eq('lever', f.alavanca) : q),
  (q, f) => (f.vencendoAte ? q.lte('next_activity_on', f.vencendoAte) : q),
  aplicarEtapa,
];

/** Sem etapa escolhida, só o que está no board: encerrados só quando pedidos. */
function aplicarEtapa(q: Consulta, f: ContactFilter): Consulta {
  if (f.etapa) return q.eq('stage', f.etapa);
  return f.incluirEncerrados ? q : q.in('stage', [...PROSPECT_FUNNEL_STAGES]);
}

export async function listarContatos(filtro: ContactFilter): Promise<ProspectWithCompany[]> {
  const eu = await currentEmployee();
  const supabase = await getSupabase();
  const base = supabase
    .from('prospects')
    .select(filtro.empresa ? PROSPECT_SELECT_INNER : PROSPECT_SELECT)
    .eq('tenant_id', eu.tenantId);
  const query = APLICADORES.reduce((q, aplicar) => aplicar(q, filtro), base);

  const ordem = filtro.vencendoAte ? 'next_activity_on' : 'updated_at';
  const { data, error } = await query
    .order(ordem, { ascending: !!filtro.vencendoAte })
    .limit(filtro.limite);
  if (error) throw explicar(error);
  return (data ?? []) as unknown as ProspectWithCompany[];
}

export async function buscarContato(id: string): Promise<ProspectWithCompany> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('prospects').select(PROSPECT_SELECT).eq('id', id).maybeSingle();
  if (error) throw explicar(error);
  if (!data) throw new ProspeccaoError('Contato não encontrado (ou sem permissão para vê-lo).');
  return data as unknown as ProspectWithCompany;
}

export async function atividadesDoContato(prospectId: string, limite: number): Promise<ProspectActivityDB[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('prospect_activities')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('sequence_no', { ascending: false })
    .limit(limite);
  if (error) throw explicar(error);
  return (data ?? []) as ProspectActivityDB[];
}

function normalizarContato(campos: ContactFields): Record<string, string | null> {
  const saida: Record<string, string | null> = {};
  for (const [chave, valor] of Object.entries(campos)) {
    if (valor === undefined) continue;
    saida[chave] = typeof valor === 'string' ? valor.trim() || null : valor;
  }
  return saida;
}

export async function criarContato(
  companyId: string,
  campos: ContactFields & { contact_name: string },
): Promise<ProspectWithCompany> {
  const eu = await currentEmployee();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('prospects')
    .insert({
      tenant_id: eu.tenantId,
      company_id: companyId,
      created_by: eu.employeeId,
      owner_id: eu.employeeId,
      primary_channel: 'email',
      ...normalizarContato(campos),
    })
    .select(PROSPECT_SELECT)
    .single();
  if (error) throw explicar(error);
  return data as unknown as ProspectWithCompany;
}

export async function atualizarContato(id: string, campos: ContactFields): Promise<ProspectWithCompany> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('prospects')
    .update(normalizarContato(campos))
    .eq('id', id)
    .select(PROSPECT_SELECT)
    .maybeSingle();
  if (error) throw explicar(error);
  if (!data) throw new ProspeccaoError('Contato não encontrado (ou sem permissão para editá-lo).');
  return data as unknown as ProspectWithCompany;
}

export async function moverEtapa(id: string, etapa: ProspectStage): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from('prospects').update({ stage: etapa }).eq('id', id);
  if (error) throw explicar(error);
}

export async function descartar(id: string, motivo: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from('prospects').update(discardUpdate(motivo)).eq('id', id);
  if (error) throw explicar(error);
}

export async function reabrir(id: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.from('prospects').update(reopenUpdate()).eq('id', id);
  if (error) throw explicar(error);
}

// --------------------------------------------------------------------------
// Atividades
// --------------------------------------------------------------------------

/**
 * Mesma linha que `registerActivity` da tela: sem número do toque nem próxima data — quem
 * conta e agenda é o trigger. O responsável da atividade é quem registrou, como na tela.
 */
export async function registrarAtividade(input: ActivityInput): Promise<ProspectActivityDB> {
  const eu = await currentEmployee();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('prospect_activities')
    .insert({
      tenant_id: eu.tenantId,
      prospect_id: input.prospectId,
      channel: input.channel,
      got_response: input.gotResponse,
      activity_date: input.activityDate ?? toISODate(new Date()),
      notes: input.notes.trim(),
      attachments: [],
      owner_id: eu.employeeId,
      created_by: eu.employeeId,
    })
    .select()
    .single();
  if (error) throw explicar(error);
  return data as ProspectActivityDB;
}

// --------------------------------------------------------------------------
// Métricas
// --------------------------------------------------------------------------

export async function dadosDeMetricas(desde: string) {
  const eu = await currentEmployee();
  const supabase = await getSupabase();
  const [contatos, atividades] = await Promise.all([
    supabase.from('prospects').select(PROSPECT_SELECT).eq('tenant_id', eu.tenantId),
    supabase
      .from('prospect_activities')
      .select('*')
      .eq('tenant_id', eu.tenantId)
      .gte('activity_date', desde),
  ]);
  if (contatos.error) throw explicar(contatos.error);
  if (atividades.error) throw explicar(atividades.error);
  return {
    prospects: (contatos.data ?? []) as unknown as ProspectWithCompany[],
    activities: (atividades.data ?? []) as unknown as ProspectActivityDB[],
  };
}
