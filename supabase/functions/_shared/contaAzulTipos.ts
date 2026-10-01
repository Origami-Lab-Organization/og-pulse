export interface Tokens {
  accessToken: string;
  refreshToken: string;
  /** Segundos até o access token vencer. */
  expiresIn: number;
}

export interface EmpresaConectada {
  idEmpresa: string;
  /** CNPJ só com dígitos. */
  documento: string | null;
  razaoSocial: string | null;
  nomeFantasia: string | null;
}

/**
 * `Reconectar` só se resolve com nova autorização; `Limite` e `Indisponivel` passam com o
 * tempo; `Configuracao` é do ambiente do Pulse, não da empresa.
 */
export enum MotivoFalha {
  Reconectar = "reconectar",
  Limite = "limite",
  Indisponivel = "indisponivel",
  Recusado = "recusado",
  Configuracao = "configuracao",
}

/** Valores de `error` / `error_subtype` que o endpoint de token devolve. */
export enum ErroOAuth {
  ConcessaoInvalida = "invalid_grant",
  ClienteInvalido = "invalid_client",
}

/** `conta_azul_connections.status`. */
export enum StatusConexao {
  Ativa = "ativa",
  Reconectar = "reconectar",
}

export interface Conexao {
  id: string;
  tenant_id: string;
  ca_company_id: string;
  ca_document: string | null;
  ca_legal_name: string | null;
  ca_trade_name: string | null;
  status: StatusConexao;
  connected_at: string;
  last_sync_at: string | null;
  last_error: string | null;
}
