import { describe, it, expect } from 'vitest';
import { computeAlerts } from '@/lib/strategyAlerts';
import { StrategyObjectiveWithKrs, StrategyCycle, StrategyKeyResult } from '@/types/strategy';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCheckin(confidence: number, daysAgo: number, now: number) {
  const createdAt = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: `checkin-${Math.random()}`,
    keyResultId: 'kr-1',
    tenantId: 'tenant-1',
    currentValue: 50,
    confidence,
    notes: null,
    createdBy: null,
    checkinDate: createdAt,
    createdAt,
  };
}

function makeKr(overrides: Partial<StrategyKeyResult> = {}): StrategyKeyResult {
  return {
    id: 'kr-1',
    tenantId: 'tenant-1',
    objectiveId: 'obj-1',
    title: 'KR de teste',
    description: null,
    initialValue: 0,
    targetValue: 100,
    currentValue: 50,
    confidence: 7,
    unit: null,
    direction: 'higher_is_better' as const,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    checkins: [],
    ...overrides,
  };
}

function makeObjective(krs: StrategyKeyResult[]): StrategyObjectiveWithKrs {
  const avgProgress =
    krs.length > 0
      ? Math.round(krs.reduce((s, kr) => s + (kr.targetValue > 0 ? (kr.currentValue / kr.targetValue) * 100 : 0), 0) / krs.length)
      : 0;
  const avgConfidence =
    krs.length > 0
      ? krs.reduce((s, kr) => s + kr.confidence, 0) / krs.length
      : 0;

  return {
    id: 'obj-1',
    tenantId: 'tenant-1',
    cycleId: 'cycle-1',
    title: 'Objetivo de teste',
    description: null,
    ownerId: null,
    ownerName: null,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    keyResults: krs,
    avgProgress,
    avgConfidence,
  };
}

