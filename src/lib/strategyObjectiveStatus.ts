import { KrStatus, getKrStatus } from '@/types/strategy';

export const strategyObjectiveStatusConfig: Record<
  KrStatus,
  {
    label: string;
    className: string;
    dot: string;
    progressClass: string;
  }
> = {
  green: {
    label: 'No caminho',
    className: 'border-emerald-500 text-emerald-600 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    progressClass: '[&>div]:bg-emerald-500',
  },
  amber: {
    label: 'Em risco',
    className: 'border-amber-500 text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
    progressClass: '[&>div]:bg-amber-500',
  },
  red: {
    label: 'Crítico',
    className: 'border-red-500 text-red-600 dark:text-red-400',
    dot: 'bg-red-500',
    progressClass: '[&>div]:bg-red-500',
  },
};

export function getStrategyObjectiveStatus(confidence: number) {
  return strategyObjectiveStatusConfig[getKrStatus(confidence)];
}
