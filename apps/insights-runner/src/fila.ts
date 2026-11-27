/**
 * A fila de pedidos de insights (US-0057, migration 20261127160000). O runner atende só os
 * pedidos do próprio dono (ADR-0057) e grava com o login dele: a RLS e os gatilhos do banco
 * conferem capacidade, tenant, fonte obrigatória e a ordem do status.
 */
import type { Conexao, EmpresaDoPedido, Pedido } from './tipos.js';
import { FalhaDaGeracao, perguntarAoClaude } from './claude.js';
import { FORMATO_DA_RESPOSTA, pedidoAoClaude } from './pedidoAoClaude.js';

const PEDIDOS = 'prospect_insights_pedidos';
const TEMAS = ['produtos', 'clientes', 'concorrentes', 'noticias'] as const;
const FONTE = /^https?:\/\//;

interface Faixa {
  de: number;
  ate: number;
  confianca: string;
  fonte: string;
}

type Resposta = Record<(typeof TEMAS)[number], unknown[]> & { funcionarios: Faixa | null; faturamento: Faixa | null };

export async function darSinal({ pulse, dono }: Conexao): Promise<void> {
  const { error } = await pulse
    .from('prospect_insights_runners')
    .upsert({ user_id: dono.userId, tenant_id: dono.tenantId, visto_em: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) throw new Error('Não consegui dar sinal ao Pulse.');
}

/** O que ficou "gerando" quando o runner parou não vai terminar: vira falha, e dá para pedir de novo. */
export async function liberarInterrompidos({ pulse, dono }: Conexao): Promise<void> {
  await pulse.from(PEDIDOS).update({ status: 'falhou', erro: 'Interrompido.' }).eq('pedido_por', dono.userId).eq('status', 'gerando');
}

export async function proximoPedido({ pulse, dono }: Conexao): Promise<Pedido | null> {
  const { data } = await pulse
    .from(PEDIDOS).select('id, company_id')
    .eq('pedido_por', dono.userId).eq('status', 'na_fila')
    .order('pedido_em', { ascending: true }).limit(1).maybeSingle();
  if (!data) return null;
  const { data: pego } = await pulse
    .from(PEDIDOS).update({ status: 'gerando' })
    .eq('id', (data as Pedido).id).eq('status', 'na_fila')
    .select('id, company_id').maybeSingle();
  return (pego as Pedido | null) ?? null;
}

interface EmpresaGuardada {
  name: string;
  razao_social: string | null;
  cnpj: string | null;
  website: string | null;
  segment: string | null;
  receita: { endereco?: { municipio?: string; uf?: string } } | null;
}

function paraOPedido(e: EmpresaGuardada): EmpresaDoPedido {
  const endereco = e.receita?.endereco ?? {};
  return {
    nome: e.name, razaoSocial: e.razao_social, cnpj: e.cnpj, site: e.website,
    cidade: endereco.municipio ?? null, uf: endereco.uf ?? null, ramo: e.segment,
  };
}

async function lerEmpresa({ pulse }: Conexao, id: string): Promise<EmpresaDoPedido> {
  const { data, error } = await pulse
    .from('prospect_companies').select('name, razao_social, cnpj, website, segment, receita').eq('id', id).single();
  if (error || !data) throw new FalhaDaGeracao('Empresa não encontrada.');
  return paraOPedido(data as EmpresaGuardada);
}

const faixaValida = (f: Faixa | null): f is Faixa =>
  !!f && FONTE.test(f.fonte) && Number.isFinite(f.de) && Number.isFinite(f.ate) && f.de >= 0 && f.ate >= f.de;

function propostas(resposta: Resposta, insightId: string, pedido: Pedido) {
  const porTipo = [['funcionarios', resposta.funcionarios], ['faturamento', resposta.faturamento]] as const;
  return porTipo
    .filter(([, f]) => faixaValida(f))
    .map(([tipo, f]) => ({
      company_id: pedido.company_id, insight_id: insightId, tipo,
      de: Math.round(f!.de), ate: Math.round(f!.ate), confianca: f!.confianca, fonte: f!.fonte,
    }));
}

async function gravar(con: Conexao, pedido: Pedido, resposta: Resposta): Promise<void> {
  const { pulse, dono } = con;
  const temas = Object.fromEntries(TEMAS.map((t) => [t, resposta[t] ?? []]));
  const { data, error } = await pulse
    .from('prospect_company_insights')
    .insert({ company_id: pedido.company_id, tenant_id: dono.tenantId, pedido_id: pedido.id, temas, gerado_por: dono.userId })
    .select('id').single();
  if (error || !data) throw new FalhaDaGeracao('Não consegui gravar os insights.');
  const linhas = propostas(resposta, (data as { id: string }).id, pedido).map((p) => ({ ...p, tenant_id: dono.tenantId }));
  if (linhas.length) await pulse.from('prospect_porte_propostas').insert(linhas);
  await pulse.from(PEDIDOS).update({ status: 'pronto' }).eq('id', pedido.id);
}

async function marcarFalha({ pulse }: Conexao, pedido: Pedido, motivo: string): Promise<void> {
  await pulse.from(PEDIDOS).update({ status: 'falhou', erro: motivo.slice(0, 300) }).eq('id', pedido.id);
}

export async function processar(con: Conexao, pedido: Pedido): Promise<boolean> {
  try {
    const empresa = await lerEmpresa(con, pedido.company_id);
    const resposta = (await perguntarAoClaude(pedidoAoClaude(empresa), FORMATO_DA_RESPOSTA)) as Resposta;
    await gravar(con, pedido, resposta);
    return true;
  } catch (erro) {
    await marcarFalha(con, pedido, erro instanceof FalhaDaGeracao ? erro.message : 'Falha ao gerar.');
    return false;
  }
}
