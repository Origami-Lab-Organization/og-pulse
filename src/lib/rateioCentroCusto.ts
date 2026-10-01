import { truncateToCents } from '@/lib/formatters';
import { AllocationLineKind } from '@/types/rateio';
import type { AllocationItem, AllocationLine, CenterGroup, CenterHours, PersonAllocation, PersonHours, PersonLotacao } from '@/types/rateio';
import type { CostInputs } from '@/services/costCenterCostService';

/**
 * Rateio do custo de cada pessoa pelos centros de custo, no mês (decisão do Italo, 01/10/2026):
 * cada centro recebe o Total Mensal × (horas lançadas no centro ÷ jornada do mês). A jornada é a
 * coluna "Horas no Mês" da própria Custo x Hora — o divisor do custo-hora da tela —, então o
 * valor de cada centro é exatamente horas × custo-hora. O que a pessoa não lançou vira a linha
 * "Não lançado" e não vai para centro nenhum (PUL-182): mandá-lo para um centro automático
 * esconderia o problema. Quem não lança hora vai 100% para o centro de lotação (ADR-0031).
 * Valores truncados no centavo (ADR-0011); o centavo que sobra da truncagem fica no "Não
 * lançado" ou, sem ele, na maior linha — a soma sempre fecha com o Total Mensal.
 */

export const NO_CENTER_KEY = '__sem_centro__';
const NOT_LOGGED_KEY = '__nao_lancado__';

function addHours(map: Map<string, PersonHours>, employeeId: string, centerId: string | null, item: AllocationItem): void {
  const person = map.get(employeeId) ?? { total: 0, byCenter: new Map<string, CenterHours>() };
  const key = centerId ?? NO_CENTER_KEY;
  const center = person.byCenter.get(key) ?? { hours: 0, items: new Map<string, AllocationItem>() };
  const current = center.items.get(item.key);
  center.items.set(item.key, current ? { ...current, hours: current.hours + item.hours } : item);
  center.hours += item.hours;
  person.total += item.hours;
  person.byCenter.set(key, center);
  map.set(employeeId, person);
}

/** Horas do mês por pessoa e centro, com o centro gravado no lançamento (PUL-246). */
export function collectHours(inputs: CostInputs): Map<string, PersonHours> {
  const memberToEmployee = new Map(inputs.members.map((m) => [m.id, m.employee_id]));
  const projectName = new Map(inputs.projects.map((p) => [p.id, p.name]));
  const activityName = new Map(inputs.activities.map((a) => [a.id, a.name]));
  const map = new Map<string, PersonHours>();
  for (const h of inputs.projectHours) {
    const employeeId = h.project_member_id ? memberToEmployee.get(h.project_member_id) : null;
    if (!employeeId || !h.hours) continue;
    addHours(map, employeeId, h.cost_center_id, { key: `p:${h.project_id}`, name: projectName.get(h.project_id) ?? 'Projeto', kind: 'projeto', hours: Number(h.hours) });
  }
  for (const h of inputs.activityHours) {
    if (!h.hours) continue;
    addHours(map, h.employee_id, h.cost_center_id, { key: `a:${h.activity_type_id}`, name: activityName.get(h.activity_type_id) ?? 'Atividade interna', kind: 'atividade', hours: Number(h.hours) });
  }
  return map;
}

interface AllocationRow {
  employeeId: string;
  nome: string;
  totalMonthlyCost: number;
  hoursWorked: number;
}

const byHoursDesc = (a: AllocationItem, b: AllocationItem) => b.hours - a.hours;

function lotacaoAllocation(row: AllocationRow, lotacao: PersonLotacao, centerNames: Map<string, string>): AllocationLine[] {
  const centerId = lotacao.costCenterId;
  return [{
    key: centerId ?? NO_CENTER_KEY,
    kind: centerId ? AllocationLineKind.Center : AllocationLineKind.NoCenter,
    centerId,
    label: centerId ? centerNames.get(centerId) ?? 'Centro de lotação' : 'Sem centro de lotação',
    hours: row.hoursWorked,
    share: 1,
    value: truncateToCents(row.totalMonthlyCost),
    items: [],
  }];
}

function centerLines(row: AllocationRow, hours: PersonHours, denominator: number, centerNames: Map<string, string>): AllocationLine[] {
  return [...hours.byCenter.entries()].map(([key, center]) => {
    const share = center.hours / denominator;
    const isCenter = key !== NO_CENTER_KEY;
    return {
      key,
      kind: isCenter ? AllocationLineKind.Center : AllocationLineKind.NoCenter,
      centerId: isCenter ? key : null,
      label: isCenter ? centerNames.get(key) ?? 'Centro removido' : 'Sem centro de custo',
      hours: center.hours,
      share,
      value: truncateToCents(row.totalMonthlyCost * share),
      items: [...center.items.values()].sort(byHoursDesc),
    };
  });
}

