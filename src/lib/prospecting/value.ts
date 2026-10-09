import type { ProspectStage } from '@/types/prospect';

const ETAPA_GANHO: ProspectStage = 'ganho';

interface ProspectForValue {
  stage?: string;
  estimated_value: number | null;
  won_value?: number | null;
  budget?: { final_total: number } | null;
}

/**
 * Valor de um contato da Prospecção — fonte única de verdade (ADR-0017, que desde
 * 29/09/2026 vale para o contato, herdeiro da Oportunidade).
 *
 * Ganho com valor registrado → orçamento vinculado com total fechado → valor estimado
 * informado no contato → 0. O valor vendido vence porque é fato; os outros dois são
 * previsão.
 */
export function resolveProspectValue(prospect: ProspectForValue): number {
  if (prospect.stage === ETAPA_GANHO && prospect.won_value != null) {
    return prospect.won_value;
  }
  if (prospect.budget?.final_total && prospect.budget.final_total > 0) {
    return prospect.budget.final_total;
  }
  return prospect.estimated_value || 0;
}

/** De onde veio o valor exibido — quem lê "R$ 48 mil" precisa saber se é fato ou previsão. */
export type ProspectValueSource = 'vendido' | 'orcamento' | 'estimado';

/** A mesma ordem de `resolveProspectValue`, dita em vez de calculada. */
export function prospectValueSource(prospect: ProspectForValue): ProspectValueSource {
  if (prospect.stage === ETAPA_GANHO && prospect.won_value != null) return 'vendido';
  if (prospect.budget?.final_total && prospect.budget.final_total > 0) return 'orcamento';
  return 'estimado';
}
