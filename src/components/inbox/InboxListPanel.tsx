import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Notification } from '@/hooks/useNotifications';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MailOpen, Mail, Archive, Trash2, Search, X } from 'lucide-react';
import { InboxNotificationRow } from './InboxNotificationRow';
import { InboxEmptyState } from './InboxEmptyState';
import type { InboxFolder } from '@/hooks/useInboxNotifications';

export type BulkAction = 'read' | 'unread' | 'archive' | 'delete' | 'cancel';

interface Props {
  notifications: Notification[];
  selectedId: string | null;
  onSelect: (n: Notification) => void;
  checkedIds: Set<string>;
  onToggleCheck: (id: string) => void;
  onToggleAll: () => void;
  onBulkAction: (action: BulkAction) => void;
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  folder: InboxFolder;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}

export function InboxListPanel({
  notifications,
  selectedId,
  onSelect,
  checkedIds,
  onToggleCheck,
  onToggleAll,
  onBulkAction,
  isLoading,
  searchQuery,
  onSearchChange,
  folder,
  onArchive,
  onDelete,
}: Props) {
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const isSelecting = checkedIds.size > 0;
  const allChecked = notifications.length > 0 && notifications.every((n) => checkedIds.has(n.id));
  const someChecked = checkedIds.size > 0 && !allChecked;

  useEffect(() => {
    if (showSearch && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showSearch]);

  const bulkActions = [
    { icon: MailOpen, label: 'Marcar como lidas', action: 'read' as BulkAction },
    { icon: Mail, label: 'Marcar como não lidas', action: 'unread' as BulkAction },
    { icon: Archive, label: 'Arquivar selecionadas', action: 'archive' as BulkAction },
    { icon: Trash2, label: 'Excluir selecionadas', action: 'delete' as BulkAction },
  ];

  return (
    <div className="w-[400px] border-r flex flex-col shrink-0 min-h-0">
      {/* Toolbar */}
      <div
        className={cn(
          'px-3 py-2 border-b flex items-center gap-2 flex-shrink-0 transition-colors',
          isSelecting && 'bg-accent/50',
        )}
      >
        <Checkbox
          checked={allChecked ? true : someChecked ? 'indeterminate' : false}
          onCheckedChange={onToggleAll}
          className="flex-shrink-0"
        />

        {isSelecting ? (
          <>
            <span className="text-sm font-medium flex-1">
              {checkedIds.size} selecionada{checkedIds.size !== 1 ? 's' : ''}
            </span>
            <div className="h-4 w-px bg-border" />
            <TooltipProvider>
              {bulkActions.map(({ icon: Icon, label, action }) => (
                <Tooltip key={action}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onBulkAction(action)}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{label}</TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
            <div className="h-4 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs px-2"
              onClick={() => onBulkAction('cancel')}
            >
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm text-muted-foreground flex-1">
              {notifications.length} notificaç{notifications.length !== 1 ? 'ões' : 'ão'}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setShowSearch((s) => !s);
                if (showSearch) onSearchChange('');
              }}
            >
              {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
          </>
        )}
      </div>

      {/* Inline search bar */}
      {showSearch && (
        <div className="px-3 py-2 border-b">
          <Input
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar notificações..."
            className="h-8 text-xs"
          />
        </div>
      )}

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px] w-full rounded-md" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <InboxEmptyState folder={folder} />
        ) : (
          notifications.map((n, index) => (
            <InboxNotificationRow
              key={n.id}
              notification={n}
              isSelected={n.id === selectedId}
              onClick={() => onSelect(n)}
              index={index}
              isChecked={checkedIds.has(n.id)}
              onToggleCheck={onToggleCheck}
              onArchive={onArchive}
              onDelete={onDelete}
              hasAnyChecked={checkedIds.size > 0}
            />
          ))
        )}
      </div>
    </div>
  );
}
