export type PortfolioStage = 
  | 'planning'
  | 'value_delivery'
  | 'results_presentation'
  | 'value_book'
  | 'learning_case'
  | 'completed';

export const PORTFOLIO_COLUMNS = [
  { id: 'planning' as PortfolioStage, label: 'Planejamento', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  { id: 'value_delivery' as PortfolioStage, label: 'Entrega de Valor', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { id: 'results_presentation' as PortfolioStage, label: 'Apresentação de Resultados', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300' },
  { id: 'value_book' as PortfolioStage, label: 'Value Book', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  { id: 'learning_case' as PortfolioStage, label: 'Aprendizado e Case', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300' },
  { id: 'completed' as PortfolioStage, label: 'Concluído', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
] as const;

export const PORTFOLIO_STAGE_LABELS: Record<PortfolioStage, string> = {
  planning: 'Planejamento',
  value_delivery: 'Entrega de Valor',
  results_presentation: 'Apresentação de Resultados',
  value_book: 'Value Book',
  learning_case: 'Aprendizado e Case',
  completed: 'Concluído',
};
