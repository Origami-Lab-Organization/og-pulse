import { cn } from '@/lib/utils';
import { Notification } from '@/hooks/useNotifications';
import { InboxTimesheetDetail } from './InboxTimesheetDetail';
import { InboxReimbursementDetail } from './InboxReimbursementDetail';
import { CorrectionData } from '@/components/reimbursements/ReimbursementFormDialog';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusBadge: Record<string, { label: string; className: string }> = {
  timesheet_reminder: { label: 'Ação necessária', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  timesheet_pending: { label: 'Pendente', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  timesheet_modified: { label: 'Informativo', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  reimbursement_pending: { label: 'Aprovar/Rejeitar', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  reimbursement_approved: { label: 'Aprovado', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  reimbursement_rejected: { label: 'Rejeitado', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  reimbursement_paid: { label: 'Pago', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

const categoryConfig: Record<string, { bg: string; text: string; label: string }> = {
  timesheet: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-600 dark:text-amber-400',
    label: 'T',
  },
  reimbursement: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-600 dark:text-green-400',
    label: '$',
  },
};

interface Props {
  notification: Notification;
  onActionComplete: () => void;
  onOpenCorrectForm: (data: CorrectionData) => void;
}

export function InboxDetailPanel({ notification, onActionComplete, onOpenCorrectForm }: Props) {
  const badge = statusBadge[notification.type];
  const catConfig = categoryConfig[notification.category] ?? categoryConfig.timesheet;

  let timestamp = '';
  try {
    timestamp = format(parseISO(notification.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
  } catch {
    timestamp = notification.created_at;
  }

  return (
    <div className="flex flex-col h-full animate-in fade-in-0 duration-150">
      {/* Header */}
      <div className="px-6 py-5 border-b flex items-start gap-4">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-md flex-shrink-0 text-sm font-bold',
            catConfig.bg,
            catConfig.text,
          )}
        >
          {catConfig.label}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-medium leading-snug">{notification.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{timestamp}</p>
        </div>
        {badge && (
          <span className={cn('text-[11px] px-2 py-0.5 rounded-full flex-shrink-0', badge.className)}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {notification.message && (
          <p className="text-sm text-muted-foreground mb-4">{notification.message}</p>
        )}

        {notification.category === 'timesheet' && (
          <InboxTimesheetDetail notification={notification} />
        )}

        {notification.category === 'reimbursement' && (
          <InboxReimbursementDetail
            notification={notification}
            onActionComplete={onActionComplete}
            onOpenCorrectForm={onOpenCorrectForm}
          />
        )}
      </div>
    </div>
  );
}
