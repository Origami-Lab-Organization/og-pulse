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
