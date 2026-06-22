import { describe, it, expect } from 'vitest';
import {
  calculateTurnover,
  type TurnoverEmployeeInput,
  type TurnoverTerminationInput,
} from '@/lib/turnoverCalculator';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emp(id: string, dataAdmissao: string | null): TurnoverEmployeeInput {
  return { id, dataAdmissao };
}

function term(
  employeeId: string,
  terminationDate: string,
  terminationType = 'voluntary',
  status = 'completed',
): TurnoverTerminationInput {
  return { employeeId, terminationDate, terminationType, status };
}

const H1_2026 = { start: '2026-01-01', end: '2026-06-30' };
const MONTHS_H1 = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];

// ─── Testes ─────────────────────────────────────────────────────────────────

describe('calculateTurnover', () => {
  it('retorna turnoverRate null e zeros quando não há dados', () => {
    const r = calculateTurnover([], [], H1_2026, MONTHS_H1);
    expect(r.turnoverRate).toBeNull();
    expect(r.avgHeadcount).toBe(0);
    expect(r.admissions).toBe(0);
    expect(r.terminations).toBe(0);
    expect(r.byMonth).toHaveLength(6);
  });

  it('aplica a fórmula SHRM corretamente (caso de referência)', () => {
    // 10 ativos antes do período (admitidos em 2025), sem entradas/saídas extras
    // além de: 2 admissões e 4 desligamentos no período.
    const employees: TurnoverEmployeeInput[] = [
      // 10 veteranos admitidos antes do período
      ...Array.from({ length: 10 }, (_, i) => emp(`vet-${i}`, '2025-06-01')),
      // 2 admissões dentro do período
      emp('new-1', '2026-02-10'),
      emp('new-2', '2026-03-15'),
    ];
    // 4 desligamentos dentro do período (todos veteranos)
    const terminations: TurnoverTerminationInput[] = [
      term('vet-0', '2026-01-20'),
      term('vet-1', '2026-02-05'),
      term('vet-2', '2026-04-10'),
      term('vet-3', '2026-05-30'),
    ];

    const r = calculateTurnover(employees, terminations, H1_2026, MONTHS_H1);

    // Headcount início (2026-01-01): 10 veteranos ativos, nenhum desligado ainda
    expect(r.headcountStart).toBe(10);
    // Headcount fim (2026-06-30): 10 - 4 desligados + 2 admitidos = 8
    expect(r.headcountEnd).toBe(8);
    // Médio = (10 + 8) / 2 = 9
    expect(r.avgHeadcount).toBe(9);
    expect(r.admissions).toBe(2);
    expect(r.terminations).toBe(4);
    // SHRM: ((2 + 4) / 2) / 9 * 100 = 3 / 9 * 100 = 33.33...
    expect(r.turnoverRate).toBeCloseTo(33.333, 2);
  });

  it('ignora desligamentos cancelados no headcount e na contagem', () => {
    const employees = [emp('a', '2025-01-01'), emp('b', '2025-01-01')];
    const terminations = [
      term('a', '2026-03-01', 'voluntary', 'cancelled'),
      term('b', '2026-03-01', 'involuntary', 'completed'),
    ];
    const r = calculateTurnover(employees, terminations, H1_2026, MONTHS_H1);
    // 'a' continua ativo (cancelado), 'b' sai → fim = 1
    expect(r.headcountStart).toBe(2);
    expect(r.headcountEnd).toBe(1);
    expect(r.terminations).toBe(1);
    expect(r.byType).toEqual({ involuntary: 1 });
  });

  it('usa a data efetiva mais antiga quando há múltiplas rescisões', () => {
    const employees = [emp('a', '2025-01-01')];
    const terminations = [
      term('a', '2026-05-01', 'voluntary', 'in_progress'),
      term('a', '2026-02-01', 'voluntary', 'completed'),
    ];
    const r = calculateTurnover(employees, terminations, H1_2026, MONTHS_H1);
    // efetivo em 2026-02-01 → já fora no fim do período
    expect(r.headcountEnd).toBe(0);
    // mas conta como 1 desligamento no período (não duplica por employee? conta linhas)
    expect(r.terminations).toBe(2); // duas linhas efetivas dentro do período
  });

  it('não conta colaborador sem data de admissão no headcount', () => {
    const employees = [emp('a', null), emp('b', '2025-01-01')];
    const r = calculateTurnover(employees, [], H1_2026, MONTHS_H1);
    expect(r.headcountStart).toBe(1);
    expect(r.headcountEnd).toBe(1);
  });

  it('distribui admissões e desligamentos por mês', () => {
    const employees = [
      emp('vet', '2025-01-01'),
      emp('new', '2026-02-10'),
    ];
    const terminations = [term('vet', '2026-04-15', 'involuntary')];
    const r = calculateTurnover(employees, terminations, H1_2026, MONTHS_H1);

    const feb = r.byMonth.find((m) => m.month === '2026-02')!;
    const apr = r.byMonth.find((m) => m.month === '2026-04')!;
    expect(feb.admissions).toBe(1);
    expect(feb.terminations).toBe(0);
    expect(apr.admissions).toBe(0);
    expect(apr.terminations).toBe(1);
  });

  it('exclui eventos fora do período da contagem', () => {
    const employees = [emp('a', '2025-12-31'), emp('b', '2026-07-01')];
    const terminations = [term('a', '2026-07-15')]; // após o período
    const r = calculateTurnover(employees, terminations, H1_2026, MONTHS_H1);
    expect(r.admissions).toBe(0); // 'b' admitido após o fim
    expect(r.terminations).toBe(0); // desligamento após o fim
  });

  it('agrupa desligamentos do período por tipo', () => {
    const employees = [emp('a', '2025-01-01'), emp('b', '2025-01-01'), emp('c', '2025-01-01')];
    const terminations = [
      term('a', '2026-02-01', 'voluntary'),
      term('b', '2026-03-01', 'voluntary'),
      term('c', '2026-04-01', 'involuntary'),
    ];
    const r = calculateTurnover(employees, terminations, H1_2026, MONTHS_H1);
    expect(r.byType).toEqual({ voluntary: 2, involuntary: 1 });
  });
});
