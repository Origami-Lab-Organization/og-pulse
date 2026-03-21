import { Skeleton } from '@/components/ui/skeleton';
import { Notification } from '@/hooks/useNotifications';
import { InboxNotificationRow } from './InboxNotificationRow';
import { InboxEmptyState } from './InboxEmptyState';
import type { InboxFolder } from '@/hooks/useInboxNotifications';

interface Props {
  notifications: Notification[];
  selectedId: string | null;
  onSelect: (notification: Notification) => void;
  isLoading: boolean;
  folder?: InboxFolder;
}

export function InboxNotificationList({
  notifications,
  selectedId,
  onSelect,
  isLoading,
  folder = 'all',
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
    return <InboxEmptyState folder={folder} />;
  }

  return (
    <div>
      {notifications.map((n, index) => (
        <InboxNotificationRow
          key={n.id}
          notification={n}
          isSelected={n.id === selectedId}
          onClick={() => onSelect(n)}
          index={index}
          isChecked={false}
          onToggleCheck={() => {}}
          onArchive={() => {}}
          onDelete={() => {}}
          hasAnyChecked={false}
        />
      ))}
    </div>
  );
}
