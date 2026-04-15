import { describe, it, expect } from 'vitest';
import {
  getKrStatus,
  getKrProgress,
  dbToStrategyCycle,
  dbToStrategyObjective,
  dbToStrategyKeyResult,
  dbToStrategyCheckin,
  dbToStrategyInitiative,
  StrategyCycleDB,
  StrategyObjectiveDB,
  StrategyKeyResultDB,
  StrategyCheckinDB,
  StrategyInitiativeDB,
} from '@/types/strategy';

// ─── getKrStatus ──────────────────────────────────────────────────────────────

describe('getKrStatus', () => {
  it('returns green for confidence >= 7', () => {
    expect(getKrStatus(7)).toBe('green');
    expect(getKrStatus(8)).toBe('green');
    expect(getKrStatus(10)).toBe('green');
  });

  it('returns amber for confidence 4–6', () => {
    expect(getKrStatus(4)).toBe('amber');
    expect(getKrStatus(5)).toBe('amber');
    expect(getKrStatus(6)).toBe('amber');
  });

  it('returns red for confidence < 4', () => {
    expect(getKrStatus(0)).toBe('red');
    expect(getKrStatus(1)).toBe('red');
    expect(getKrStatus(3)).toBe('red');
  });

  it('handles boundary values correctly', () => {
    expect(getKrStatus(3)).toBe('red');
    expect(getKrStatus(4)).toBe('amber');
    expect(getKrStatus(6)).toBe('amber');
    expect(getKrStatus(7)).toBe('green');
  });
});

// ─── getKrProgress ────────────────────────────────────────────────────────────

describe('getKrProgress', () => {
  it('returns 0 when target is 0', () => {
    expect(getKrProgress(50, 0)).toBe(0);
  });

  it('returns correct percentage', () => {
    expect(getKrProgress(50, 100)).toBe(50);
    expect(getKrProgress(1, 4)).toBe(25);
    expect(getKrProgress(3, 4)).toBe(75);
  });

  it('rounds to nearest integer', () => {
    expect(getKrProgress(1, 3)).toBe(33); // 33.33...
    expect(getKrProgress(2, 3)).toBe(67); // 66.66...
  });

  it('caps at 100 when current exceeds target', () => {
    expect(getKrProgress(150, 100)).toBe(100);
    expect(getKrProgress(200, 100)).toBe(100);
  });

  it('returns 0 when current is 0', () => {
    expect(getKrProgress(0, 100)).toBe(0);
  });

  it('returns 100 when current equals target', () => {
    expect(getKrProgress(100, 100)).toBe(100);
  });
});

// ─── dbToStrategyCycle ────────────────────────────────────────────────────────

describe('dbToStrategyCycle', () => {
  const db: StrategyCycleDB = {
    id: 'cycle-1',
    tenant_id: 'tenant-1',
    title: 'Q1 2025',
    start_date: '2025-01-01',
    end_date: '2025-03-31',
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  };

  it('maps all fields correctly', () => {
    const result = dbToStrategyCycle(db);
    expect(result.id).toBe('cycle-1');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.title).toBe('Q1 2025');
    expect(result.startDate).toBe('2025-01-01');
    expect(result.endDate).toBe('2025-03-31');
    expect(result.isActive).toBe(true);
    expect(result.createdAt).toBe('2025-01-01T00:00:00Z');
    expect(result.updatedAt).toBe('2025-01-01T00:00:00Z');
  });

  it('maps is_active false correctly', () => {
    const result = dbToStrategyCycle({ ...db, is_active: false });
    expect(result.isActive).toBe(false);
  });
});

// ─── dbToStrategyObjective ────────────────────────────────────────────────────

describe('dbToStrategyObjective', () => {
  const db: StrategyObjectiveDB = {
    id: 'obj-1',
    tenant_id: 'tenant-1',
    cycle_id: 'cycle-1',
    title: 'Aumentar NPS',
    description: 'Melhorar satisfação do cliente',
    owner_id: 'emp-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    owner: { nome: 'João Silva' },
  };

  it('maps all fields correctly', () => {
    const result = dbToStrategyObjective(db);
    expect(result.id).toBe('obj-1');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.cycleId).toBe('cycle-1');
    expect(result.title).toBe('Aumentar NPS');
    expect(result.description).toBe('Melhorar satisfação do cliente');
    expect(result.ownerId).toBe('emp-1');
    expect(result.ownerName).toBe('João Silva');
  });

  it('handles null owner gracefully', () => {
    const result = dbToStrategyObjective({ ...db, owner: null, owner_id: null });
    expect(result.ownerName).toBeNull();
    expect(result.ownerId).toBeNull();
  });

  it('handles missing owner object', () => {
    const { owner, ...dbWithoutOwner } = db;
    const result = dbToStrategyObjective(dbWithoutOwner as StrategyObjectiveDB);
    expect(result.ownerName).toBeNull();
  });

  it('handles null description', () => {
    const result = dbToStrategyObjective({ ...db, description: null });
    expect(result.description).toBeNull();
  });
});

// ─── dbToStrategyCheckin ─────────────────────────────────────────────────────

