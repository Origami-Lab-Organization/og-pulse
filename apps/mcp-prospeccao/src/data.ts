/**
 * Acesso ao banco da Prospecção, SOB A RLS da pessoa logada.
 *
 * Nada aqui decide regra de etapa por conta própria:
 *   - o que muda por atividade (contador, próxima data, respondeu, sem resposta) é do trigger
 *     `prospect_activities_advance`, no banco — aqui só se insere a linha;
 *   - descartar e reabrir montam a linha com `@/lib/prospecting/transitions`, o mesmo módulo
 *     que o `prospectService` da tela usa. Um lugar só, para não repetir o TD-0022;
 *   - Ganho e Perda seguem as regras do trigger `prospects_outcome_rules` (20260928200000):
 *     Ganho só de Reunião feita em diante, data obrigatória, e sair do desfecho o limpa.
 *
 * `tenant_id` e autoria vêm SEMPRE da sessão (`currentEmployee`), nunca de parâmetro de tool.
 */

import { discardUpdate, reopenUpdate } from '@/lib/prospecting/transitions';
import type { ActivityLite, MetricsSource, ProspectStageChangeDB } from '@/types/prospectMetrics';
import {
  PROSPECT_FUNNEL_STAGES,
  sortProspectTasks,
  toISODate,
  type PendingTaskLite,
  type ProspectActivityDB,
  type ProspectCompanyDB,
  type ProspectStage,
  type ProspectTaskDB,
  type ProspectWithCompany,
} from '@/types/prospect';
import { currentEmployee, getSupabase } from './supabase.js';
import type {
  ActivityInput,
  ClientLite,
  CompanyFields,
  ContactDeal,
  ContactFields,
  ContactFilter,
  PgError,
} from './types.js';

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

/**
 * O vínculo com cliente só aceita cliente do MESMO tenant. A FK de `client_id` não olha
 * tenant, e o id chega por parâmetro de tool — sem esta checagem, um UUID de outra
 * organização ligaria as duas (boundaries: nunca expor dado entre tenants).
 */
async function exigirClienteDoTenant(clientId: string | null | undefined): Promise<void> {
  if (!clientId) return;
  const eu = await currentEmployee();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('tenant_id', eu.tenantId)
    .maybeSingle();
  if (error) throw explicar(error);
  if (!data) throw new ProspeccaoError('Cliente não encontrado (ou sem permissão para vê-lo) — use search_clients.');
}

/** A empresa da Prospecção já ligada ao cliente — a primeira, se por acaso houver duas. */
export async function empresaPorCliente(clientId: string): Promise<ProspectCompanyDB | null> {
  const eu = await currentEmployee();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('prospect_companies')
    .select('*')
    .eq('tenant_id', eu.tenantId)
    .eq('client_id', clientId)
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (error) throw explicar(error);
  return (data as ProspectCompanyDB) ?? null;
}

/** Clientes da carteira por nome, nome fantasia ou CNPJ, com a empresa da Prospecção ligada. */
export async function buscarClientes(termo: string, limite: number): Promise<ClientLite[]> {
  const eu = await currentEmployee();
  const supabase = await getSupabase();
  const seguro = termoSeguro(termo);
  let query = supabase
    .from('clients')
    .select('id, company_name, trading_name, cnpj')
    .eq('tenant_id', eu.tenantId);
  if (seguro) {
    const filtros = [`company_name.ilike.*${seguro}*`, `trading_name.ilike.*${seguro}*`];
    const digitos = seguro.replace(/\D/g, '');
    if (digitos.length >= 3) filtros.push(`cnpj.ilike.*${digitos}*`);
    query = query.or(filtros.join(','));
  }
  const { data, error } = await query.order('company_name').limit(limite);
  if (error) throw explicar(error);
  const clientes = (data ?? []) as ClientLite[];
  if (clientes.length === 0) return clientes;

  const { data: ligadas, error: erroLigadas } = await supabase
    .from('prospect_companies')
    .select('id, client_id')
    .eq('tenant_id', eu.tenantId)
    .in('client_id', clientes.map((c) => c.id));
  if (erroLigadas) throw explicar(erroLigadas);
  const porCliente = new Map((ligadas ?? []).map((l) => [l.client_id as string, l.id as string]));
  return clientes.map((c) => ({ ...c, prospectCompanyId: porCliente.get(c.id) ?? null }));
}

/**
 * Orçamento e projeto do contato. Cada um passa pela RLS da própria tabela: sem
 * `orcamento:ler`, "nenhum orçamento" — não é erro, é o que a pessoa pode ver.
 */
