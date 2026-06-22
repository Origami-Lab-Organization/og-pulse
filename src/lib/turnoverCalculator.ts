/**
 * Cálculo de Turnover (rotatividade) da empresa.
 *
 * Fórmula adotada (decisão de negócio — ver .harness/domain-glossary.md):
 *
 *   Turnover % = ((Admissões + Desligamentos) / 2) ÷ Headcount médio × 100   (SHRM)
 *   Headcount médio = (Headcount no início + Headcount no fim) ÷ 2
 *
 * O headcount em uma data D é reconstruído pelas datas (não pelo status atual),
 * para refletir o quadro histórico do período:
 *   - admitido em D ou antes (data_admissao <= D), E
 *   - sem desligamento efetivo até D (nenhuma rescisão não-cancelada com
 *     termination_date <= D).
 *
 * Toda comparação usa datas no formato 'YYYY-MM-DD', que ordena
 * lexicograficamente igual à ordem cronológica — evitando fuso horário.
 *
 * Retorna `turnoverRate = null` quando não há headcount médio (sem dados),
 * para que a UI mostre estado vazio em vez de "0%" como se fosse real (HU-002).
 */

export interface TurnoverEmployeeInput {
  id: string;
  /** Data de admissão no formato 'YYYY-MM-DD'. */
  dataAdmissao: string | null;
}

export interface TurnoverTerminationInput {
  employeeId: string;
  /** Data efetiva do desligamento no formato 'YYYY-MM-DD'. */
  terminationDate: string;
  terminationType: string;
  /** Status do processo; 'cancelled' é ignorado no cálculo. */
  status: string;
}

export interface TurnoverPeriod {
  /** Início inclusivo no formato 'YYYY-MM-DD'. */
  start: string;
  /** Fim inclusivo no formato 'YYYY-MM-DD'. */
  end: string;
}

export interface TurnoverMonthPoint {
  /** Mês no formato 'YYYY-MM'. */
  month: string;
  admissions: number;
  terminations: number;
}

export interface TurnoverResult {
  /** Taxa SHRM em %, ou null quando não há headcount médio. */
  turnoverRate: number | null;
  admissions: number;
  terminations: number;
  headcountStart: number;
  headcountEnd: number;
  avgHeadcount: number;
  /** Desligamentos do período agrupados por termination_type. */
  byType: Record<string, number>;
  byMonth: TurnoverMonthPoint[];
}

/** Considera apenas desligamentos efetivos (descarta cancelados). */
function isEffective(t: TurnoverTerminationInput): boolean {
  return t.status !== 'cancelled';
}

/** Mapa employeeId → data efetiva de desligamento mais antiga ('YYYY-MM-DD'). */
function buildEffectiveTermDates(
  terminations: TurnoverTerminationInput[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const t of terminations) {
    if (!isEffective(t) || !t.terminationDate) continue;
    const current = map.get(t.employeeId);
    if (!current || t.terminationDate < current) {
      map.set(t.employeeId, t.terminationDate);
    }
  }
  return map;
}

/** Headcount ativo na data `dateStr` ('YYYY-MM-DD'), reconstruído por datas. */
function countActiveAt(
  employees: TurnoverEmployeeInput[],
  termDates: Map<string, string>,
  dateStr: string,
): number {
  let count = 0;
  for (const e of employees) {
    if (!e.dataAdmissao || e.dataAdmissao > dateStr) continue;
    const term = termDates.get(e.id);
    if (term && term <= dateStr) continue;
    count += 1;
  }
  return count;
}

/** True se `dateStr` está dentro de [start, end] inclusivo. */
function inPeriod(dateStr: string, period: TurnoverPeriod): boolean {
  return dateStr >= period.start && dateStr <= period.end;
}

export function calculateTurnover(
  employees: TurnoverEmployeeInput[],
  terminations: TurnoverTerminationInput[],
  period: TurnoverPeriod,
  /** Meses do período no formato 'YYYY-MM', em ordem cronológica. */
  months: string[],
): TurnoverResult {
  const termDates = buildEffectiveTermDates(terminations);

  const headcountStart = countActiveAt(employees, termDates, period.start);
  const headcountEnd = countActiveAt(employees, termDates, period.end);
  const avgHeadcount = (headcountStart + headcountEnd) / 2;

  const admittedInPeriod = employees.filter(
    (e) => e.dataAdmissao && inPeriod(e.dataAdmissao, period),
  );
  const terminatedInPeriod = terminations.filter(
    (t) => isEffective(t) && t.terminationDate && inPeriod(t.terminationDate, period),
  );

  const admissions = admittedInPeriod.length;
  const terminationsCount = terminatedInPeriod.length;

  const byType: Record<string, number> = {};
  for (const t of terminatedInPeriod) {
    byType[t.terminationType] = (byType[t.terminationType] || 0) + 1;
  }

  const admByMonth: Record<string, number> = {};
  for (const e of admittedInPeriod) {
    const m = e.dataAdmissao!.substring(0, 7);
    admByMonth[m] = (admByMonth[m] || 0) + 1;
  }
  const termByMonth: Record<string, number> = {};
  for (const t of terminatedInPeriod) {
    const m = t.terminationDate.substring(0, 7);
    termByMonth[m] = (termByMonth[m] || 0) + 1;
  }
  const byMonth: TurnoverMonthPoint[] = months.map((month) => ({
    month,
    admissions: admByMonth[month] || 0,
    terminations: termByMonth[month] || 0,
  }));

  const turnoverRate =
    avgHeadcount > 0
      ? ((admissions + terminationsCount) / 2 / avgHeadcount) * 100
      : null;

  return {
    turnoverRate,
    admissions,
    terminations: terminationsCount,
    headcountStart,
    headcountEnd,
    avgHeadcount,
    byType,
    byMonth,
  };
}
