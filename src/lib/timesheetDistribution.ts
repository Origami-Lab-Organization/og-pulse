/**
 * Distribui `total` (inteiro) entre os pesos informados usando o método do
 * maior resto (Hamilton), garantindo que a soma das parcelas inteiras seja
 * exatamente `total` — nunca gera fração.
 */
export function distributeLargestRemainder(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  if (total <= 0) return weights.map(() => 0);

  const sumWeights = weights.reduce((a, b) => a + b, 0);
  if (sumWeights <= 0) return weights.map(() => 0);

  const raw = weights.map((w) => (total * w) / sumWeights);
  const floors = raw.map(Math.floor);
  const allocated = floors.reduce((a, b) => a + b, 0);
  const remainder = total - allocated;

  const order = raw
    .map((r, i) => ({ i, frac: r - floors[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const result = [...floors];
  for (let k = 0; k < remainder; k++) {
    result[order[k].i] += 1;
  }
  return result;
}

/** Linha planejada para o cálculo adaptativo de um dia. */
export interface AdaptiveRow {
  rowId: string;
  /** Peso do planejamento (horas/dia da alocação) daquele dia. 0 = sem plano. */
  weight: number;
  /** True quando a célula já tem valor REAL nesse dia (entry salvo ou edição, inclusive 0). */
  hasReal: boolean;
}

/**
 * Sugestão adaptativa para um dia: distribui o que falta para fechar a jornada
 * entre as linhas PLANEJADAS que ainda estão vazias, proporcionalmente ao peso
 * (alocação planejada), sempre em horas inteiras (maior resto).
 *
 * `enteredTotal` é a soma dos valores REAIS já lançados no dia (projetos +
 * atividades, incluindo zeros reais) — calculada pelo chamador.
 */
export function computeAdaptiveHints(
  rows: AdaptiveRow[],
  enteredTotal: number,
  journeyHours: number
): Record<string, number> {
  const emptyPlanned = rows.filter((r) => r.weight > 0 && !r.hasReal);
  const remaining = journeyHours - enteredTotal;
  if (remaining <= 0 || emptyPlanned.length === 0) return {};

  const dist = distributeLargestRemainder(
    remaining,
    emptyPlanned.map((r) => r.weight)
  );

  const hints: Record<string, number> = {};
  emptyPlanned.forEach((r, i) => {
    hints[r.rowId] = dist[i];
  });
  return hints;
}

