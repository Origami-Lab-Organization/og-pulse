import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { VacationRequestStatus, VACATION_REQUEST_STATUS_LABELS } from '@/types/vacation';

const STATUS_CLASS: Record<VacationRequestStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  cancelled: 'bg-muted text-muted-foreground',
};

export function VacationStatusBadge({ status }: { status: VacationRequestStatus }) {
  return (
    <Badge variant="secondary" className={cn('border-0', STATUS_CLASS[status])}>
      {VACATION_REQUEST_STATUS_LABELS[status]}
    </Badge>
  );
}
