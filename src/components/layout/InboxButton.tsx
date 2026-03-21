import { useEffect, useRef, useState } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export function InboxButton() {
  const { employee } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: notifCount = 0 } = useUnreadNotificationsCount();

  // Badge bounce when count increases
  const prevCountRef = useRef(notifCount);
  const [bouncing, setBouncing] = useState(false);
  useEffect(() => {
    if (notifCount > prevCountRef.current) {
      setBouncing(true);
      const t = setTimeout(() => setBouncing(false), 300);
      prevCountRef.current = notifCount;
      return () => clearTimeout(t);
    }
    prevCountRef.current = notifCount;
  }, [notifCount]);

  // Realtime: invalidate badge count on new notification
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
          queryClient.invalidateQueries({ queryKey: ['inbox-counts'] });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [employee?.id, queryClient]);

  if (!employee) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => navigate('/inbox')}
    >
      <Inbox className="h-5 w-5" />
      {notifCount > 0 && (
        <span
          className={cn(
            'absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground',
            bouncing && 'animate-bounce-badge',
          )}
        >
          {notifCount > 9 ? '9+' : notifCount}
        </span>
      )}
    </Button>
  );
}
