import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Notification } from "@/hooks/useNotifications";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  MailOpen,
  Mail,
  Archive,
  Trash2,
  Search,
  X,
  Inbox,
  Clock,
  DollarSign,
  ChevronDown,
  UserSearch,
  FolderKanban
} from "lucide-react";
import { InboxNotificationRow } from "./InboxNotificationRow";
import { InboxEmptyState } from "./InboxEmptyState";
import type { InboxFolder } from "@/hooks/useInboxNotifications";
import { useIsMobile } from "@/hooks/use-mobile";

export type BulkAction =
  | "read"
  | "unread"
  | "archive"
  | "delete"
  | "cancel"
  | "unarchive";

const folderItems: {
  key: InboxFolder;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "all", label: "Caixa de entrada", icon: Inbox },
  { key: "unread", label: "Não lidas", icon: Mail },
  { key: "timesheet", label: "Timesheet", icon: Clock },
  { key: "reimbursement", label: "Reembolsos", icon: DollarSign },
  { key: "candidates", label: "Candidaturas", icon: UserSearch },
  { key: "projeto", label: "Projetos", icon: FolderKanban },
  { key: "archived", label: "Arquivadas", icon: Archive }
];

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
  onFolderChange: (folder: InboxFolder) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
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
  onFolderChange,
  onArchive,
  onUnarchive,
  onDelete
}: Props) {
  const isMobile = useIsMobile();
  const [showSearch, setShowSearch] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isSelecting = checkedIds.size > 0;
  const allChecked =
    notifications.length > 0 &&
    notifications.every((n) => checkedIds.has(n.id));
  const someChecked = checkedIds.size > 0 && !allChecked;

  const activeFolder = folderItems.find((f) => f.key === folder);
  const ActiveFolderIcon = activeFolder?.icon ?? Inbox;

  useEffect(() => {
    if (showSearch && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showSearch]);

  // Reset focused index when folder or search changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [folder, searchQuery]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (notifications.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((i) => Math.min(i + 1, notifications.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          if (focusedIndex >= 0 && focusedIndex < notifications.length) {
            onSelect(notifications[focusedIndex]);
          }
          break;
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < notifications.length) {
            onToggleCheck(notifications[focusedIndex].id);
          }
          break;
        case "e":
        case "Delete":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < notifications.length) {
            onArchive(notifications[focusedIndex].id);
          }
          break;
        case "Escape":
          onBulkAction("cancel");
          setFocusedIndex(-1);
          break;
      }
    },
    [
      notifications,
      focusedIndex,
      onSelect,
      onToggleCheck,
      onArchive,
      onBulkAction
    ]
  );

  const bulkActions = [
    {
      icon: MailOpen,
      label: "Marcar como lidas",
      action: "read" as BulkAction
    },
    {
      icon: Mail,
      label: "Marcar como não lidas",
      action: "unread" as BulkAction
    },
    {
      icon: Archive,
      label: "Arquivar selecionadas",
      action: "archive" as BulkAction
    },
    {
      icon: Trash2,
      label: "Excluir selecionadas",
      action: "delete" as BulkAction
    }
  ];

  return (
    <div className="w-full md:w-[400px] border-r flex flex-col shrink-0 min-h-0">
      {/* Toolbar */}
      <div
        className={cn(
          "px-3 py-2 border-b flex items-center gap-2 flex-shrink-0 transition-colors duration-150",
          isSelecting && "bg-accent/50"
        )}
      >
        {isSelecting ? (
          /* ── Selection mode ── */
          <div className="flex items-center gap-2 w-full animate-in fade-in-0 duration-100">
            <Checkbox
              checked={
                allChecked ? true : someChecked ? "indeterminate" : false
              }
              onCheckedChange={onToggleAll}
              className="flex-shrink-0"
            />
            <span className="text-sm font-medium flex-1">
              {checkedIds.size} selecionada{checkedIds.size !== 1 ? "s" : ""}
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
                      aria-label={label}
                      onClick={() => onBulkAction(action)}
                    >
                      <Icon className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="hidden sm:block">
                    {label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
            <div className="h-4 w-px bg-border" />
            {/* Desktop: text "Cancelar"; Mobile: X icon */}
            <Button
              variant="ghost"
              size={isMobile ? "icon" : "sm"}
              className={cn("h-8", isMobile ? "w-8" : "text-xs px-2")}
              aria-label="Cancelar seleção"
              onClick={() => onBulkAction("cancel")}
            >
              {isMobile ? <X className="h-4 w-4" /> : "Cancelar"}
            </Button>
          </div>
        ) : (
          /* ── Normal mode ── */
          <div className="flex items-center gap-2 w-full animate-in fade-in-0 duration-100">
            {/* Mobile: folder dropdown */}
            <div className="flex md:hidden flex-1 min-w-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 px-2 max-w-full"
                  >
                    <ActiveFolderIcon className="h-4 w-4 shrink-0" />
                    <span className="text-sm truncate">
                      {activeFolder?.label}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  {folderItems.map(({ key, label, icon: Icon }) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={() => onFolderChange(key)}
                      className={cn(
                        "gap-2",
                        folder === key && "bg-accent text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Desktop: select-all checkbox + count */}
            <div className="hidden md:flex items-center gap-2 flex-1">
              <Checkbox
                checked={
                  allChecked ? true : someChecked ? "indeterminate" : false
                }
                onCheckedChange={onToggleAll}
                className="flex-shrink-0"
              />
              <span className="text-sm text-muted-foreground">
                {notifications.length} notificaç
                {notifications.length !== 1 ? "ões" : "ão"}
              </span>
            </div>

            {/* Search toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label={showSearch ? "Fechar busca" : "Buscar notificações"}
              onClick={() => {
                setShowSearch((s) => !s);
                if (showSearch) onSearchChange("");
              }}
            >
              {showSearch ? (
                <X className="h-4 w-4" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Inline search bar */}
      {showSearch && (
        <div className="px-3 py-2 border-b animate-in fade-in-0 slide-in-from-top-1 duration-150">
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
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto focus:outline-none"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (focusedIndex < 0 && notifications.length > 0) setFocusedIndex(0);
        }}
        aria-label="Lista de notificações"
        role="listbox"
      >
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[68px] w-full rounded-md" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <InboxEmptyState folder={folder} searchQuery={searchQuery} />
        ) : (
          notifications.map((n, index) => (
            <InboxNotificationRow
              key={n.id}
              notification={n}
              isSelected={n.id === selectedId}
              onClick={() => {
                setFocusedIndex(index);
                onSelect(n);
              }}
              index={index}
              isChecked={checkedIds.has(n.id)}
              onToggleCheck={onToggleCheck}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onDelete={onDelete}
              hasAnyChecked={checkedIds.size > 0}
              isFocused={focusedIndex === index}
            />
          ))
        )}
      </div>
    </div>
  );
}
