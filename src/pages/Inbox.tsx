import { useState, useEffect, useMemo } from "react";
import { ChevronLeft } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import {
  Notification,
  useMarkNotificationRead
} from "@/hooks/useNotifications";
import {
  useInboxNotifications,
  useInboxCounts,
  useArchiveNotification,
  useUnarchiveNotification,
  useArchiveMultipleNotifications,
  useDeleteNotification,
  useDeleteMultipleNotifications,
  useRestoreNotification,
  useRestoreMultipleNotifications,
  useMarkMultipleNotificationsRead,
  useMarkMultipleNotificationsUnread,
  EMPTY_INBOX_COUNTS,
  type InboxFolder
} from "@/hooks/useInboxNotifications";
import { InboxSidebar } from "@/components/inbox/InboxSidebar";
import {
  InboxListPanel,
  type BulkAction
} from "@/components/inbox/InboxListPanel";
import {
  InboxDetailPanel,
  InboxDetailEmpty
} from "@/components/inbox/InboxDetailPanel";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

export default function InboxPage() {
  const { employee } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [activeFolder, setActiveFolder] = useState<InboxFolder>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const { data: counts = EMPTY_INBOX_COUNTS } = useInboxCounts();
  const { data: notifications = [], isLoading } =
    useInboxNotifications(activeFolder);

  const isTrash = activeFolder === "lixeira";

  const markRead = useMarkNotificationRead();
  const archiveNotification = useArchiveNotification();
  const unarchiveNotification = useUnarchiveNotification();
  const archiveMultiple = useArchiveMultipleNotifications();
  const deleteNotification = useDeleteNotification();
  const deleteMultiple = useDeleteMultipleNotifications();
  const restoreNotification = useRestoreNotification();
  const restoreMultiple = useRestoreMultipleNotifications();
  const markMultipleRead = useMarkMultipleNotificationsRead();
  const markMultipleUnread = useMarkMultipleNotificationsUnread();

  // Realtime: refresh on all notification changes (INSERT, UPDATE, DELETE)
  useEffect(() => {
    if (!employee?.id) return;
    const channel = supabase
      .channel("inbox-page-" + employee.id)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${employee.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["inbox-notifications"] });
          queryClient.invalidateQueries({ queryKey: ["inbox-counts"] });
          queryClient.invalidateQueries({
            queryKey: ["unread-notifications-count"]
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [employee?.id, queryClient]);

  // Client-side search filter
  const filteredNotifications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return notifications;
    return notifications.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        (n.message?.toLowerCase().includes(q) ?? false)
    );
  }, [notifications, searchQuery]);

  const selected =
    filteredNotifications.find((n) => n.id === selectedId) ?? null;

  // Handlers
  const handleSelect = (n: Notification) => {
    setSelectedId(n.id);
    if (!n.is_read) markRead.mutate(n.id);
  };

  const handleFolderChange = (folder: InboxFolder) => {
    setActiveFolder(folder);
    setSelectedId(null);
    setCheckedIds(new Set());
    setSearchQuery("");
  };

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (
      checkedIds.size === filteredNotifications.length &&
      filteredNotifications.length > 0
    ) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(filteredNotifications.map((n) => n.id)));
    }
  };

  const handleBulkAction = (action: BulkAction) => {
    const ids = Array.from(checkedIds);
    const clear = () => setCheckedIds(new Set());

    if (action === "cancel") {
      clear();
      return;
    }
    if (action === "read") {
      markMultipleRead.mutate(ids, { onSuccess: clear });
      return;
    }
    if (action === "unread") {
      markMultipleUnread.mutate(ids, { onSuccess: clear });
      return;
    }
    if (action === "archive") {
      archiveMultiple.mutate(ids, {
        onSuccess: () => {
          clear();
          if (ids.includes(selectedId ?? "")) setSelectedId(null);
        }
      });
      return;
    }
    if (action === "delete") {
      deleteMultiple.mutate(ids, {
        onSuccess: () => {
          clear();
          if (ids.includes(selectedId ?? "")) setSelectedId(null);
        }
      });
      return;
    }
    if (action === "restore") {
      restoreMultiple.mutate(ids, {
        onSuccess: () => {
          clear();
          if (ids.includes(selectedId ?? "")) setSelectedId(null);
        }
      });
    }
  };

  const handleArchive = (id: string) => {
    archiveNotification.mutate(id);
    if (selectedId === id) setSelectedId(null);
  };

  const handleUnarchive = (id: string) => {
    unarchiveNotification.mutate(id);
    if (selectedId === id) setSelectedId(null);
  };

  const handleDelete = (id: string) => {
    deleteNotification.mutate(id);
    if (selectedId === id) setSelectedId(null);
  };

  const handleRestore = (id: string) => {
    restoreNotification.mutate(id);
    if (selectedId === id) setSelectedId(null);
  };

  const handleActionComplete = () => setSelectedId(null);

  return (
    <AppLayout title="Caixa de entrada" hideHeader>
      <div
        className="flex bg-card overflow-hidden border-t -mx-6 -mt-6"
        style={{ height: "calc(100vh - 56px)" }}
      >
        {/* Column 1: Sidebar — desktop only */}
        <div className="hidden md:flex">
          <InboxSidebar
            activeFolder={activeFolder}
            onFolderChange={handleFolderChange}
            counts={counts}
          />
        </div>

        {/* Column 2: List — full width on mobile */}
        <InboxListPanel
          notifications={filteredNotifications}
          selectedId={selectedId}
          onSelect={handleSelect}
          checkedIds={checkedIds}
          onToggleCheck={toggleCheck}
          onToggleAll={toggleSelectAll}
          onBulkAction={handleBulkAction}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          folder={activeFolder}
          onFolderChange={handleFolderChange}
          onArchive={handleArchive}
          onUnarchive={handleUnarchive}
          onDelete={handleDelete}
          onRestore={handleRestore}
        />

        {/* Column 3: Detail — desktop only */}
        <div className="hidden md:flex flex-1 overflow-y-auto min-h-0">
          {selected ? (
            <InboxDetailPanel
              key={selected.id}
              notification={selected}
              onActionComplete={handleActionComplete}
              onArchive={() => handleArchive(selected.id)}
              onUnarchive={() => handleUnarchive(selected.id)}
              onDelete={() => handleDelete(selected.id)}
              onRestore={() => handleRestore(selected.id)}
              isTrash={isTrash}
            />
          ) : (
            <InboxDetailEmpty />
          )}
        </div>
      </div>

      {/* Mobile: detail in fullscreen Dialog */}
      {isMobile && (
        <Dialog
          open={!!selected}
          onOpenChange={(open) => {
            if (!open) setSelectedId(null);
          }}
        >
          <DialogContent className="max-w-full h-[90dvh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-4 py-3 border-b flex-row items-center gap-3 space-y-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setSelectedId(null)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <DialogTitle className="text-base font-medium truncate">
                {selected?.title ?? ""}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              {selected && (
                <InboxDetailPanel
                  key={selected.id}
                  notification={selected}
                  onActionComplete={handleActionComplete}
                  onArchive={() => {
                    handleArchive(selected.id);
                    setSelectedId(null);
                  }}
                  onUnarchive={() => {
                    handleUnarchive(selected.id);
                    setSelectedId(null);
                  }}
                  onDelete={() => {
                    handleDelete(selected.id);
                    setSelectedId(null);
                  }}
                  onRestore={() => {
                    handleRestore(selected.id);
                    setSelectedId(null);
                  }}
                  isTrash={isTrash}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
