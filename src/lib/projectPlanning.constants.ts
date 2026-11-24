import type { PlanningApprovalStatus, PlanningItemKey } from '@/types/projectPlanning';

/** Constantes do planejamento guiado por checklist (US-0039). Tipos em `@/types/projectPlanning`. */

export const PLANNING_TABS: readonly { key: PlanningItemKey; label: string }[] = [
  { key: 'okrs', label: 'Objetivos' },
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'team', label: 'Equipe' },
  { key: 'stakeholders', label: 'Stakeholders' },
  { key: 'costs', label: 'Custos' },
];

export const PLANNING_APPROVAL_STATUS = {
  REQUESTED: 'requested',
  APPROVED: 'approved',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
} as const satisfies Record<string, PlanningApprovalStatus>;

export const STAKEHOLDER_PLANNING_ROLES = [
  { value: 'sponsor', label: 'Patrocinador' },
  { value: 'focal_point', label: 'Ponto focal' },
  { value: 'key_user', label: 'Usuário-chave' },
  { value: 'approver', label: 'Aprovador' },
] as const;

export const PLANNING_COST_TYPES = [
  { value: 'supplier', label: 'Fornecedor' },
  { value: 'subscription', label: 'Licença ou software' },
  { value: 'travel', label: 'Viagem' },
  { value: 'material', label: 'Material' },
  { value: 'other', label: 'Outro' },
] as const;