export async function negocioDoContato(prospectId: string): Promise<ContactDeal> {
  const supabase = await getSupabase();
  const [orcamento, projeto] = await Promise.all([
    supabase
      .from('budgets')
      .select('id, budget_number, title, final_total, status')
      .eq('prospect_id', prospectId)
      .maybeSingle(),
    supabase
      .from('projects')
      .select('id, name, status')
      .eq('prospect_id', prospectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    orcamento: orcamento.error ? null : (orcamento.data as ContactDeal['orcamento']),
    projeto: projeto.error ? null : (projeto.data as ContactDeal['projeto']),
  };
}

export async function criarEmpresa(campos: CompanyFields & { name: string }): Promise<ProspectCompanyDB> {
  await exigirClienteDoTenant(campos.client_id);
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
  await exigirClienteDoTenant(campos.client_id);
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

/** Campo da tool que tem outro nome no banco. */
const COLUNA: Record<string, string> = { observacoes: 'notes' };

function normalizarContato(campos: ContactFields): Record<string, string | number | null> {
  const saida: Record<string, string | number | null> = {};
  for (const [chave, valor] of Object.entries(campos)) {
    if (valor === undefined) continue;
    saida[COLUNA[chave] ?? chave] = typeof valor === 'string' ? valor.trim() || null : valor;
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

/**
 * Com `dia`, o histórico de etapa guarda o dia do fato em vez do dia do registro — a reunião
 * que aconteceu ontem. É o mesmo `set_prospect_stage` da tela (20260928160000).
 */
export async function moverEtapa(id: string, etapa: ProspectStage, dia?: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = dia
    ? await supabase.rpc('set_prospect_stage', { p_prospect_id: id, p_stage: etapa, p_occurred_on: dia })
    : await supabase.from('prospects').update({ stage: etapa }).eq('id', id);
  if (error) throw explicar(error);
}

/**
 * Registra (ou corrige) o Ganho: mesma RPC da tela. `valor` nulo é o ganho sem valor, que o
 * card sinaliza até alguém preencher. Data futura e valor negativo o banco recusa.
 */
export async function marcarGanho(id: string, dia: string, valor: number | null): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase.rpc('mark_prospect_won', { p_prospect_id: id, p_won_on: dia, p_value: valor });
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

/** Limite padrão de linhas por resposta do PostgREST. */
const PAGINA = 1000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- builder do PostgREST sem tipo gerado
type Pagina = PromiseLike<{ data: any[] | null; error: PgError | null }>;

/**
 * Lê todas as páginas, como `prospectService` da tela. As métricas somam meses de atividade,
 * e uma leitura única pararia em silêncio na milésima linha — o número sairia menor sem erro.
 */
async function todasAsPaginas<T>(pagina: (de: number, ate: number) => Pagina): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await pagina(de, de + PAGINA - 1);
    if (error) throw explicar(error);
    linhas.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGINA) return linhas;
  }
}

const ATIVIDADE_LEVE = 'prospect_id, activity_date, sequence_no, got_response';

export interface DadosDasMetricas extends MetricsSource {
  tarefasPendentes: PendingTaskLite[];
}

/**
 * O que a aba Métricas lê (`useProspectMetricsData`), com as mesmas consultas: contatos,
 * empresas, todas as respostas (a 1ª pode ser antiga), atividades desde `desde`, histórico de
 * etapa e tarefas pendentes. Tudo sob a RLS e o tenant da sessão.
 */
export async function dadosDasMetricas(desde: string): Promise<DadosDasMetricas> {
  const eu = await currentEmployee();
  const supabase = await getSupabase();
  const doTenant = (tabela: string, colunas: string) => supabase.from(tabela).select(colunas).eq('tenant_id', eu.tenantId);
  const [prospects, companies, responses, activities, changes, tarefasPendentes] = await Promise.all([
    todasAsPaginas<ProspectWithCompany>((de, ate) => doTenant('prospects', PROSPECT_SELECT).order('id').range(de, ate)),
    todasAsPaginas<ProspectCompanyDB>((de, ate) => doTenant('prospect_companies', '*').order('id').range(de, ate)),
    todasAsPaginas<ActivityLite>((de, ate) =>
      doTenant('prospect_activities', ATIVIDADE_LEVE).eq('got_response', true).order('id').range(de, ate),
    ),
    todasAsPaginas<ActivityLite>((de, ate) =>
      doTenant('prospect_activities', ATIVIDADE_LEVE).gte('activity_date', desde).order('id').range(de, ate),
    ),
    todasAsPaginas<ProspectStageChangeDB>((de, ate) =>
      doTenant('prospect_stage_changes', 'prospect_id, from_stage, to_stage, discard_reason, occurred_on, source')
        .order('id')
        .range(de, ate),
    ),
    todasAsPaginas<PendingTaskLite>((de, ate) =>
      doTenant('prospect_tasks', 'prospect_id, due_date, description').is('done_at', null).order('id').range(de, ate),
    ),
  ]);
  return { prospects, companies, responses, activities, changes, tarefasPendentes };
}

// --------------------------------------------------------------------------
// Duplicidade de empresa
// --------------------------------------------------------------------------

/** `%` e `_` são curinga no ILIKE: escapados, a comparação vira igualdade sem caixa. */
function igualSemCaixa(valor: string): string {
  return valor.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** CNPJ é gravado só com dígitos (`normalizarEmpresa`), e é único por organização. */
export async function empresaPorCnpj(cnpj: string): Promise<ProspectCompanyDB | null> {
  const digitos = cnpj.replace(/\D/g, '');
  if (!digitos) return null;
  const eu = await currentEmployee();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('prospect_companies')
    .select('*')
    .eq('tenant_id', eu.tenantId)
    .eq('cnpj', digitos)
    .maybeSingle();
  if (error) throw explicar(error);
  return (data as ProspectCompanyDB) ?? null;
}

/** Mesma chave do índice único `prospect_companies_tenant_linkedin_key`: `lower(btrim(linkedin_url))`. */
export async function empresaPorLinkedin(url: string): Promise<ProspectCompanyDB | null> {
  if (!url.trim()) return null;
  const eu = await currentEmployee();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('prospect_companies')
    .select('*')
    .eq('tenant_id', eu.tenantId)
    .ilike('linkedin_url', igualSemCaixa(url))
    .maybeSingle();
  if (error) throw explicar(error);
  return (data as ProspectCompanyDB) ?? null;
}

/** Nome idêntico, sem diferenciar caixa — a mesma chave de `prospect_companies_tenant_name_idx`. */
export async function empresasPorNomeExato(nome: string): Promise<ProspectCompanyDB[]> {
  const eu = await currentEmployee();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('prospect_companies')
    .select('*')
    .eq('tenant_id', eu.tenantId)
    .ilike('name', igualSemCaixa(nome))
    .order('created_at');
  if (error) throw explicar(error);
  return (data ?? []) as ProspectCompanyDB[];
}

// --------------------------------------------------------------------------
// Tarefas
// --------------------------------------------------------------------------
//
// Tarefa NÃO é atividade: não conta toque, não agenda cadência e não move etapa. Tenant e
// responsável vêm do contato pelo trigger `prospect_tasks_inherit_parent`, como na tela.

const TAREFA_COM_CONTATO =
  '*, prospect:prospects!prospect_tasks_prospect_id_fkey(contact_name, company:prospect_companies!prospects_company_id_fkey(name))';

export type TarefaComContato = ProspectTaskDB & {
  prospect?: { contact_name: string; company?: { name: string } | null } | null;
};

export async function tarefasDoContato(prospectId: string, incluirConcluidas: boolean): Promise<ProspectTaskDB[]> {
  const supabase = await getSupabase();
  let query = supabase.from('prospect_tasks').select('*').eq('prospect_id', prospectId);
  if (!incluirConcluidas) query = query.is('done_at', null);
  const { data, error } = await query.order('due_date');
  if (error) throw explicar(error);
  return sortProspectTasks((data ?? []) as ProspectTaskDB[]);
}

/** Tarefas pendentes de uma pessoa em todos os contatos, da mais urgente para a mais distante. */
export async function tarefasPendentesDe(ownerId: string, ate: string | undefined, limite: number): Promise<TarefaComContato[]> {
  const eu = await currentEmployee();
  const supabase = await getSupabase();
  let query = supabase
    .from('prospect_tasks')
    .select(TAREFA_COM_CONTATO)
    .eq('tenant_id', eu.tenantId)
    .eq('owner_id', ownerId)
    .is('done_at', null);
  if (ate) query = query.lte('due_date', ate);
  const { data, error } = await query.order('due_date').limit(limite);
  if (error) throw explicar(error);
  return (data ?? []) as unknown as TarefaComContato[];
}

export async function buscarTarefa(id: string): Promise<ProspectTaskDB> {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('prospect_tasks').select('*').eq('id', id).maybeSingle();
  if (error) throw explicar(error);
  if (!data) throw new ProspeccaoError('Tarefa não encontrada (ou sem permissão para vê-la).');
  return data as ProspectTaskDB;
}

/** Mesma linha que `createTask` da tela: só contato, texto, prazo e autoria. */
export async function criarTarefa(prospectId: string, descricao: string, prazo: string): Promise<ProspectTaskDB> {
  const eu = await currentEmployee();
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('prospect_tasks')
    .insert({ prospect_id: prospectId, description: descricao.trim(), due_date: prazo, created_by: eu.employeeId })
    .select()
    .single();
  if (error) throw explicar(error);
  return data as ProspectTaskDB;
}

export interface TaskChanges {
  descricao?: string;
  prazo?: string;
  concluida?: boolean;
}

/** Concluir grava quando e quem, como o checkbox da tela; reabrir limpa os dois. */
async function linhaDaTarefa(mudancas: TaskChanges): Promise<Record<string, string | null>> {
  const linha: Record<string, string | null> = {};
  if (mudancas.descricao !== undefined) linha.description = mudancas.descricao.trim();
  if (mudancas.prazo !== undefined) linha.due_date = mudancas.prazo;
  if (mudancas.concluida !== undefined) {
    const eu = mudancas.concluida ? await currentEmployee() : null;
    linha.done_at = eu ? new Date().toISOString() : null;
    linha.done_by = eu?.employeeId ?? null;
  }
  return linha;
}

export async function atualizarTarefa(id: string, mudancas: TaskChanges): Promise<ProspectTaskDB> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('prospect_tasks')
    .update(await linhaDaTarefa(mudancas))
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw explicar(error);
  if (!data) throw new ProspeccaoError('Tarefa não encontrada (ou sem permissão para editá-la).');
  return data as ProspectTaskDB;
}
