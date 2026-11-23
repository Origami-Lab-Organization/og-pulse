export type PortfolioStage =
  | 'planning'
  | 'value_delivery'
  | 'results_presentation'
  | 'learning_case'
  | 'completed';

/** Estágios canônicos — compare por aqui, nunca por string literal. */
export const PORTFOLIO_STAGE = {
  PLANNING: 'planning',
  VALUE_DELIVERY: 'value_delivery',
  RESULTS_PRESENTATION: 'results_presentation',
  LEARNING_CASE: 'learning_case',
  COMPLETED: 'completed',
} as const;

const COLUMN_COLOR = 'bg-muted text-muted-foreground';

export const PORTFOLIO_COLUMNS = [
  { id: 'planning' as PortfolioStage, label: 'Planejamento', color: COLUMN_COLOR },
  { id: 'value_delivery' as PortfolioStage, label: 'Entrega de Valor', color: COLUMN_COLOR },
  { id: 'results_presentation' as PortfolioStage, label: 'Apresentação de Resultados', color: COLUMN_COLOR },
  { id: 'learning_case' as PortfolioStage, label: 'Aprendizado e Case', color: COLUMN_COLOR },
  { id: 'completed' as PortfolioStage, label: 'Concluído', color: COLUMN_COLOR },
] as const;

export const PORTFOLIO_STAGE_LABELS: Record<PortfolioStage, string> = {
  planning: 'Planejamento',
  value_delivery: 'Entrega de Valor',
  results_presentation: 'Apresentação de Resultados',
learning_case: 'Aprendizado e Case',
  completed: 'Concluído',
};

/**
 * Colunas do quadro do portfólio (US-0035). Não são etapas: "Encerramento" é derivada da data
 * de fim (últimos 20 dias e depois do fim) e reúne as duas etapas antigas de encerramento.
 */
export type PortfolioBoardColumnId = 'planning' | 'value_delivery' | 'closing' | 'completed';

export const PORTFOLIO_BOARD_COLUMN = {
  PLANNING: 'planning',
  VALUE_DELIVERY: 'value_delivery',
  CLOSING: 'closing',
  COMPLETED: 'completed',
} as const satisfies Record<string, PortfolioBoardColumnId>;

/** Indicadores do portfólio num ano (US-0034). */
export interface PortfolioKpis {
  /** Projetos em andamento (tudo que não está concluído). */
  activeCount: number;
  /** Contrato total dos projetos em andamento. */
  activeContract: number;
  /** Parcelas com vencimento no ano. */
  expectedRevenue: number;
  /** Parcelas com vencimento no ano já recebidas. */
  receivedRevenue: number;
}

/** Alcance do portfólio: os projetos de quem está logado, ou todos. */
export type PortfolioScope = 'mine' | 'all';

/** Forecast de um projeto ativo para o portfólio (US-0034, US-0037): mesma conta da aba Financeiro. */
export interface PortfolioProjectForecast {
  projectId: string;
  contract: number;
  /** Custo final estimado (US-0031). */
  forecastCost: number;
  /** Margem projetada no fim do projeto, em %. */
  forecastMargin: number;
  /** Sem custo planejado não há forecast para julgar. */
  hasCostPlanned: boolean;
  /** Meta de margem do projeto (configuração financeira vigente no início dele). */
  target: number;
}

/** Metas do portfólio num ano (US-0036, tabela `portfolio_goals`). */
export interface PortfolioGoals {
  year: number;
  revenueTarget: number;
  grossMarginTargetPercent: number;
}

/** Pendência de um projeto, contada no sino do card e listada na Visão Geral (US-0037). */
export interface PortfolioAlert {
  /** `late`: algo fora do planejado; `attention`: pede a atenção do GP. */
  level: 'late' | 'attention';
  text: string;
}

/** Margem bruta do portfólio (US-0034): média das margens projetadas ponderada pelo contrato. */
export interface PortfolioMargin {
  percent: number;
  /** Projetos com forecast (custo planejado e contrato). */
  projectCount: number;
  /** Desses, quantos estão na meta de margem deles. */
  inTargetCount: number;
}
