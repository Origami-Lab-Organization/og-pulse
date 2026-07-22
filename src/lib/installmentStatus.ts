import { addMonths, format, parseISO, subDays } from 'date-fns';
import type { InstallmentStatus } from '@/types/project';

/**
 * Estado exibido de uma parcela. `atrasado` é SEMPRE derivado (nunca persistido):
 * parcela não recebida cujo vencimento já passou. Os demais espelham o status
 * persistido (`pending` → pendente, `invoiced` → nf_emitida, `received` → recebido).
 */
export type InstallmentViewStatus = 'pendente' | 'nf_emitida' | 'recebido' | 'atrasado';

export interface InstallmentLike {
  status: InstallmentStatus;
  due_date: string;
  payment_date?: string | null;
}

/** yyyy-MM-dd local de uma data (comparável lexicograficamente entre datas ISO). */
export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Deriva o estado de exibição. `atrasado` tem precedência sobre `nf_emitida`:
 * uma parcela vencida e não recebida é atrasada mesmo que a NF já tenha saído.
 */
export function deriveInstallmentStatus(inst: InstallmentLike, today: Date): InstallmentViewStatus {
  if (inst.status === 'received') return 'recebido';
  if (inst.due_date && inst.due_date < toISODate(today)) return 'atrasado';
  if (inst.status === 'invoiced') return 'nf_emitida';
  return 'pendente';
}

/** Data em que o lembrete de emissão de NF abre: vencimento − antecedência. */
export function getNfReminderDate(dueDate: string, leadDays: number): Date {
  return subDays(parseISO(dueDate), Math.max(0, leadDays));
}

/**
 * A parcela está aguardando emissão de NF? Verdadeiro quando a NF ainda não foi
 * emitida (status `pending`) e a janela do lembrete já abriu (hoje ≥ vencimento −
 * antecedência). Parcelas já vencidas entram no alerta de atraso, não aqui.
 */
export function isNfEmissionDue(inst: InstallmentLike, leadDays: number, today: Date): boolean {
  if (inst.status !== 'pending') return false;
  const todayISO = toISODate(today);
  if (inst.due_date < todayISO) return false; // vencida → alerta de atraso
  return toISODate(getNfReminderDate(inst.due_date, leadDays)) <= todayISO;
}

export interface InstallmentStatusMeta {
  label: string;
  /** Classe do badge com tokens semânticos (nunca hex avulso). */
  badgeClassName: string;
}

/**
 * Rótulo + classe do badge por estado. Vermelho (destructive) é exclusivo de
 * `atrasado` — único uso de vermelho na aba Financeiro.
 */
export function installmentStatusMeta(view: InstallmentViewStatus): InstallmentStatusMeta {
  switch (view) {
    case 'recebido':
      return { label: 'Recebido', badgeClassName: 'bg-primary-deep/10 text-primary-deep' };
    case 'nf_emitida':
      return {
        label: 'NF Emitida',
        badgeClassName: 'bg-[hsl(var(--brand-slate))]/10 text-[hsl(var(--brand-slate))]',
      };
    case 'atrasado':
      return { label: 'Atrasado', badgeClassName: 'bg-destructive/10 text-destructive' };
    default:
      return { label: 'Pendente', badgeClassName: 'bg-muted text-muted-foreground' };
  }
}

/** A ação rápida disponível para o estado atual (uma por status). */
export type InstallmentQuickActionKind = 'mark_invoiced' | 'register_payment' | 'none';

export function installmentQuickAction(view: InstallmentViewStatus): InstallmentQuickActionKind {
  if (view === 'pendente') return 'mark_invoiced';
  if (view === 'nf_emitida' || view === 'atrasado') return 'register_payment';
  return 'none';
}

export interface GeneratedInstallmentDraft {
  installmentNumber: number;
  dueDate: string;
  value: number;
}

/**
 * Gera N parcelas mensais a partir do valor do contrato e do 1º vencimento,
 * distribuindo os centavos de sobra na última parcela. Todas nascem `pending`.
 */
export function generateInstallmentDrafts(input: {
  totalValue: number;
  count: number;
  firstDueDate: string;
}): GeneratedInstallmentDraft[] {
  const count = Math.max(1, Math.trunc(input.count || 1));
  const totalCents = Math.round((Number(input.totalValue) || 0) * 100);
  const baseCents = Math.floor(totalCents / count);
  const first = parseISO(input.firstDueDate);

  return Array.from({ length: count }, (_, i) => {
    const cents = i === count - 1 ? totalCents - baseCents * (count - 1) : baseCents;
    return {
      installmentNumber: i + 1,
      dueDate: toISODate(addMonths(first, i)),
      value: Number((cents / 100).toFixed(2)),
    };
  });
}
