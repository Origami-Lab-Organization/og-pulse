import { useState, useEffect, useRef } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePendingReimbursementsCount } from '@/hooks/useReimbursements';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NotificationInbox } from '@/components/notifications/NotificationInbox';
import { cn } from '@/lib/utils';

export function InboxButton() {
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const { data: pendingCount = 0 } = usePendingReimbursementsCount();
  const { data: notifCount = 0 } = useUnreadNotificationsCount();
  const [open, setOpen] = useState(false);

  const isManagerOrAdmin = employee?.is_gerente || employee?.isAdmin;
  const totalCount = (isManagerOrAdmin ? pendingCount : 0) + notifCount;

  // Badge bounce when count increases
  const prevCountRef = useRef(totalCount);
  const [bouncing, setBouncing] = useState(false);
  useEffect(() => {
    if (totalCount > prevCountRef.current) {
      setBouncing(true);
      const t = setTimeout(() => setBouncing(false), 300);
      prevCountRef.current = totalCount;
      return () => clearTimeout(t);
    }
    prevCountRef.current = totalCount;
  }, [totalCount]);

  // Realtime subscription: invalidate badge count on new notification
  useEffect(() => {
    if (!employee?.id) return;

    const channel = supabase
      .channel('inbox-badge-' + employee.id)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${employee.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
          queryClient.invalidateQueries({ queryKey: ['pending-reimbursements-count'] });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [employee?.id, queryClient]);

  if (!employee) return null;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(true)}
      >
        <Inbox className="h-5 w-5" />
        {totalCount > 0 && (
          <span
            className={cn(
              'absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground',
              bouncing && 'animate-bounce-badge',
            )}
          >
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </Button>

      <NotificationInbox open={open} onOpenChange={setOpen} />
    </>
  );
}
