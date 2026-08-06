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
