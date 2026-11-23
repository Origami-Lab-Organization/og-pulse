import { tabela } from '@/services/prospectingTables';
import type { EvidenciaBantDB, NovaEvidenciaBant, SituacaoEvidencia } from '@/types/bant';

/**
 * Evidências do BANT (US-0022). A pessoa grava já aceita; a IA propõe pelo MCP (US-0024). O
 * banco herda o tenant da oportunidade, marca quem decidiu e quando, e só deixa aceitar ou
 * recusar uma proposta (trigger `prospect_bant_evidencias_guard`).
 */

const PESSOA = 'pessoa' as const;
const LOTE_DE_IDS = 150;

export async function fetchEvidenciasBant(prospectId: string): Promise<EvidenciaBantDB[]> {
  const { data, error } = await tabela('prospect_bant_evidencias')
    .select('*')
    .eq('prospect_id', prospectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as EvidenciaBantDB[];
}

/** Todas as evidências do tenant, sem as recusadas, para as Métricas (US-0021); a RLS limita ao tenant. */
export async function fetchEvidenciasBantDoTenant(): Promise<EvidenciaBantDB[]> {
  const { data, error } = await tabela('prospect_bant_evidencias').select('*').neq('situacao', 'recusada');
  if (error) throw error;
  return (data ?? []) as unknown as EvidenciaBantDB[];
}

/** As evidências de várias oportunidades (o quadro), em lotes para não estourar a URL. */
export async function fetchEvidenciasBantDe(prospectIds: string[]): Promise<EvidenciaBantDB[]> {
  const lotes: string[][] = [];
  for (let i = 0; i < prospectIds.length; i += LOTE_DE_IDS) lotes.push(prospectIds.slice(i, i + LOTE_DE_IDS));
  const respostas = await Promise.all(
    lotes.map((ids) => tabela('prospect_bant_evidencias').select('*').in('prospect_id', ids).neq('situacao', 'recusada')),
  );
  return respostas.flatMap(({ data, error }) => {
    if (error) throw error;
    return (data ?? []) as unknown as EvidenciaBantDB[];
  });
}

export async function registrarEvidenciaBant(nova: NovaEvidenciaBant): Promise<EvidenciaBantDB> {
  const { data, error } = await tabela('prospect_bant_evidencias')
    .insert({ ...nova, texto: nova.texto.trim(), fonte: nova.fonte?.trim() || null, origem: PESSOA })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as EvidenciaBantDB;
}

/** Aceitar ou recusar uma proposta da IA: a decisão é sempre da pessoa (19/11/2026). */
export async function decidirEvidenciaBant(id: string, situacao: Exclude<SituacaoEvidencia, 'proposta'>): Promise<void> {
  const { error } = await tabela('prospect_bant_evidencias').update({ situacao }).eq('id', id);
  if (error) throw error;
}