function makeCycle(daysUntilEnd: number, now: number): StrategyCycle {
  const endDate = new Date(now + daysUntilEnd * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return {
    id: 'cycle-1',
    tenantId: 'tenant-1',
    title: 'Ciclo Q1',
    startDate: '2025-01-01',
    endDate,
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

const NOW = new Date('2025-03-01T12:00:00Z').getTime();

describe('computeAlerts — no objectives, no cycle', () => {
  it('returns empty array', () => {
    expect(computeAlerts([], null, NOW)).toEqual([]);
  });
});

describe('computeAlerts — cycle ending soon (INFO)', () => {
  it('fires info alert when cycle ends in < 45 days', () => {
    const cycle = makeCycle(30, NOW);
    const alerts = computeAlerts([], cycle, NOW);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('info');
    expect(alerts[0].id).toBe('cycle-ending');
    expect(alerts[0].message).toContain('30 dias');
  });

  it('fires info alert when cycle ends in exactly 44 days', () => {
    const cycle = makeCycle(44, NOW);
    const alerts = computeAlerts([], cycle, NOW);
    expect(alerts.some((a) => a.id === 'cycle-ending')).toBe(true);
  });

  it('does NOT fire when cycle ends in 45+ days', () => {
    const cycle = makeCycle(45, NOW);
    const alerts = computeAlerts([], cycle, NOW);
    expect(alerts.some((a) => a.id === 'cycle-ending')).toBe(false);
  });

  it('does NOT fire when cycle already ended', () => {
    const cycle = makeCycle(-1, NOW);
    const alerts = computeAlerts([], cycle, NOW);
    expect(alerts.some((a) => a.id === 'cycle-ending')).toBe(false);
  });

  it('does NOT fire with null cycle', () => {
    const alerts = computeAlerts([], null, NOW);
    expect(alerts.some((a) => a.id === 'cycle-ending')).toBe(false);
  });
});

describe('computeAlerts — KR success', () => {
  it('fires success alert when progress >= 100%', () => {
    const kr = makeKr({ id: 'kr-done', title: 'KR Completo', currentValue: 100, targetValue: 100 });
    const alerts = computeAlerts([makeObjective([kr])], null, NOW);
    expect(alerts.some((a) => a.id === 'kr-success-kr-done')).toBe(true);
    expect(alerts.find((a) => a.id === 'kr-success-kr-done')?.severity).toBe('success');
  });

  it('fires success alert when confidence = 10', () => {
    const kr = makeKr({ id: 'kr-conf10', title: 'KR Max Conf', confidence: 10, currentValue: 50, targetValue: 100 });
    const alerts = computeAlerts([makeObjective([kr])], null, NOW);
    expect(alerts.some((a) => a.id === 'kr-success-kr-conf10')).toBe(true);
  });

  it('does NOT fire warning/danger for KR that already hit success', () => {
    const kr = makeKr({
      id: 'kr-done',
      title: 'KR Done',
      currentValue: 100,
      targetValue: 100,
      checkins: [], // no checkins — would normally trigger warning
    });
    const alerts = computeAlerts([makeObjective([kr])], null, NOW);
    const ids = alerts.map((a) => a.id);
    expect(ids).not.toContain('kr-no-checkin-kr-done');
    expect(ids).not.toContain('kr-stale-kr-done');
    expect(ids).not.toContain('kr-declining-kr-done');
    expect(ids).toContain('kr-success-kr-done');
  });
});

describe('computeAlerts — KR no check-in (WARNING)', () => {
  it('fires warning when KR has never been checked in', () => {
    const kr = makeKr({ id: 'kr-new', title: 'KR Novo', checkins: [] });
    const alerts = computeAlerts([makeObjective([kr])], null, NOW);
    expect(alerts.some((a) => a.id === 'kr-no-checkin-kr-new')).toBe(true);
    expect(alerts.find((a) => a.id === 'kr-no-checkin-kr-new')?.severity).toBe('warning');
  });

  it('fires stale warning when last checkin is > 28 days ago', () => {
    const kr = makeKr({
      id: 'kr-stale',
      title: 'KR Stale',
      checkins: [makeCheckin(7, 30, NOW)], // 30 days ago
    });
    const alerts = computeAlerts([makeObjective([kr])], null, NOW);
    expect(alerts.some((a) => a.id === 'kr-stale-kr-stale')).toBe(true);
    expect(alerts.find((a) => a.id === 'kr-stale-kr-stale')?.severity).toBe('warning');
  });

  it('does NOT fire stale warning when last checkin is <= 28 days ago', () => {
    const kr = makeKr({
      id: 'kr-recent',
      title: 'KR Recent',
      checkins: [makeCheckin(7, 10, NOW)], // 10 days ago
    });
    const alerts = computeAlerts([makeObjective([kr])], null, NOW);
    expect(alerts.some((a) => a.id === 'kr-stale-kr-recent')).toBe(false);
  });

  it('does NOT fire stale warning when last checkin is exactly 28 days ago', () => {
    const kr = makeKr({
      id: 'kr-edge',
      title: 'KR Edge',
      checkins: [makeCheckin(7, 28, NOW)],
    });
    const alerts = computeAlerts([makeObjective([kr])], null, NOW);
    expect(alerts.some((a) => a.id === 'kr-stale-kr-edge')).toBe(false);
  });
});

describe('computeAlerts — KR declining confidence (DANGER)', () => {
  it('fires danger when confidence decreased between last 2 checkins', () => {
    const kr = makeKr({
      id: 'kr-decline',
      title: 'KR Declining',
      checkins: [
        makeCheckin(5, 5, NOW),  // latest: confidence 5
        makeCheckin(8, 10, NOW), // prev: confidence 8
      ],
    });
    const alerts = computeAlerts([makeObjective([kr])], null, NOW);
    expect(alerts.some((a) => a.id === 'kr-declining-kr-decline')).toBe(true);
    expect(alerts.find((a) => a.id === 'kr-declining-kr-decline')?.severity).toBe('danger');
  });

  it('does NOT fire danger when confidence is stable', () => {
    const kr = makeKr({
      id: 'kr-stable',
      title: 'KR Stable',
      checkins: [
        makeCheckin(7, 5, NOW),
        makeCheckin(7, 10, NOW),
      ],
    });
    const alerts = computeAlerts([makeObjective([kr])], null, NOW);
    expect(alerts.some((a) => a.id === 'kr-declining-kr-stable')).toBe(false);
  });

  it('does NOT fire danger when confidence increased', () => {
    const kr = makeKr({
      id: 'kr-improve',
      title: 'KR Improving',
      checkins: [
        makeCheckin(8, 5, NOW),  // latest: higher
        makeCheckin(5, 10, NOW), // prev: lower
      ],
    });
    const alerts = computeAlerts([makeObjective([kr])], null, NOW);
    expect(alerts.some((a) => a.id === 'kr-declining-kr-improve')).toBe(false);
  });

  it('does NOT fire danger with only 1 checkin', () => {
    const kr = makeKr({
      id: 'kr-one',
      title: 'KR One',
      checkins: [makeCheckin(5, 5, NOW)],
    });
    const alerts = computeAlerts([makeObjective([kr])], null, NOW);
    expect(alerts.some((a) => a.id === 'kr-declining-kr-one')).toBe(false);
  });
});

describe('computeAlerts — sorting order', () => {
  it('sorts danger before warning before info before success', () => {
    const krDecline = makeKr({
      id: 'kr-d',
      title: 'Declining KR',
      checkins: [makeCheckin(4, 5, NOW), makeCheckin(8, 10, NOW)],
    });
    const krNoCheckin = makeKr({ id: 'kr-w', title: 'No Checkin KR', checkins: [] });
    const krDone = makeKr({ id: 'kr-s', title: 'Done KR', currentValue: 100, targetValue: 100 });
    const cycle = makeCycle(20, NOW);

    const alerts = computeAlerts(
      [makeObjective([krDecline, krNoCheckin, krDone])],
      cycle,
      NOW,
    );

    const severities = alerts.map((a) => a.severity);
    const dangerIdx = severities.indexOf('danger');
    const warningIdx = severities.indexOf('warning');
    const infoIdx = severities.indexOf('info');
    const successIdx = severities.indexOf('success');

    expect(dangerIdx).toBeLessThan(warningIdx);
    expect(warningIdx).toBeLessThan(infoIdx);
    expect(infoIdx).toBeLessThan(successIdx);
  });
});

describe('computeAlerts — multiple objectives and KRs', () => {
  it('processes all KRs across multiple objectives', () => {
    const kr1 = makeKr({ id: 'kr-1', title: 'KR 1', checkins: [] });
    const kr2 = makeKr({ id: 'kr-2', title: 'KR 2', checkins: [] });
    const obj1 = { ...makeObjective([kr1]), id: 'obj-1' };
    const obj2 = { ...makeObjective([kr2]), id: 'obj-2', keyResults: [{ ...kr2, objectiveId: 'obj-2' }] };

    const alerts = computeAlerts([obj1, obj2], null, NOW);
    expect(alerts.filter((a) => a.severity === 'warning')).toHaveLength(2);
  });
});
