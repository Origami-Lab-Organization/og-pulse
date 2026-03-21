import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Notification, useMarkNotificationRead } from '@/hooks/useNotifications';

interface Props {
  notification: Notification;
}

export function InboxTimesheetDetail({ notification }: Props) {
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();
  const meta = notification.metadata || {};

  return (
    <div className="space-y-4">
      {notification.type === 'timesheet_modified' && (
        <div className="rounded-lg bg-muted p-4 space-y-2">
          <p className="text-sm font-medium">Alteração de horas</p>
          {meta.editor_name && (
            <p className="text-sm text-muted-foreground">
              Editado por: <span className="font-medium text-foreground">{meta.editor_name}</span>
            </p>
          )}
          {meta.project_name && (
            <p className="text-sm text-muted-foreground">
              Projeto: <span className="font-medium text-foreground">{meta.project_name}</span>
            </p>
          )}
          {(meta.old_hours !== undefined || meta.new_hours !== undefined) && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground line-through">{meta.old_hours}h</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium text-foreground">{meta.new_hours}h</span>
            </div>
          )}
        </div>
      )}

      {(notification.type === 'timesheet_pending' || notification.type === 'timesheet_reminder') && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {notification.message || 'Você tem um timesheet pendente de envio.'}
          </p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={() => navigate(notification.action_url || '/my-timesheet')}
        >
          Ir para minha timesheet
        </Button>
        {!notification.is_read && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => markRead.mutate(notification.id)}
            disabled={markRead.isPending}
          >
            Marcar como lida
          </Button>
        )}
      </div>
    </div>
  );
}
