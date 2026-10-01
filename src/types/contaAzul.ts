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
}
