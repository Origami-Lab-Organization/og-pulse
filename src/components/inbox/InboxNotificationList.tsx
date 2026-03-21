import { Skeleton } from '@/components/ui/skeleton';
import { Notification } from '@/hooks/useNotifications';
import { InboxNotificationRow } from './InboxNotificationRow';
import { InboxEmptyState } from './InboxEmptyState';

interface Props {
  notifications: Notification[];
  selectedId: string | null;
  onSelect: (notification: Notification) => void;
  isLoading: boolean;
  category: 'all' | 'timesheet' | 'reimbursement';
  filter: 'all' | 'unread' | 'action';
}

export function InboxNotificationList({
  notifications,
  selectedId,
  onSelect,
  isLoading,
  category,
  filter,
}: Props) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px] w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (notifications.length === 0) {
    return <InboxEmptyState category={category} filter={filter} />;
  }

  return (
    <div>
      {notifications.map((n) => (
        <InboxNotificationRow
          key={n.id}
          notification={n}
          isSelected={n.id === selectedId}
          onClick={() => onSelect(n)}
        />
      ))}
    </div>
  );
}
