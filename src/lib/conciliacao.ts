import { deriveInstallmentStatus } from '@/lib/installmentStatus';
import {
  ContaAzulInstallmentStatus,
  MatchStrength,
  ReconciliationDivergence,
  ReconciliationSituation,
} from '@/types/conciliacao';
import type { ReceivableReconciliationRow, ReconciliationSummary } from '@/types/conciliacao';

/**
 * Regra da conciliação de receber na tela (ADR-0044, parte 3). O casamento em si é do banco
 * (`conta_azul_reconcile_receivables`); aqui só se lê o par e se diz o que diverge.
 */

/** Centavo de tolerância: o Conta Azul e o Pulse arredondam em lugares diferentes. */
const CENT = 0.01;

const isPulseReceived = (row: ReceivableReconciliationRow) => row.pulse_status === 'received';
const isContaAzulPaid = (row: ReceivableReconciliationRow) => row.ca_status === ContaAzulInstallmentStatus.Paid;

function valueDiverges(row: ReceivableReconciliationRow): boolean {
  if (row.pulse_value == null || row.ca_gross == null) return false;
  return Math.abs(Number(row.pulse_value) - Number(row.ca_gross)) > CENT;
}

function paymentDateDiverges(row: ReceivableReconciliationRow): boolean {
  if (!isPulseReceived(row) || !isContaAzulPaid(row)) return false;
  return Boolean(row.pulse_payment_date && row.ca_payment_date && row.pulse_payment_date !== row.ca_payment_date);
}

/** O que diverge num par. Valor líquido menor que o bruto é retenção, não divergência. */
export function divergencesOf(row: ReceivableReconciliationRow): ReconciliationDivergence[] {
  if (!row.match_id) return [];
  const found: ReconciliationDivergence[] = [];
  if (row.ca_removed) found.push(ReconciliationDivergence.RemovedInContaAzul);
  if (valueDiverges(row)) found.push(ReconciliationDivergence.Value);
  if (isPulseReceived(row) !== isContaAzulPaid(row)) found.push(ReconciliationDivergence.Status);
  if (paymentDateDiverges(row)) found.push(ReconciliationDivergence.PaymentDate);
  return found;
}

export function situationOf(row: ReceivableReconciliationRow): ReconciliationSituation {
  if (!row.match_id) return row.installment_id ? ReconciliationSituation.OnlyPulse : ReconciliationSituation.OnlyContaAzul;
  if (row.strength === MatchStrength.Weak && !row.confirmed_at) return ReconciliationSituation.Suggested;
  return divergencesOf(row).length > 0 ? ReconciliationSituation.Divergent : ReconciliationSituation.Matched;
}

/** Retenção de imposto: bruto − líquido no Conta Azul, quando passa de um centavo. */
export function withholdingOf(row: ReceivableReconciliationRow): number | null {
  if (row.ca_gross == null || row.ca_net == null) return null;
  const diff = Number(row.ca_gross) - Number(row.ca_net);
  return diff > CENT ? diff : null;
}

/** Par confirmado, quitado lá, não recebido aqui: dá para levar a baixa para o Pulse. */
export function canApplyPayment(row: ReceivableReconciliationRow): boolean {
  return Boolean(row.match_id && row.confirmed_at && isContaAzulPaid(row) && row.ca_payment_date && !isPulseReceived(row));
}

export function summarize(rows: ReceivableReconciliationRow[]): ReconciliationSummary {
  const summary: ReconciliationSummary = {
    [ReconciliationSituation.Matched]: 0,
    [ReconciliationSituation.Divergent]: 0,
    [ReconciliationSituation.Suggested]: 0,
    [ReconciliationSituation.OnlyPulse]: 0,
    [ReconciliationSituation.OnlyContaAzul]: 0,
  };
  for (const row of rows) summary[situationOf(row)] += 1;
  return summary;
}

export const SITUATION_LABEL: Record<ReconciliationSituation, string> = {
  [ReconciliationSituation.Matched]: 'Casadas',
  [ReconciliationSituation.Divergent]: 'Com divergência',
  [ReconciliationSituation.Suggested]: 'Para confirmar',
  [ReconciliationSituation.OnlyPulse]: 'Só no Pulse',
  [ReconciliationSituation.OnlyContaAzul]: 'Só no Conta Azul',
};

export const DIVERGENCE_LABEL: Record<ReconciliationDivergence, string> = {
  [ReconciliationDivergence.Value]: 'valor diferente',
  [ReconciliationDivergence.Status]: 'recebimento diferente',
  [ReconciliationDivergence.PaymentDate]: 'data de recebimento diferente',
  [ReconciliationDivergence.RemovedInContaAzul]: 'removida no Conta Azul',
};

export const CONTA_AZUL_STATUS_LABEL: Record<ContaAzulInstallmentStatus, string> = {
  [ContaAzulInstallmentStatus.Open]: 'Em aberto',
  [ContaAzulInstallmentStatus.Paid]: 'Quitada',
  [ContaAzulInstallmentStatus.Overdue]: 'Atrasada',
  [ContaAzulInstallmentStatus.Partial]: 'Recebida em parte',
  [ContaAzulInstallmentStatus.Renegotiated]: 'Renegociada',
  [ContaAzulInstallmentStatus.Lost]: 'Perdida',
  [ContaAzulInstallmentStatus.Cancelled]: 'Cancelada',
  [ContaAzulInstallmentStatus.Unknown]: 'Situação desconhecida',
};

const PULSE_STATUS_LABEL = {
  pendente: 'Pendente',
  nf_emitida: 'NF emitida',
  recebido: 'Recebida',
  atrasado: 'Atrasada',
} as const;

/** Rótulo do status do Pulse como as outras telas mostram (atrasada é derivada, nunca gravada). */
export function pulseStatusLabel(row: ReceivableReconciliationRow, today: Date): string | null {
  if (!row.pulse_status || !row.pulse_due_date) return null;
  const view = deriveInstallmentStatus(
    { status: row.pulse_status, due_date: row.pulse_due_date, payment_date: row.pulse_payment_date },
    today,
  );
  return PULSE_STATUS_LABEL[view];
}
