import { tabela } from '@/services/prospectingTables';
import type { ProspectStage } from '@/types/prospect';

const ETAPA_QUALIFICACAO: ProspectStage = 'qualificacao';
const LOTE = 200;

interface EntradaNaEtapa {
  prospect_id: string;
  occurred_on: string;
}

/**
 * Última entrada de cada oportunidade em Qualificação (US-0042), pelo histórico de etapas. A RLS
 * do tenant vale; a lista é pequena, em lotes para não estourar a URL.
 */
export async function fetchEntradasNaQualificacao(ids: string[]): Promise<Map<string, string>> {
  const entradas = new Map<string, string>();
  for (let i = 0; i < ids.length; i += LOTE) {
    const { data, error } = await tabela('prospect_stage_changes')
      .select('prospect_id, occurred_on')
      .eq('to_stage', ETAPA_QUALIFICACAO)
      .in('prospect_id', ids.slice(i, i + LOTE))
      .order('occurred_on', { ascending: false });
    if (error) throw error;
    for (const e of (data ?? []) as EntradaNaEtapa[]) {
      if (!entradas.has(e.prospect_id)) entradas.set(e.prospect_id, e.occurred_on.slice(0, 10));
    }
  }
  return entradas;
}
