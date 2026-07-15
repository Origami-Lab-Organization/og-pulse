import { describe, expect, it } from 'vitest';
import { getUtilizationStatus, UTILIZATION_BANDS } from '@/lib/utilization';

// Capacidade 100 → planejado == percentual, facilitando os limites exatos.
describe('getUtilizationStatus — faixas', () => {
  it('69.9% → subalocado', () => {
    expect(getUtilizationStatus(69.9, 100).status).toBe('subalocado');
  });

  it('70% (limite inferior) → saudavel', () => {
    expect(getUtilizationStatus(70, 100).status).toBe('saudavel');
  });

  it('90% (limite superior de saudável) → saudavel', () => {
    expect(getUtilizationStatus(90, 100).status).toBe('saudavel');
  });

  it('90.1% → cheio', () => {
    expect(getUtilizationStatus(90.1, 100).status).toBe('cheio');
  });

  it('105% (limite superior de cheio) → cheio', () => {
    expect(getUtilizationStatus(105, 100).status).toBe('cheio');
  });

  it('105.1% → sobrecarga', () => {
    expect(getUtilizationStatus(105.1, 100).status).toBe('sobrecarga');
  });

  it('percentual e freeHours calculados corretamente', () => {
    const r = getUtilizationStatus(80, 100);
    expect(r.percent).toBeCloseTo(80);
    expect(r.freeHours).toBe(20);
  });

  it('freeHours negativo quando planejado excede capacidade', () => {
    expect(getUtilizationStatus(120, 100).freeHours).toBe(-20);
  });
});

describe('getUtilizationStatus — capacidade 0', () => {
  it('capacidade 0 e nada planejado → subalocado, 0%', () => {
    const r = getUtilizationStatus(0, 0);
    expect(r.status).toBe('subalocado');
    expect(r.percent).toBe(0);
    expect(r.freeHours).toBe(0);
  });

  it('capacidade 0 com horas planejadas → sobrecarga (sem Infinity)', () => {
    const r = getUtilizationStatus(40, 0);
    expect(r.status).toBe('sobrecarga');
    expect(Number.isFinite(r.percent)).toBe(true);
    expect(r.freeHours).toBe(-40);
  });
});

describe('UTILIZATION_BANDS — fonte única', () => {
  it('expõe os limiares canônicos', () => {
    expect(UTILIZATION_BANDS).toEqual({ saudavel: 70, cheio: 90, sobrecarga: 105 });
  });
});
