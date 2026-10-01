/** `conta_azul_connections.status` (ADR-0044). */
export enum ContaAzulConnectionStatus {
  Active = 'ativa',
  /** A autorização morreu do lado do Conta Azul: só conectando de novo. */
  Reconnect = 'reconectar',
}

export interface ContaAzulConnection {
  id: string;
  /** CNPJ só com dígitos, como o Conta Azul informou. */
  ca_document: string | null;
  ca_legal_name: string | null;
  ca_trade_name: string | null;
  status: ContaAzulConnectionStatus;
  connected_at: string;
  last_sync_at: string | null;
  last_error: string | null;
  /** Próximo mês da carga inicial; a carga terminou quando `backfill_done_at` existe. */
  backfill_cursor: string | null;
  backfill_done_at: string | null;
  /** No futuro enquanto uma sincronização roda. */
  syncing_until: string | null;
  receivable_count: number;
  payable_count: number;
}

/** Centro de custo do Conta Azul e a ligação manual com o centro do Pulse (ADR-0044). */
export interface ContaAzulCostCenter {
  id: string;
  ca_cost_center_id: string;
  code: string | null;
  name: string;
  is_active: boolean;
  cost_center_id: string | null;
}
