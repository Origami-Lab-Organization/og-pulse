import { cn } from '@/lib/utils';
import { Notification } from '@/hooks/useNotifications';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Archive, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

const statusBadge: Record<string, { label: string; className: string }> = {
  timesheet_reminder: { label: 'Ação necessária', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  timesheet_pending: { label: 'Pendente', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  timesheet_modified: { label: 'Informativo', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  timesheet_submitted: { label: 'Enviado', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
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
  index?: number;
  isChecked: boolean;
  onToggleCheck: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  hasAnyChecked: boolean;
}

export function InboxNotificationRow({
  notification,
  isSelected,
  onClick,
  index = 0,
  isChecked,
  onToggleCheck,
  onArchive,
  onDelete,
  hasAnyChecked,
}: Props) {
  const iconConfig = categoryIcon[notification.category] ?? categoryIcon.timesheet;
  const badge = statusBadge[notification.type];
  const showCheckbox = hasAnyChecked || isChecked;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex items-start gap-2.5 px-3 py-3 cursor-pointer border-b transition-colors border-l-[3px]',
        'animate-in fade-in-0 slide-in-from-bottom-1 duration-200 fill-mode-backwards',
        notification.is_read ? 'border-l-transparent' : 'border-l-primary',
        isSelected
          ? 'bg-accent'
          : isChecked
            ? 'bg-accent/50 hover:bg-accent/60'
            : 'hover:bg-muted/50',
      )}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Checkbox / unread-dot area */}
      <div className="flex-shrink-0 w-5 flex items-center justify-center mt-1 relative">
        {/* Unread dot — visible only when checkbox is hidden and notification is unread */}
        {!showCheckbox && !notification.is_read && (
          <div className="absolute inset-0 flex items-center justify-center group-hover:hidden pointer-events-none">
            <div className="h-2 w-2 rounded-full bg-primary" />
          </div>
        )}
        <div
          className={cn(
            'transition-opacity',
            showCheckbox ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isChecked}
            onCheckedChange={() => onToggleCheck(notification.id)}
          />
        </div>
      </div>

      {/* Category icon */}
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-md flex-shrink-0 text-sm font-bold mt-0.5',
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
        <div className="flex flex-wrap items-center gap-1 mt-0.5">
          {notification.message && (
            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{notification.message}</p>
          )}
          {badge && (
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full sm:hidden inline-block flex-shrink-0', badge.className)}>
              {badge.label}
            </span>
          )}
        </div>
      </div>

      {/* Meta — timestamp + badge (desktop) */}
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-[11px] text-muted-foreground">{formatTime(notification.created_at)}</p>
        {badge && (
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block', badge.className)}>
            {badge.label}
          </span>
        )}
      </div>

      {/* Quick actions on row hover (hidden in bulk-select mode) */}
      {!hasAnyChecked && (
        <div
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'bg-card border rounded-md shadow-sm p-0.5 flex gap-0.5',
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); onArchive(notification.id); }}
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
