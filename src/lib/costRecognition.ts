/**
 * Reconhecimento temporal de custos de projeto no dashboard/analytics.
 *
 * Regra de negócio (decisão confirmada com o time):
 *   - Custo REALIZADO é reconhecido pela DATA REAL em que foi realizado
 *     (purchase_date do material, invoice_date do fornecedor). É o que faz um
 *     custo lançado hoje aparecer no mês atual do dashboard.
 *   - Sem data real (ex.: custo PLANEJADO, ou realizado sem data informada),
 *     cai para o mês relativo ao projeto: início do projeto + (month_number − 1).
 *
 * Retorna o índice do mês (0–11) DENTRO do ano-alvo, ou `null` quando a data
 * resolvida cai em outro ano (e portanto não entra naquele recorte anual).
 */
import { addMonths, parseISO, startOfMonth } from 'date-fns';

export interface CostMonthParams {
  /** Data real do custo (purchase_date / invoice_date). Tem prioridade quando presente. */
  realDate?: string | null;
  /** Data de início do projeto (ISO). Base do mês relativo. */
  projectStartDate: string;
  /** Mês do projeto (1-based) — usado quando não há data real. */
  monthNumber: number;
  /** Ano do recorte (o hook monta 12 meses de um único ano). */
  targetYear: number;
}

export function resolveCostMonthIndex(params: CostMonthParams): number | null {
  const { realDate, projectStartDate, monthNumber, targetYear } = params;

  let date: Date;
  if (realDate) {
    date = parseISO(realDate);
  } else {
    const projStart = parseISO(projectStartDate);
    date = addMonths(startOfMonth(projStart), monthNumber - 1);
  }

  if (date.getFullYear() !== targetYear) return null;
  return date.getMonth();
}
