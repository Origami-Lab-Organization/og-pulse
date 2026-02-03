export type PortfolioStage = 
  | 'planning'
  | 'value_delivery'
  | 'results_presentation'
  | 'value_book'
  | 'learning_case'
  | 'completed';

export const PORTFOLIO_COLUMNS = [
  { id: 'planning' as PortfolioStage, label: 'Planejamento', color: 'bg-muted text-foreground' },
  { id: 'value_delivery' as PortfolioStage, label: 'Entrega de Valor', color: 'bg-muted text-foreground' },
  { id: 'results_presentation' as PortfolioStage, label: 'Apresentação de Resultados', color: 'bg-muted text-foreground' },
  { id: 'value_book' as PortfolioStage, label: 'Value Book', color: 'bg-muted text-foreground' },
  { id: 'learning_case' as PortfolioStage, label: 'Aprendizado e Case', color: 'bg-muted text-foreground' },
  { id: 'completed' as PortfolioStage, label: 'Concluído', color: 'bg-muted text-foreground' },
] as const;

export const PORTFOLIO_STAGE_LABELS: Record<PortfolioStage, string> = {
  planning: 'Planejamento',
  value_delivery: 'Entrega de Valor',
  results_presentation: 'Apresentação de Resultados',
  value_book: 'Value Book',
  learning_case: 'Aprendizado e Case',
  completed: 'Concluído',
};
