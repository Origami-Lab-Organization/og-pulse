// ─── Cycle ────────────────────────────────────────────────────────────────────

export interface StrategyCycleDB {
  id: string;
  tenant_id: string;
  title: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StrategyCycle {
  id: string;
  tenantId: string;
  title: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStrategyCycleInput {
  title: string;
  start_date: string;
  end_date: string;
  is_active?: boolean;
}

export interface UpdateStrategyCycleInput {
  title?: string;
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export function dbToStrategyCycle(db: StrategyCycleDB): StrategyCycle {
  return {
    id: db.id,
    tenantId: db.tenant_id,
    title: db.title,
    startDate: db.start_date,
    endDate: db.end_date,
    isActive: db.is_active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ─── Objective ────────────────────────────────────────────────────────────────

export interface StrategyObjectiveDB {
  id: string;
  tenant_id: string;
  cycle_id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  owner?: { nome: string } | null;
}

export interface StrategyObjective {
  id: string;
  tenantId: string;
  cycleId: string;
  title: string;
  description: string | null;
  ownerId: string | null;
  ownerName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStrategyObjectiveInput {
  cycle_id: string;
  title: string;
  description?: string | null;
  owner_id?: string | null;
}

export interface UpdateStrategyObjectiveInput {
  title?: string;
  description?: string | null;
  owner_id?: string | null;
}

export function dbToStrategyObjective(db: StrategyObjectiveDB): StrategyObjective {
  return {
    id: db.id,
    tenantId: db.tenant_id,
    cycleId: db.cycle_id,
    title: db.title,
    description: db.description,
    ownerId: db.owner_id,
    ownerName: db.owner?.nome ?? null,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ─── Key Result ───────────────────────────────────────────────────────────────

export interface StrategyCheckinDB {
  id: string;
  key_result_id: string;
  tenant_id: string;
  current_value: number;
  confidence: number;
  notes: string | null;
  checkin_date: string;
  created_by: string | null;
  created_at: string;
}

export interface StrategyCheckin {
  id: string;
  keyResultId: string;
  tenantId: string;
  currentValue: number;
  confidence: number;
  notes: string | null;
  checkinDate: string;
  createdBy: string | null;
  createdAt: string;
}

export interface CreateStrategyCheckinInput {
  key_result_id: string;
  current_value: number;
  confidence: number;
  notes?: string | null;
  checkin_date: string;
}

export function dbToStrategyCheckin(db: StrategyCheckinDB): StrategyCheckin {
  return {
    id: db.id,
    keyResultId: db.key_result_id,
    tenantId: db.tenant_id,
    currentValue: db.current_value,
    confidence: db.confidence,
    notes: db.notes,
    checkinDate: db.checkin_date,
    createdBy: db.created_by,
    createdAt: db.created_at,
  };
}

export interface StrategyKeyResultDB {
  id: string;
  tenant_id: string;
  objective_id: string;
  title: string;
  description: string | null;
  initial_value: number;
  target_value: number;
  current_value: number;
  confidence: number;
  unit: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  owner?: { nome: string } | null;
  checkins?: StrategyCheckinDB[];
}

export interface StrategyKeyResult {
  id: string;
  tenantId: string;
  objectiveId: string;
  title: string;
  description: string | null;
  initialValue: number;
  targetValue: number;
  currentValue: number;
  confidence: number;
  unit: string | null;
  ownerId: string | null;
  ownerName: string | null;
  createdAt: string;
  updatedAt: string;
  checkins: StrategyCheckin[];
}

export interface CreateStrategyKeyResultInput {
  objective_id: string;
  title: string;
  description?: string | null;
  initial_value: number;
  target_value: number;
  current_value?: number;
  confidence?: number;
  unit?: string | null;
  owner_id?: string | null;
}

export interface UpdateStrategyKeyResultInput {
  title?: string;
  description?: string | null;
  initial_value?: number;
  target_value?: number;
  current_value?: number;
  confidence?: number;
  unit?: string | null;
  owner_id?: string | null;
}

export function dbToStrategyKeyResult(db: StrategyKeyResultDB): StrategyKeyResult {
  return {
    id: db.id,
    tenantId: db.tenant_id,
    objectiveId: db.objective_id,
    title: db.title,
    description: db.description,
    initialValue: db.initial_value,
    targetValue: db.target_value,
    currentValue: db.current_value,
    confidence: db.confidence,
    unit: db.unit ?? null,
    ownerId: db.owner_id,
    ownerName: db.owner?.nome ?? null,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    checkins: (db.checkins ?? []).map(dbToStrategyCheckin),
  };
}

// ─── Initiative ───────────────────────────────────────────────────────────────

export type InitiativeStatus = 'backlog' | 'in_progress' | 'review' | 'done';
export type InitiativePriority = 'alta' | 'media' | 'baixa';
export type InitiativeEffort = 1 | 2 | 3;

export interface StrategyInitiativeDB {
  id: string;
  tenant_id: string;
  objective_id: string;
  title: string;
  description: string | null;
  status: InitiativeStatus;
  priority: InitiativePriority | null;
  effort: InitiativeEffort | null;
  position: number;
  owner_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  owner?: { nome: string } | null;
  objective?: { title: string } | null;
}

export interface StrategyInitiative {
  id: string;
  tenantId: string;
  objectiveId: string;
  title: string;
  description: string | null;
  status: InitiativeStatus;
  priority: InitiativePriority | null;
  effort: InitiativeEffort | null;
  position: number;
  ownerId: string | null;
  ownerName: string | null;
  dueDate: string | null;
  objectiveTitle: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStrategyInitiativeInput {
  objective_id: string;
  title: string;
  description?: string | null;
  status?: InitiativeStatus;
  priority?: InitiativePriority | null;
  effort?: InitiativeEffort | null;
  position?: number;
  owner_id?: string | null;
  due_date?: string | null;
}

export interface UpdateStrategyInitiativeInput {
  title?: string;
  description?: string | null;
  status?: InitiativeStatus;
  priority?: InitiativePriority | null;
  effort?: InitiativeEffort | null;
  position?: number;
  owner_id?: string | null;
  due_date?: string | null;
}

export function dbToStrategyInitiative(db: StrategyInitiativeDB): StrategyInitiative {
  return {
    id: db.id,
    tenantId: db.tenant_id,
    objectiveId: db.objective_id,
    title: db.title,
    description: db.description,
    status: db.status,
    priority: db.priority,
    effort: db.effort,
    position: db.position,
    ownerId: db.owner_id,
    ownerName: db.owner?.nome ?? null,
    dueDate: db.due_date,
    objectiveTitle: db.objective?.title ?? null,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ─── Aggregates ───────────────────────────────────────────────────────────────

export interface StrategyObjectiveWithKrs extends StrategyObjective {
  keyResults: StrategyKeyResult[];
  avgProgress: number;
  avgConfidence: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export type KrStatus = 'green' | 'amber' | 'red';

export function getKrStatus(confidence: number): KrStatus {
  if (confidence >= 7) return 'green';
  if (confidence >= 4) return 'amber';
  return 'red';
}

export function getKrProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.round(Math.min((current / target) * 100, 100));
}
