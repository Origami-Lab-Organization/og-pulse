import { useNavigate } from 'react-router-dom';
import { parseISO } from 'date-fns';
import { Bell, Clock, FolderKanban, FileText, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useInboxNotifications } from '@/hooks/useInboxNotifications';
import { Notification } from '@/hooks/useNotifications';

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - parseISO(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin}min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? 'ontem' : `${diffDays}d`;
}

function CategoryIcon({ category }: { category: string }) {
  const cls = 'h-3.5 w-3.5 shrink-0';
  if (category === 'timesheet') return <Clock className={cls} />;
  if (category === 'projeto') return <FolderKanban className={cls} />;
  if (category === 'budget') return <FileText className={cls} />;
  return <Bell className={cls} />;
}

export function NotificacoesRecentesWidget() {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useInboxNotifications('unread');
  const recent = notifications.slice(0, 4);

  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              Notificações
            </CardTitle>
            <Skeleton className="h-4 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
            <Bell className="h-4 w-4 text-muted-foreground" />
            Notificações
            {notifications.length > 0 && (
              <span className="text-xs font-medium tabular-nums text-muted-foreground ml-0.5">
                ({notifications.length})
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground gap-1 hover:text-foreground"
            onClick={() => navigate('/inbox')}
          >
            Ver todas
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-1">
        {recent.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <Bell className="h-5 w-5 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhuma notificação nova.</p>
          </div>
        ) : (
          recent.map((n: Notification) => (
            <div
              key={n.id}
              className="flex items-start gap-2.5 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group"
              onClick={() => (n.action_url ? navigate(n.action_url) : navigate('/inbox'))}
            >
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground group-hover:bg-muted/80 transition-colors">
                <CategoryIcon category={n.category} />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-xs font-medium leading-snug truncate">{n.title}</p>
                {n.message && (
                  <p className="text-[11px] text-muted-foreground leading-snug truncate mt-0.5">
                    {n.message}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0 pt-0.5 tabular-nums">
                {timeAgo(n.created_at)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
