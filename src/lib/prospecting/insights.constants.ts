/** Insights de IA da página da empresa (US-0057, ADR-0057): um bloco por tema e o porte. */

export const STATUS_DO_PEDIDO = {
  NA_FILA: 'na_fila',
  GERANDO: 'gerando',
  PRONTO: 'pronto',
  FALHOU: 'falhou',
} as const;
export type StatusDoPedido = (typeof STATUS_DO_PEDIDO)[keyof typeof STATUS_DO_PEDIDO];

/** Pedido que ainda vai mudar: a página acompanha e não deixa pedir outro. */
export const PEDIDO_ABERTO: ReadonlySet<StatusDoPedido> = new Set([STATUS_DO_PEDIDO.NA_FILA, STATUS_DO_PEDIDO.GERANDO]);

export const ROTULO_DO_PEDIDO_ABERTO: Readonly<Record<string, string>> = {
  [STATUS_DO_PEDIDO.NA_FILA]: 'Na fila',
  [STATUS_DO_PEDIDO.GERANDO]: 'Gerando',
};

export const TEMAS_DOS_INSIGHTS = [
  { chave: 'produtos', rotulo: 'Produtos e serviços' },
  { chave: 'clientes', rotulo: 'Clientes' },
  { chave: 'concorrentes', rotulo: 'Concorrentes' },
  { chave: 'noticias', rotulo: 'Notícias e referências' },
] as const;
export type TemaDosInsights = (typeof TEMAS_DOS_INSIGHTS)[number]['chave'];

/** O porte é pedido no cartão Porte; "todos" são os pedidos de antes do pedido por tema. */
export const TEMA_DO_PORTE = 'porte';
export const TEMA_TODOS = 'todos';
export type TemaDoPedido = TemaDosInsights | typeof TEMA_DO_PORTE | typeof TEMA_TODOS;

export const TIPO_DE_PROPOSTA = {
  FUNCIONARIOS: 'funcionarios',
  FATURAMENTO: 'faturamento',
} as const;
export type TipoDeProposta = (typeof TIPO_DE_PROPOSTA)[keyof typeof TIPO_DE_PROPOSTA];

export const ROTULO_DA_PROPOSTA: Readonly<Record<TipoDeProposta, string>> = {
  [TIPO_DE_PROPOSTA.FUNCIONARIOS]: 'Funcionários',
  [TIPO_DE_PROPOSTA.FATURAMENTO]: 'Faturamento',
};

export const ESTADO_DA_PROPOSTA = {
  PROPOSTA: 'proposta',
  ACEITA: 'aceita',
  RECUSADA: 'recusada',
} as const;
export type EstadoDaProposta = (typeof ESTADO_DA_PROPOSTA)[keyof typeof ESTADO_DA_PROPOSTA];

export const ROTULO_DA_DECISAO: Readonly<Record<string, string>> = {
  [ESTADO_DA_PROPOSTA.ACEITA]: 'Aceita',
  [ESTADO_DA_PROPOSTA.RECUSADA]: 'Recusada',
};

/** O runner manda sinal a cada 30 s; a página confere no mesmo ritmo. */
export const INTERVALO_DO_RUNNER_MS = 30_000;
/** Enquanto o pedido está na fila ou gerando, a página olha a cada 5 s. */
export const INTERVALO_DO_PEDIDO_MS = 5_000;

export const CHAVE_DOS_INSIGHTS = 'insights-da-empresa';
export const CHAVE_DO_PEDIDO = 'pedido-de-insights';
export const CHAVE_DAS_PROPOSTAS = 'propostas-de-porte';
export const CHAVE_DO_RUNNER = 'runner-de-insights';
