import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TerminationStatus, TERMINATION_STATUS_LABELS } from '@/types/termination';

const statusStyles: Record<TerminationStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  completed: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
  awaiting_documents: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
};

export const TerminationStatusBadge = ({ status }: { status: TerminationStatus }) => (
  <Badge variant="outline" className={cn('font-medium', statusStyles[status])}>
    {TERMINATION_STATUS_LABELS[status]}
  </Badge>
);
