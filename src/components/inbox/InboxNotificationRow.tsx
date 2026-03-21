import { cn } from '@/lib/utils';
import { Notification } from '@/hooks/useNotifications';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
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

const categoryIcon: Record<string, { bg: string; text: string; label: string }> = {
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

function formatTime(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return `Hoje, ${format(date, 'HH:mm')}`;
  if (isYesterday(date)) return `Ontem, ${format(date, 'HH:mm')}`;
  return format(date, 'dd/MM, HH:mm', { locale: ptBR });
}

interface Props {
  notification: Notification;
  isSelected: boolean;
  onClick: () => void;
}

export function InboxNotificationRow({ notification, isSelected, onClick }: Props) {
  const iconConfig = categoryIcon[notification.category] ?? categoryIcon.timesheet;
  const badge = statusBadge[notification.type];

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-3 cursor-pointer border-b transition-colors border-l-[3px]',
        notification.is_read ? 'border-l-transparent' : 'border-l-blue-500',
        isSelected ? 'bg-accent' : 'hover:bg-muted/50',
      )}
    >
      {/* Unread dot */}
      <div
        className={cn(
          'h-2 w-2 rounded-full flex-shrink-0 transition-all duration-300',
          notification.is_read ? 'opacity-0' : 'bg-blue-500',
        )}
      />

      {/* Category icon */}
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-md flex-shrink-0 text-sm font-bold',
          iconConfig.bg,
          iconConfig.text,
        )}
      >
        {iconConfig.label}
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', notification.is_read ? 'font-normal' : 'font-medium')}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground truncate">{notification.message}</p>
        )}
      </div>

      {/* Meta */}
      <div className="text-right shrink-0">
        <p className="text-[11px] text-muted-foreground">{formatTime(notification.created_at)}</p>
        {badge && (
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block', badge.className)}>
            {badge.label}
          </span>
        )}
      </div>
    </div>
  );
}
