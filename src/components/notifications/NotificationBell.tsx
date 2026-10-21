import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationCategoryIcon } from '@/components/notifications/NotificationCategoryIcon';
import { useInboxNotifications } from '@/hooks/useInboxNotifications';
import {
  type Notification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useUnreadNotificationsCount,
} from '@/hooks/useNotifications';
import { useNotificationsRealtime } from '@/hooks/useNotificationsRealtime';
import { notificationAge } from '@/lib/notificationAge';

/** Quantas não lidas o painel mostra; o resto fica na Caixa de Entrada. */
const BELL_LIMIT = 8;

function badgeLabel(count: number): string {
  return count > 9 ? '9+' : String(count);
}

interface NotificationItemProps {
  notification: Notification;
  onOpen: () => void;
}

function NotificationItem(props: NotificationItemProps) {
  const { notification, onOpen } = props;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <NotificationCategoryIcon category={notification.category} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{notification.title}</span>
          {notification.message && (
            <span className="line-clamp-2 text-xs text-muted-foreground">{notification.message}</span>
          )}
        </span>
        <span className="shrink-0 pt-0.5 text-[10px] text-muted-foreground tabular-nums">
          {notificationAge(notification.created_at)}
        </span>
      </button>
    </li>
  );
}

interface BellListProps {
  notifications: Notification[];
  isLoading: boolean;
  onOpen: (notification: Notification) => void;
}

function BellList(props: BellListProps) {
  const { notifications, isLoading, onOpen } = props;
  if (isLoading) {
    return (
      <div className="space-y-2 p-2">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (!notifications.length) {
    return <p className="px-4 py-8 text-center text-sm text-muted-foreground">Tudo em dia: nenhuma notificação nova.</p>;
  }
  return (
    <ul className="max-h-96 space-y-0.5 overflow-y-auto p-2">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} onOpen={() => onOpen(notification)} />
      ))}
    </ul>
  );
}

/**
 * Sino do cabeçalho (ADR-0051): as não lidas sem sair da tela. Abrir uma marca como lida e
 * leva para a tela dela; o resto mora na Caixa de Entrada.
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: count = 0 } = useUnreadNotificationsCount();
  const { data: unread = [], isLoading } = useInboxNotifications('unread');
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  useNotificationsRealtime();

  const goTo = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleOpen = (notification: Notification) => {
    markRead.mutate(notification.id);
    goTo(notification.action_url || '/inbox');
  };

  const handleMarkAll = () =>
    markAll.mutate(undefined, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inbox-notifications'] }),
    });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={count > 0 ? `Notificações, ${count} não lidas` : 'Notificações'}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {badgeLabel(count)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notificações</p>
          {unread.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAll} disabled={markAll.isPending}>
              <CheckCheck className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
        <BellList notifications={unread.slice(0, BELL_LIMIT)} isLoading={isLoading} onOpen={handleOpen} />
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full justify-center text-xs" onClick={() => goTo('/inbox')}>
            Abrir Caixa de Entrada
            <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
