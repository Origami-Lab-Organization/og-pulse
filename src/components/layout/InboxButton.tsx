import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePendingReimbursementsCount } from '@/hooks/useReimbursements';
import { useUnreadNotificationsCount } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { ReimbursementInbox } from '@/components/reimbursements/ReimbursementInbox';

export function InboxButton() {
  const { employee } = useAuth();
  const { data: pendingCount = 0 } = usePendingReimbursementsCount();
  const { data: notifCount = 0 } = useUnreadNotificationsCount();
  const [open, setOpen] = useState(false);

  const isManagerOrAdmin = employee?.is_gerente || employee?.isAdmin;
  const totalCount = (isManagerOrAdmin ? pendingCount : 0) + notifCount;

  // Show for all users (employees see their notifications)
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
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {totalCount > 9 ? '9+' : totalCount}
          </span>
        )}
      </Button>

      <ReimbursementInbox open={open} onOpenChange={setOpen} />
    </>
  );
}