describe('dbToStrategyCheckin', () => {
  const db: StrategyCheckinDB = {
    id: 'checkin-1',
    key_result_id: 'kr-1',
    tenant_id: 'tenant-1',
    current_value: 75,
    confidence: 8,
    notes: 'Bom progresso',
    created_by: 'emp-1',
    created_at: '2025-02-01T00:00:00Z',
  };

  it('maps all fields correctly', () => {
    const result = dbToStrategyCheckin(db);
    expect(result.id).toBe('checkin-1');
    expect(result.keyResultId).toBe('kr-1');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.currentValue).toBe(75);
    expect(result.confidence).toBe(8);
    expect(result.notes).toBe('Bom progresso');
    expect(result.createdBy).toBe('emp-1');
    expect(result.createdAt).toBe('2025-02-01T00:00:00Z');
  });

  it('handles null notes and created_by', () => {
    const result = dbToStrategyCheckin({ ...db, notes: null, created_by: null });
    expect(result.notes).toBeNull();
    expect(result.createdBy).toBeNull();
  });
});

// ─── dbToStrategyKeyResult ────────────────────────────────────────────────────

describe('dbToStrategyKeyResult', () => {
  const checkinDB: StrategyCheckinDB = {
    id: 'checkin-1',
    key_result_id: 'kr-1',
    tenant_id: 'tenant-1',
    current_value: 70,
    confidence: 7,
    notes: null,
    checkin_date: '2025-02-01',
    created_by: null,
    created_at: '2025-02-01T00:00:00Z',
  };

  const db: StrategyKeyResultDB = {
    id: 'kr-1',
    tenant_id: 'tenant-1',
    objective_id: 'obj-1',
    title: 'NPS acima de 70',
    description: null,
    initial_value: 0,
    target_value: 100,
    current_value: 70,
    confidence: 7,
    unit: null,
    owner_id: 'emp-1',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-02-01T00:00:00Z',
    owner: { nome: 'Maria Santos' },
    checkins: [checkinDB],
  };

  it('maps all scalar fields', () => {
    const result = dbToStrategyKeyResult(db);
    expect(result.id).toBe('kr-1');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.objectiveId).toBe('obj-1');
    expect(result.title).toBe('NPS acima de 70');
    expect(result.initialValue).toBe(0);
    expect(result.targetValue).toBe(100);
    expect(result.currentValue).toBe(70);
    expect(result.confidence).toBe(7);
    expect(result.ownerName).toBe('Maria Santos');
  });

  it('converts nested checkins', () => {
    const result = dbToStrategyKeyResult(db);
    expect(result.checkins).toHaveLength(1);
    expect(result.checkins[0].id).toBe('checkin-1');
    expect(result.checkins[0].currentValue).toBe(70);
  });

  it('returns empty checkins array when none present', () => {
    const result = dbToStrategyKeyResult({ ...db, checkins: undefined });
    expect(result.checkins).toEqual([]);
  });

  it('handles null owner', () => {
    const result = dbToStrategyKeyResult({ ...db, owner: null, owner_id: null });
    expect(result.ownerName).toBeNull();
    expect(result.ownerId).toBeNull();
  });
});

// ─── dbToStrategyInitiative ───────────────────────────────────────────────────

describe('dbToStrategyInitiative', () => {
  const db: StrategyInitiativeDB = {
    id: 'init-1',
    tenant_id: 'tenant-1',
    objective_id: 'obj-1',
    title: 'Implementar NPS no produto',
    description: null,
    status: 'in_progress',
    priority: 'alta',
    effort: 2,
    position: 0,
    owner_id: 'emp-1',
    due_date: '2025-03-01',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    owner: { nome: 'Carlos Lima' },
    objective: { title: 'Aumentar NPS' },
  };

  it('maps all fields correctly', () => {
    const result = dbToStrategyInitiative(db);
    expect(result.id).toBe('init-1');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.objectiveId).toBe('obj-1');
    expect(result.title).toBe('Implementar NPS no produto');
    expect(result.status).toBe('in_progress');
    expect(result.priority).toBe('alta');
    expect(result.effort).toBe(2);
    expect(result.position).toBe(0);
    expect(result.ownerName).toBe('Carlos Lima');
    expect(result.objectiveTitle).toBe('Aumentar NPS');
    expect(result.dueDate).toBe('2025-03-01');
  });

  it('handles null optional join fields', () => {
    const result = dbToStrategyInitiative({
      ...db,
      owner: null,
      objective: null,
      owner_id: null,
      priority: null,
      effort: null,
    });
    expect(result.ownerName).toBeNull();
    expect(result.objectiveTitle).toBeNull();
    expect(result.ownerId).toBeNull();
    expect(result.priority).toBeNull();
    expect(result.effort).toBeNull();
  });

  it('preserves all status values', () => {
    const statuses = ['backlog', 'in_progress', 'review', 'done'] as const;
    for (const status of statuses) {
      const result = dbToStrategyInitiative({ ...db, status });
      expect(result.status).toBe(status);
    }
  });

  it('preserves all priority values', () => {
    const priorities = ['alta', 'media', 'baixa'] as const;
    for (const priority of priorities) {
      const result = dbToStrategyInitiative({ ...db, priority });
      expect(result.priority).toBe(priority);
    }
  });

  it('preserves all effort values', () => {
    const efforts = [1, 2, 3] as const;
    for (const effort of efforts) {
      const result = dbToStrategyInitiative({ ...db, effort });
      expect(result.effort).toBe(effort);
    }
  });
});
