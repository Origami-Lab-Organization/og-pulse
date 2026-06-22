import { describe, expect, it } from 'vitest';
import {
  completedYearsSince,
  computeVacationBalance,
  computeBalanceFromRequests,
} from '@/lib/vacationBalanceCalculator';
import type { VacationRequestStatus } from '@/types/vacation';

const REF = '2026-06-19';

describe('completedYearsSince', () => {
  it('conta 1 ano completo no aniversário', () => {
    expect(completedYearsSince('2025-06-19', REF)).toBe(1);
  });

  it('conta 2 anos completos', () => {
    expect(completedYearsSince('2024-06-19', REF)).toBe(2);
  });

  it('não conta o ano se o aniversário ainda não chegou (1 dia antes)', () => {
    expect(completedYearsSince('2024-06-20', REF)).toBe(1);
  });

  it('retorna 0 para admissão no mesmo dia', () => {
    expect(completedYearsSince(REF, REF)).toBe(0);
  });

  it('retorna 0 para admissão no futuro', () => {
    expect(completedYearsSince('2027-01-01', REF)).toBe(0);
  });

  it('retorna 0 para data inválida', () => {
    expect(completedYearsSince('', REF)).toBe(0);
    expect(completedYearsSince('not-a-date', REF)).toBe(0);
  });
});

describe('computeVacationBalance', () => {
  it('1 ano sem uso = 30 dias disponíveis', () => {
    const b = computeVacationBalance({
      admissionDate: '2025-06-19',
      approvedDays: 0,
      pendingDays: 0,
      referenceDate: REF,
    });
    expect(b.earnedDays).toBe(30);
    expect(b.availableDays).toBe(30);
  });

  it('2 anos sem uso acumula 60 dias', () => {
    const b = computeVacationBalance({
      admissionDate: '2024-06-19',
      approvedDays: 0,
      pendingDays: 0,
      referenceDate: REF,
    });
    expect(b.earnedDays).toBe(60);
    expect(b.availableDays).toBe(60);
  });

  it('2 anos com 30 dias já gozados = 30 disponíveis (cenário do produto)', () => {
    const b = computeVacationBalance({
      admissionDate: '2024-06-19',
      approvedDays: 30,
      pendingDays: 0,
      referenceDate: REF,
    });
    expect(b.earnedDays).toBe(60);
    expect(b.usedDays).toBe(30);
    expect(b.availableDays).toBe(30);
  });

  it('reserva dias de pedidos pendentes', () => {
    const b = computeVacationBalance({
      admissionDate: '2024-06-19',
      approvedDays: 30,
      pendingDays: 10,
      referenceDate: REF,
    });
    expect(b.pendingDays).toBe(10);
    expect(b.availableDays).toBe(20);
  });

  it('nunca retorna saldo negativo', () => {
    const b = computeVacationBalance({
      admissionDate: '2025-06-19',
      approvedDays: 40,
      pendingDays: 0,
      referenceDate: REF,
    });
    expect(b.earnedDays).toBe(30);
    expect(b.availableDays).toBe(0);
  });

  it('sem aniversário completo não há saldo', () => {
    const b = computeVacationBalance({
      admissionDate: '2026-01-01',
      approvedDays: 0,
      pendingDays: 0,
      referenceDate: REF,
    });
    expect(b.earnedDays).toBe(0);
    expect(b.availableDays).toBe(0);
  });
});

describe('computeBalanceFromRequests', () => {
  const make = (status: VacationRequestStatus, days: number) => ({ status, days_requested: days });

  it('soma apenas approved (usado) e pending (reservado), ignorando rejected/cancelled', () => {
    const requests = [
      make('approved', 15),
      make('approved', 5),
      make('pending', 10),
      make('rejected', 30),
      make('cancelled', 30),
    ];
    const b = computeBalanceFromRequests('2024-06-19', requests, REF);
    expect(b.earnedDays).toBe(60);
    expect(b.usedDays).toBe(20);
    expect(b.pendingDays).toBe(10);
    expect(b.availableDays).toBe(30);
  });

  it('lista vazia = saldo total ganho', () => {
    const b = computeBalanceFromRequests('2025-06-19', [], REF);
    expect(b.availableDays).toBe(30);
  });
});
