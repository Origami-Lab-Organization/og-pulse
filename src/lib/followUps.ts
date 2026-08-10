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

export type FollowUpUrgency = 'overdue' | 'today' | 'upcoming';

/**
 * Urgência de um follow-up pendente, para coloração de listas e cards.
 * Helper único (GP-J3/J5 pedem centralizar) — antes havia três implementações
 * paralelas em LeadFollowUpSection, FollowUpsUrgentesWidget e aqui.
 */
export function getFollowUpUrgency(
  followUp: Pick<LeadFollowUp, 'scheduled_at' | 'status'>,
  now: Date = new Date(),
): FollowUpUrgency {
  const scheduled = new Date(followUp.scheduled_at).getTime();
  if (scheduled < now.getTime()) return 'overdue';
  const withinADay = scheduled - now.getTime() < 24 * 60 * 60 * 1000;
  return withinADay ? 'today' : 'upcoming';
}

/**
 * Valor para `<input type="datetime-local">` no fuso do usuário.
 *
 * `toISOString().slice(0,16)` — usado antes — devolve UTC, e o input trata o
 * valor como hora local: em BRT o horário sugerido saía 3h deslocado.
 */
export function toLocalDatetimeInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

/** Sugestão de retorno: próxima hora cheia, N dias à frente. */
export function suggestFollowUpDate(daysAhead = 0, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + daysAhead);
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

/**
 * O follow-up pendente mais próximo — é ele que define o próximo retorno de
 * contato exibido no card do Pipeline.
 */
export function getNextPendingFollowUp<T extends Pick<LeadFollowUp, 'scheduled_at' | 'status'>>(
  followUps: T[],
): T | null {
  const pending = followUps
    .filter((f) => f.status === 'pending')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  return pending[0] ?? null;
}
