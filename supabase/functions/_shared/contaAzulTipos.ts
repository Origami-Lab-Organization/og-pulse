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

/** `conta_azul_installments.kind`. */
export enum TipoParcela {
  Receita = "receita",
  Despesa = "despesa",
}

/** `conta_azul_installments.status`, normalizado dos dois enums do Conta Azul. */
export enum StatusParcela {
  EmAberto = "em_aberto",
  Quitado = "quitado",
  Atrasado = "atrasado",
  Parcial = "parcial",
  Renegociado = "renegociado",
  Perdido = "perdido",
  Cancelado = "cancelado",
  Desconhecido = "desconhecido",
}

/** Item da busca de contas a receber/pagar: magro, mas é o único que traz a pessoa. */
export interface ItemDaBusca {
  id: string;
  descricao?: string;
  data_vencimento?: string;
  data_competencia?: string;
  data_alteracao?: string;
  status?: string;
  total?: number;
  pago?: number;
  nao_pago?: number;
  cliente?: { id?: string; nome?: string };
  fornecedor?: { id?: string; nome?: string };
}

export interface Rateio {
  id_categoria?: string;
  nome_categoria?: string;
  valor?: number;
  rateio_centro_custo?: { id_centro_custo?: string; nome_centro_custo?: string; valor?: number; valor_bruto?: number }[];
}

/** Parcela por id: traz baixa, bruto/líquido, NF e rateio — tudo que a busca não traz. */
export interface ParcelaDetalhada {
  id: string;
  status?: string;
  descricao?: string;
  data_vencimento?: string;
  data_alteracao?: string;
  valor_pago?: number;
  nao_pago?: number;
  valor_total_liquido?: number;
  valor_composicao?: { valor_bruto?: number; valor_liquido?: number };
  baixas?: { data_pagamento?: string }[];
  fatura?: { numero?: string | number; tipo_fatura?: string };
  evento?: { id?: string; data_competencia?: string; codigo_referencia?: string; rateio?: Rateio[] };
}

export interface CentroDeCustoDaApi {
  id: string;
  codigo?: string;
  nome?: string;
  ativo?: boolean;
}

/** Linha de `conta_azul_installments` como a sincronização grava. */
export interface LinhaDeParcela {
  tenant_id: string;
  connection_id: string;
  ca_installment_id: string;
  ca_event_id: string | null;
  kind: TipoParcela;
  description: string | null;
  due_date: string | null;
  competence_date: string | null;
  payment_date: string | null;
  status: StatusParcela;
  gross_amount: number | null;
  net_amount: number | null;
  paid_amount: number | null;
  open_amount: number | null;
  person_ca_id: string | null;
  person_name: string | null;
  person_document: string | null;
  invoice_number: string | null;
  invoice_type: string | null;
  reference_code: string | null;
  categories: { id: string | null; name: string | null; amount: number | null }[];
  cost_centers: { id: string | null; name: string | null; amount: number | null; gross: number | null }[];
  ca_updated_at: string | null;
  synced_at: string;
  removed_at: null;
}

/** De onde vem a linha do espelho: empresa, conexão, tipo e o CNPJ já resolvido da pessoa. */
export interface Origem {
  tenantId: string;
  connectionId: string;
  tipo: TipoParcela;
  documento: string | null;
  agora: string;
}

export interface PessoaDaApi {
  nome?: string;
  documento?: string;
}

/** Colunas de `conta_azul_connections` que a sincronização lê e avança. */
export interface ConexaoParaSincronizar {
  id: string;
  tenant_id: string;
  connected_at: string;
  backfill_cursor: string | null;
  backfill_done_at: string | null;
  incremental_cursor: string | null;
  last_full_scan_at: string | null;
}

export enum SituacaoDaSincronizacao {
  Concluida = "concluida",
  /** Outra execução (cron ou "Sincronizar agora") já está com a trava. */
  EmAndamento = "em_andamento",
  Erro = "erro",
}

export interface ResumoDaSincronizacao {
  situacao: SituacaoDaSincronizacao;
  atualizadas: number;
  /** Parcelas que o Conta Azul listou mas recusou no detalhe (404 e afins). */
  recusadas: number;
}
