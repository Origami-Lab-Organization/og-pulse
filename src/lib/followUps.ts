import type { LeadFollowUp } from '@/hooks/useLeadFollowUps';

/**
 * Helper único de "vencido" (GP-J5 CA-01) — reusado no card do Pipeline e na timeline.
 * Regra da jornada: vencido = scheduled_at < now() && status !== 'done'.
 */
export function isFollowUpOverdue(
  followUp: Pick<LeadFollowUp, 'scheduled_at' | 'status'>,
  now: Date = new Date(),
): boolean {
  return followUp.status !== 'done' && new Date(followUp.scheduled_at) < now;
}

export type FollowUpVisualStatus = 'pending' | 'overdue' | 'done' | 'skipped';

/**
 * Status visual de um follow-up para badges/cores (timeline e listas).
 * 'skipped' tem identidade própria e nunca alerta como vencido.
 */
export function getFollowUpVisualStatus(
  followUp: Pick<LeadFollowUp, 'scheduled_at' | 'status'>,
  now: Date = new Date(),
): FollowUpVisualStatus {
  if (followUp.status === 'done') return 'done';
  if (followUp.status === 'skipped') return 'skipped';
  return new Date(followUp.scheduled_at) < now ? 'overdue' : 'pending';
}

export const FOLLOW_UP_STATUS_LABEL: Record<FollowUpVisualStatus, string> = {
  pending: 'Pendente',
  overdue: 'Vencido',
  done: 'Concluído',
  skipped: 'Pulado',
};
