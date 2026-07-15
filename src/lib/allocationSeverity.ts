import { eachDayOfInterval, isWeekend, parseISO } from 'date-fns';
import { AllocationCell, AllocationMonth, AllocationPerson } from '@/types/allocation';
import { getUtilizationStatus, UtilizationStatus } from '@/lib/utilization';

// Dias úteis (seg–sex) num intervalo inclusivo. Feriados são fast-follow
// (spec §4) — o pró-rata usa dias de semana puros.
function weekdaysBetween(start: Date, end: Date): number {
  if (end < start) return 0;
  return eachDayOfInterval({ start, end }).filter((day) => !isWeekend(day)).length;
}

/**
 * Fração pró-rata do mês vigente: dias úteis decorridos (até hoje, inclusive)
 * ÷ dias úteis do mês. Retorna 0 para meses futuros e 1 para meses passados.
 */
export function proRataFraction(month: AllocationMonth, today = new Date()): number {
  const start = parseISO(month.startDate);
  const end = parseISO(month.endDate);
  if (today < start) return 0;
  if (today > end) return 1;
  const total = weekdaysBetween(start, end);
  if (total === 0) return 1;
  const elapsed = weekdaysBetween(start, today);
  return Math.min(1, elapsed / total);
}

export type RhythmState = 'em_dia' | 'atrasado' | 'sem_lancamento';

export interface Rhythm {
  state: RhythmState;
  /** realizado − planejado pró-rata (horas). Negativo = faltam horas a lançar. */
  deviationHours: number;
  expectedHours: number;
}

const RHYTHM_TOLERANCE = 4;

/**
 * Ritmo de lançamento no mês vigente: compara o realizado com o planejado
 * esperado até hoje (plano × fração pró-rata). Tolerância de 4h.
 * NOTA: ritmo é atributo SECUNDÁRIO da linha — nunca agrupa nem ordena.
 */
export function getRhythm(realizedHours: number, plannedHours: number, fraction: number): Rhythm {
  const expectedHours = plannedHours * fraction;
  const deviationHours = realizedHours - expectedHours;
  let state: RhythmState;
  if (realizedHours <= 0 && expectedHours > 0) state = 'sem_lancamento';
  else if (deviationHours < -RHYTHM_TOLERANCE) state = 'atrasado';
  else state = 'em_dia';
  return { state, deviationHours, expectedHours };
}

/**
 * Rótulo do ritmo em linguagem do produto (o verbo do Pulse é "lançar horas").
 * Proibido usar "atrás do ritmo". Estados: em dia / lançamento atrasado / sem lançamento.
 */
export function rhythmLabel(rhythm: Rhythm): string {
  if (rhythm.state === 'sem_lancamento') return 'Sem lançamento';
  if (rhythm.state === 'atrasado') return `Lançamento atrasado · faltam ${Math.round(Math.abs(rhythm.deviationHours))}h`;
  return 'em dia';
}

// ─── Agrupamento por utilização (único eixo estrutural) ────────────────────────

/** Status de utilização de uma célula (planejado ÷ capacidade). */
export function cellUtilization(cell: AllocationCell): UtilizationStatus {
  return getUtilizationStatus(Number(cell.plannedHours || 0), Number(cell.capacityHours || 0)).status;
}

/**
 * Comparador de ordenação para a lista/grupo, seguindo a spec §6.4: dentro de
 * cada grupo, distância da zona saudável (maior % primeiro em sobrecarga/cheio;
 * menor % primeiro em subalocado), depois alfabética. Entre grupos, a ordem de
 * UTILIZATION_GROUP_ORDER.
 */
export function compareByUtilization(
  a: AllocationPerson,
  b: AllocationPerson,
  referenceMonth: AllocationMonth,
  groupRank: (status: UtilizationStatus) => number,
): number {
  const cellA = a.cells[referenceMonth.key];
  const cellB = b.cells[referenceMonth.key];
  const statusA = cellA ? cellUtilization(cellA) : 'saudavel';
  const statusB = cellB ? cellUtilization(cellB) : 'saudavel';
  const rankDiff = groupRank(statusA) - groupRank(statusB);
  if (rankDiff !== 0) return rankDiff;

  const pctA = getUtilizationStatus(Number(cellA?.plannedHours || 0), Number(cellA?.capacityHours || 0)).percent;
  const pctB = getUtilizationStatus(Number(cellB?.plannedHours || 0), Number(cellB?.capacityHours || 0)).percent;
  // subalocado: menor % primeiro; demais: maior % primeiro.
  const dir = statusA === 'subalocado' ? 1 : -1;
  if (pctA !== pctB) return (pctA - pctB) * dir;
  return a.name.localeCompare(b.name, 'pt-BR');
}
