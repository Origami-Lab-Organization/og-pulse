// Fonte ÚNICA das faixas de utilização (planejado ÷ capacidade) da tela de
// Alocação. Qualquer tela que classifique carga de um colaborador por mês deve
// consumir daqui — não duplicar limiares. Ref: design_handoff_alocacao/README.md §4/§9.

export type UtilizationStatus = 'subalocado' | 'saudavel' | 'cheio' | 'sobrecarga';

/**
 * Limiares em % de capacidade (ponto único de verdade):
 *  - < 70%        → subalocado
 *  - 70% a 90%    → saudavel
 *  - > 90% a 105% → cheio
 *  - > 105%       → sobrecarga
 */
export const UTILIZATION_BANDS = {
  saudavel: 70,
  cheio: 90,
  sobrecarga: 105,
} as const;

export interface UtilizationResult {
  status: UtilizationStatus;
  /** planejado ÷ capacidade × 100 (0 quando não há capacidade e nada planejado). */
  percent: number;
  /** capacidade − planejado (negativo = estouro). */
  freeHours: number;
}

export function getUtilizationStatus(plannedHours: number, capacityHours: number): UtilizationResult {
  const freeHours = capacityHours - plannedHours;

  // Sem capacidade cadastrada: 0% se nada planejado; senão trata como sobrecarga
  // (carga sem lastro de capacidade) sem propagar Infinity para a UI.
  if (capacityHours <= 0) {
    return plannedHours > 0
      ? { status: 'sobrecarga', percent: 100, freeHours }
      : { status: 'subalocado', percent: 0, freeHours };
  }

  const percent = (plannedHours / capacityHours) * 100;
  let status: UtilizationStatus;
  if (percent < UTILIZATION_BANDS.saudavel) status = 'subalocado';
  else if (percent <= UTILIZATION_BANDS.cheio) status = 'saudavel';
  else if (percent <= UTILIZATION_BANDS.sobrecarga) status = 'cheio';
  else status = 'sobrecarga';

  return { status, percent, freeHours };
}

/**
 * Apresentação por status, usando tokens semânticos do tema (sem hex avulso).
 * `subalocado` mapeia para `info` (azul do tema) — decisão de produto: o
 * petróleo do handoff não vira token novo.
 */
export const UTILIZATION_META: Record<
  UtilizationStatus,
  { label: string; text: string; bg: string; border: string; dot: string; rail: string }
> = {
  subalocado: { label: 'Subalocado', text: 'text-info', bg: 'bg-info/10', border: 'border-info/30', dot: 'bg-info', rail: 'border-l-info' },
  saudavel: { label: 'Saudável', text: 'text-primary-deep', bg: 'bg-primary-deep/10', border: 'border-primary-deep/30', dot: 'bg-primary-deep', rail: 'border-l-primary-deep' },
  cheio: { label: 'Cheio', text: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', dot: 'bg-warning', rail: 'border-l-warning' },
  sobrecarga: { label: 'Sobrecarga', text: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30', dot: 'bg-destructive', rail: 'border-l-destructive' },
};

// Ordem de exibição dos grupos por utilização: ação necessária primeiro — os
// dois desperdícios (sobrecarga e subalocação) antes das faixas OK.
export const UTILIZATION_GROUP_ORDER: UtilizationStatus[] = ['sobrecarga', 'subalocado', 'cheio', 'saudavel'];
