import { rpc, tabela } from '@/services/prospectingTables';
import type { EstadoDaProposta, TemaDoPedido } from '@/lib/prospecting/insights.constants';
import type { PedidoDeInsights, PropostaDePorte, VersaoDosInsights } from '@/types/insights';

/**
 * Insights de IA da empresa (US-0057, ADR-0057). O botão só grava o pedido; o runner local de quem
 * pediu gera e grava. O banco confere a capacidade, o runner ativo, a fonte e a decisão única.
 */

const PEDIDOS_RECENTES = 30;

/** O runner de quem está na página deu sinal nos últimos 90 s. */
export async function runnerDisponivel(): Promise<boolean> {
  const { data, error } = await rpc('insights_runner_disponivel', {});
  if (error) throw error;
  return data === true;
}

/** Pedidos recentes da empresa, do mais novo para o mais antigo: a tela usa o último de cada tema. */
export async function pedidosRecentes(companyId: string): Promise<PedidoDeInsights[]> {
  const { data, error } = await tabela('prospect_insights_pedidos')
    .select('id, tema, status, erro, pedido_em')
    .eq('company_id', companyId)
    .order('pedido_em', { ascending: false })
    .limit(PEDIDOS_RECENTES);
  if (error) throw error;
  return (data ?? []) as PedidoDeInsights[];
}

export async function versoesDosInsights(companyId: string): Promise<VersaoDosInsights[]> {
  const { data, error } = await tabela('prospect_company_insights')
    .select('id, tema, gerado_em, temas')
    .eq('company_id', companyId)
    .order('gerado_em', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VersaoDosInsights[];
}

export async function propostasDePorte(companyId: string): Promise<PropostaDePorte[]> {
  const { data, error } = await tabela('prospect_porte_propostas')
    .select('id, insight_id, tipo, de, ate, confianca, fonte, estado, decidida_em')
    .eq('company_id', companyId)
    .order('criada_em', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as PropostaDePorte[]).map((p) => ({ ...p, de: Number(p.de), ate: Number(p.ate) }));
}

/** Quem pede e o tenant vêm do banco (gatilho); sem o runner ativo, o banco recusa. */
export async function pedirInsights(companyId: string, tenantId: string, tema: TemaDoPedido): Promise<void> {
  const { error } = await tabela('prospect_insights_pedidos').insert({ company_id: companyId, tenant_id: tenantId, tema });
  if (error) throw error;
}

export async function decidirProposta(id: string, estado: EstadoDaProposta): Promise<void> {
  const { error } = await tabela('prospect_porte_propostas').update({ estado }).eq('id', id);
  if (error) throw error;
}
