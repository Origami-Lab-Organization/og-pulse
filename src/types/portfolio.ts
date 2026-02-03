export type PortfolioStage = 
  | 'planning'
  | 'value_delivery'
  | 'results_presentation'
  | 'value_book'
  | 'learning_case'
  | 'completed';

export const PORTFOLIO_COLUMNS = [
  { id: 'planning' as PortfolioStage, label: 'Planejamento', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
  { id: 'value_delivery' as PortfolioStage, label: 'Entrega de Valor', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' },
  { id: 'results_presentation' as PortfolioStage, label: 'Apresentação de Resultados', color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300' },
  { id: 'value_book' as PortfolioStage, label: 'Value Book', color: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' },
  { id: 'learning_case' as PortfolioStage, label: 'Aprendizado e Case', color: 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300' },
  { id: 'completed' as PortfolioStage, label: 'Concluído', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' },
] as const;

export const PORTFOLIO_STAGE_LABELS: Record<PortfolioStage, string> = {
  planning: 'Planejamento',
  value_delivery: 'Entrega de Valor',
  results_presentation: 'Apresentação de Resultados',
  value_book: 'Value Book',
  learning_case: 'Aprendizado e Case',
  completed: 'Concluído',
};
