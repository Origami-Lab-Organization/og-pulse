import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TerminationType, TERMINATION_TYPE_LABELS } from '@/types/termination';

const typeStyles: Record<TerminationType, string> = {
  voluntary: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400 dark:border-sky-800',
  involuntary: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  contract_end: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  internship_end: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  retirement: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  mutual_agreement: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
};

export const TerminationTypeBadge = ({ type }: { type: TerminationType }) => (
  <Badge variant="outline" className={cn('font-medium', typeStyles[type])}>
    {TERMINATION_TYPE_LABELS[type]}
  </Badge>
);
