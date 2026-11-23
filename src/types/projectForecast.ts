/** Custo final estimado do projeto (US-0031, `src/lib/projectForecast.ts`). */
export interface ProjectForecast {
  /** Custo já realizado (todas as datas, inclusive fora do período). */
  spent: number;
  /** O que ainda falta: resto do planejado do mês atual + planejado dos meses seguintes. */
  remaining: number;
  /** spent + remaining. */
  forecastCost: number;
  /** (contrato − comissão planejada − custo final) ÷ contrato, em %. */
  forecastMargin: number;
  /** A data de fim já passou: o planejado não lançado não conta mais. */
  projectEnded: boolean;
}

/** Parcela, no que a curva precisa. */
export interface ForecastInstallment {
  due_date: string;
  value: number;
  status: string;
}

/**
 * Faixa do forecast em relação à meta (US-0032): na meta ou acima; até 10% da meta abaixo
 * dela (amarelo); mais de 10% abaixo (vermelho); sem meta ou sem custo planejado (neutro).
 */
export type ForecastTone = 'ok' | 'warning' | 'critical' | 'neutral';
