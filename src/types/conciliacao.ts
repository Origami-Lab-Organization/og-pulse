import type { InstallmentStatus } from '@/types/project';

/** Linha de `conta_azul_receivables_reconciliation`: um par, ou uma parcela sozinha de um lado. */
export interface ReceivableReconciliationRow {
  match_id: string | null;
  strength: MatchStrength | null;
  confirmed_at: string | null;
  received_applied_at: string | null;
  /** A baixa veio do casamento forte, sem ninguém clicar. */
  received_applied_auto: boolean;
  installment_id: string | null;
  project_id: string | null;
  project_name: string | null;
  client_name: string | null;
  installment_number: number | null;
  pulse_value: number | null;
  pulse_due_date: string | null;
  pulse_status: InstallmentStatus | null;
  pulse_payment_date: string | null;
  pulse_invoice_number: string | null;
  ca_id: string | null;
  ca_person_name: string | null;
  ca_description: string | null;
  ca_gross: number | null;
  ca_net: number | null;
  ca_due_date: string | null;
  ca_status: ContaAzulInstallmentStatus | null;
  ca_payment_date: string | null;
  ca_invoice_number: string | null;
  ca_removed: boolean;
}

/** `conta_azul_matches.strength`. */
export enum MatchStrength {
  /** Mesma NF e mesmo CNPJ: casado sozinho e dá baixa. */
  Strong = 'forte',
  /** Mesmo CNPJ, valor e vencimento perto: só sugestão. */
  Weak = 'fraco',
}

/** `conta_azul_installments.status`, já normalizado pela sincronização. */
export enum ContaAzulInstallmentStatus {
  Open = 'em_aberto',
  Paid = 'quitado',
  Overdue = 'atrasado',
  Partial = 'parcial',
  Renegotiated = 'renegociado',
  Lost = 'perdido',
  Cancelled = 'cancelado',
  Unknown = 'desconhecido',
}

/** Onde a linha cai na conciliação. */
export enum ReconciliationSituation {
  Matched = 'casada',
  Divergent = 'divergente',
  Suggested = 'sugerida',
  OnlyPulse = 'so_pulse',
  OnlyContaAzul = 'so_conta_azul',
}

export enum ReconciliationDivergence {
  Value = 'valor',
  Status = 'status',
  PaymentDate = 'data_pagamento',
  RemovedInContaAzul = 'removida',
}

export type ReconciliationSummary = Record<ReconciliationSituation, number>;