/** Fecha a soma no Total Mensal: o resto vai para o "Não lançado", ou para a maior linha. */
function closeTotal(row: AllocationRow, lines: AllocationLine[], notLoggedHours: number, denominator: number): AllocationLine[] {
  const total = truncateToCents(row.totalMonthlyCost);
  const residual = Math.round((total - lines.reduce((s, l) => s + l.value, 0)) * 100) / 100;
  if (notLoggedHours > 0) {
    return [...lines, { key: NOT_LOGGED_KEY, kind: AllocationLineKind.NotLogged, centerId: null, label: 'Não lançado', hours: notLoggedHours, share: notLoggedHours / denominator, value: residual, items: [] }];
  }
  if (lines.length === 0 || residual === 0) return lines;
  const largest = lines.reduce((a, b) => (b.value > a.value ? b : a));
  return lines.map((l) => (l === largest ? { ...l, value: Math.round((l.value + residual) * 100) / 100 } : l));
}

const LINE_ORDER: Record<AllocationLineKind, number> = {
  [AllocationLineKind.Center]: 0,
  [AllocationLineKind.NoCenter]: 1,
  [AllocationLineKind.NotLogged]: 2,
};

export function allocatePerson(
  row: AllocationRow,
  hours: PersonHours | undefined,
  lotacao: PersonLotacao | undefined,
  centerNames: Map<string, string>,
): PersonAllocation {
  const base = { employeeId: row.employeeId, nome: row.nome, total: truncateToCents(row.totalMonthlyCost), jornada: row.hoursWorked };
  if (lotacao && !lotacao.logsHours) {
    return { ...base, lancado: 0, logsHours: false, lines: lotacaoAllocation(row, lotacao, centerNames) };
  }
  const lancado = hours?.total ?? 0;
  // Quem lançou mais que a jornada não tem "não lançado": o divisor passa a ser o lançado.
  const denominator = Math.max(row.hoursWorked, lancado);
  const lines = hours && denominator > 0 ? centerLines(row, hours, denominator, centerNames) : [];
  const notLogged = denominator > 0 ? Math.max(0, denominator - lancado) : 0;
  const closed = denominator > 0 ? closeTotal(row, lines, notLogged, denominator) : closeTotal(row, [], 1, 1);
  const sorted = closed.sort((a, b) => LINE_ORDER[a.kind] - LINE_ORDER[b.kind] || b.value - a.value);
  return { ...base, lancado, logsHours: true, lines: sorted };
}

const brl = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

export const ALLOCATION_CSV_HEADERS = ['Pessoa', 'Centro de custo', 'Horas', 'Fatia (%)', 'Valor (R$)'];

/** Uma linha por pessoa × centro: o formato que se lança no Conta Azul. */
export function allocationCsvRows(allocations: readonly PersonAllocation[]): string[][] {
  return allocations.flatMap((a) => a.lines.map((l) => [a.nome, l.label, num(l.hours), num(Math.round(l.share * 1000) / 10), brl(l.value)]));
}

/** Visão por centro: o que o administrativo lança. Centros por valor; sem centro e não lançado no fim. */
export function groupByCenter(allocations: readonly PersonAllocation[]): CenterGroup[] {
  const groups = new Map<string, CenterGroup>();
  for (const a of allocations) {
    for (const l of a.lines) {
      const group = groups.get(l.key) ?? { key: l.key, label: l.label, kind: l.kind, hours: 0, value: 0, people: [] };
      group.hours += l.hours;
      group.value = Math.round((group.value + l.value) * 100) / 100;
      group.people.push({ employeeId: a.employeeId, nome: a.nome, hours: l.hours, value: l.value, shareOfPerson: l.share, byLotacao: !a.logsHours });
      groups.set(l.key, group);
    }
  }
  return [...groups.values()]
    .map((g) => ({ ...g, people: g.people.sort((x, y) => y.value - x.value) }))
    .sort((a, b) => LINE_ORDER[a.kind] - LINE_ORDER[b.kind] || b.value - a.value);
}

export function allocationTotals(allocations: readonly PersonAllocation[]): { total: number; notLogged: number } {
  let total = 0;
  let notLogged = 0;
  for (const a of allocations) {
    total += a.total;
    notLogged += a.lines.find((l) => l.kind === AllocationLineKind.NotLogged)?.value ?? 0;
  }
  return { total: Math.round(total * 100) / 100, notLogged: Math.round(notLogged * 100) / 100 };
}
