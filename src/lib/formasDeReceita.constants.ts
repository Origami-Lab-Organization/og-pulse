import type { FormaAntiga, FormaDeReceita, FormaQualquer } from '@/types/serviceRevenueModel';

/** Formas de receita do catálogo 2027 (US-0046, decisões de 24 e 25/11/2026). */
export const FORMA_DE_RECEITA = {
  ESCOPO_FIXO: 'fixed',
  PERCENTUAL: 'success_fee',
  POR_HORA: 'hourly',
  INDICACAO: 'indication',
  CORTESIA: 'courtesy',
} as const satisfies Record<string, FormaDeReceita>;

/** Não são mais vendidas; ficam só nos modelos de receita antigos, para não perder o rastro. */
export const FORMA_ANTIGA = {
  RECORRENTE: 'recurring',
  EQUITY: 'equity',
} as const satisfies Record<string, FormaAntiga>;

/** Ordem de exibição das formas vendidas, no seletor e nos rótulos do modelo de receita. */
export const FORMAS_VENDIDAS: readonly FormaDeReceita[] = [
  FORMA_DE_RECEITA.ESCOPO_FIXO,
  FORMA_DE_RECEITA.PERCENTUAL,
  FORMA_DE_RECEITA.POR_HORA,
  FORMA_DE_RECEITA.INDICACAO,
  FORMA_DE_RECEITA.CORTESIA,
];

export const FORMAS_ANTIGAS: readonly FormaAntiga[] = [FORMA_ANTIGA.RECORRENTE, FORMA_ANTIGA.EQUITY];

export const ROTULO_DA_FORMA: Record<FormaQualquer, string> = {
  fixed: 'Escopo fixo',
  success_fee: 'Percentual',
  hourly: 'Cobrança por hora',
  indication: 'Comissão por indicação',
  courtesy: 'Cortesia',
  recurring: 'Recorrente',
  equity: 'Equity',
};

/** Separador das formas no rótulo do modelo de receita: "Escopo fixo + Percentual". */
export const SEPARADOR_DAS_FORMAS = ' + ';

/** `model_type` gravado pelo banco quando o modelo de receita tem mais de uma forma. */
export const MODEL_TYPE_DA_COMPOSICAO = 'composicao';
