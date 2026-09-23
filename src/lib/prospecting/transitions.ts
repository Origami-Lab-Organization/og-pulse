import {
  PROSPECT_DISCARD_REASONS,
  PROSPECT_MANUAL_STAGES,
  toISODate,
  type ProspectStage,
} from '@/types/prospect';

/**
 * Transições de etapa conduzidas pela aplicação — fonte ÚNICA para a tela e o MCP.
 *
 * Existe por causa do TD-0022: a escrita de Oportunidade tem duas implementações (tela e
 * `apps/mcp-drive`) que divergem em silêncio. A Prospecção nasce com um só lugar: o
 * `prospectService` e o `apps/mcp-prospeccao` montam a linha a partir daqui.
 *
 * O que muda por atividade (contador, próxima data, respondeu, sem resposta) NÃO está aqui:
 * mora no trigger `prospect_activities_advance`, no banco.
 */

const MOTIVOS = new Set<string>(PROSPECT_DISCARD_REASONS.map((r) => r.value));

export function isValidDiscardReason(reason: string): boolean {
  return MOTIVOS.has(reason);
}

/** Só as etapas que a pessoa conduz à mão. As outras nascem de atividade registrada. */
export function isManualStage(stage: string): stage is ProspectStage {
  return PROSPECT_MANUAL_STAGES.includes(stage as ProspectStage);
}

export function discardUpdate(reason: string, agora = new Date()) {
  const quando = agora.toISOString();
  return {
    stage: 'descartado' as const,
    discard_reason: reason,
    discarded_at: quando,
    closed_at: quando,
    next_activity_on: null,
  };
}

export function reopenUpdate(hoje = new Date()) {
  return {
    stage: 'a_abordar' as const,
    discard_reason: null,
    discarded_at: null,
    closed_at: null,
    next_activity_on: toISODate(hoje),
  };
}
