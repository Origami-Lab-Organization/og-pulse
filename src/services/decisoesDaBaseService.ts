import { tabela } from '@/services/prospectingTables';
import type { EmpresaParaDecidir } from '@/types/decisoesDaBase';
import type { DecisaoDasMetricas } from '@/types/prospectMetrics';
import type { DecisaoDaBase, MotivoDoDescarte } from '@/types/relacao';

/**
 * Descartar e "Não agora" na Base de empresas (US-0010). O banco guarda quem decidiu e quando,
 * recusa mudar uma decisão gravada e só deixa gravar com `prospeccao:editar`
 * (migration 20261123200000).
 */

interface NovaDecisao {
  tenantId: string;
  empresas: EmpresaParaDecidir[];
  decisao: DecisaoDaBase;
  motivo?: MotivoDoDescarte | null;
  texto?: string | null;
  voltarEm?: string | null;
  prospectId?: string | null;
}

const LIMITE_DO_NOME = 200;
const digitos = (cnpj: string) => cnpj.replace(/\D/g, '');
const agora = () => new Date().toISOString();

/** Desfaz as decisões: quem desfez e quando vêm da sessão, no banco. */
export async function desfazerDecisoes(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await tabela('prospect_decisoes_da_base').update({ desfeita_em: agora() }).in('id', ids).is('desfeita_em', null);
  if (error) throw error;
}

/** Uma decisão valendo por empresa: a nova substitui a que houver (ex.: "Não agora" → Descartada). */
async function desfazerAsValendo(tenantId: string, empresas: EmpresaParaDecidir[]): Promise<void> {
  const raizes = [...new Set(empresas.map((e) => digitos(e.cnpj).slice(0, 8)))];
  const { error } = await tabela('prospect_decisoes_da_base')
    .update({ desfeita_em: agora() })
    .eq('tenant_id', tenantId)
    .in('cnpj_raiz', raizes)
    .is('desfeita_em', null);
  if (error) throw error;
}

/** Grava a decisão para cada empresa; devolve os ids, para o Desfazer da mensagem. */
export async function decidirNaBase(nova: NovaDecisao): Promise<string[]> {
  await desfazerAsValendo(nova.tenantId, nova.empresas);
  const linhas = nova.empresas.map((e) => ({
    tenant_id: nova.tenantId,
    cnpj: digitos(e.cnpj),
    empresa_nome: e.nome.trim().slice(0, LIMITE_DO_NOME),
    decisao: nova.decisao,
    motivo: nova.motivo ?? null,
    texto: nova.texto?.trim() || null,
    voltar_em: nova.voltarEm ?? null,
    prospect_id: nova.prospectId ?? null,
  }));
  const { data, error } = await tabela('prospect_decisoes_da_base').insert(linhas).select('id');
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string }>).map((d) => d.id);
}

/** As decisões do tenant, desde sempre, para as Métricas (US-0021); poucas linhas por tenant. */
export async function fetchDecisoesParaMetricas(): Promise<DecisaoDasMetricas[]> {
  const { data, error } = await tabela('prospect_decisoes_da_base')
    .select('decisao, motivo, decidida_por, decidida_em, desfeita_em, voltar_em, prospect_id')
    .order('decidida_em');
  if (error) throw error;
  return (data ?? []) as DecisaoDasMetricas[];
}
