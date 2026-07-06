import { describe, it, expect } from 'vitest';
import { resolveCostMonthIndex } from '@/lib/costRecognition';

describe('resolveCostMonthIndex', () => {
  const projectStartDate = '2026-01-15'; // projeto começa em janeiro/2026

  it('sem data real: usa o mês relativo ao projeto (início + month_number − 1)', () => {
    // month_number 1 → janeiro (índice 0)
    expect(
      resolveCostMonthIndex({ projectStartDate, monthNumber: 1, targetYear: 2026 }),
    ).toBe(0);
    // month_number 3 → março (índice 2)
    expect(
      resolveCostMonthIndex({ projectStartDate, monthNumber: 3, targetYear: 2026 }),
    ).toBe(2);
  });

  it('com data real: reconhece pelo mês da data real, ignorando o month_number', () => {
    // custo realizado em junho, mesmo sendo "mês 1" do projeto
    expect(
      resolveCostMonthIndex({
        realDate: '2026-06-10',
        projectStartDate,
        monthNumber: 1,
        targetYear: 2026,
      }),
    ).toBe(5); // junho
  });

  it('retorna null quando a data real cai em outro ano', () => {
    expect(
      resolveCostMonthIndex({
        realDate: '2025-12-20',
        projectStartDate,
        monthNumber: 1,
        targetYear: 2026,
      }),
    ).toBeNull();
  });

  it('retorna null quando o mês relativo ao projeto cai em outro ano', () => {
    // início jan/2026, month_number 13 → fev/2027
    expect(
      resolveCostMonthIndex({ projectStartDate, monthNumber: 13, targetYear: 2026 }),
    ).toBeNull();
  });

  it('realDate vazio/nulo é tratado como ausente (cai no mês relativo)', () => {
    expect(
      resolveCostMonthIndex({ realDate: null, projectStartDate, monthNumber: 2, targetYear: 2026 }),
    ).toBe(1); // fevereiro
    expect(
      resolveCostMonthIndex({ realDate: '', projectStartDate, monthNumber: 2, targetYear: 2026 }),
    ).toBe(1);
  });

  it('mês relativo cruza o fim do ano corretamente', () => {
    // início nov/2026 (month 1 = nov), month_number 2 → dez/2026 (índice 11)
    expect(
      resolveCostMonthIndex({ projectStartDate: '2026-11-01', monthNumber: 2, targetYear: 2026 }),
    ).toBe(11);
    // month_number 3 → jan/2027 → null no recorte de 2026
    expect(
      resolveCostMonthIndex({ projectStartDate: '2026-11-01', monthNumber: 3, targetYear: 2026 }),
    ).toBeNull();
  });
});
