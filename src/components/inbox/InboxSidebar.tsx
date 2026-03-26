import { cn } from "@/lib/utils";
import {
  Inbox,
  Mail,
  Clock,
  DollarSign,
  Archive,
  Plus,
  UserSearch,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { InboxFolder } from "@/hooks/useInboxNotifications";

interface FolderItem {
  key: InboxFolder;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

type FolderEntry = FolderItem | "separator";

const folders: FolderEntry[] = [
  { key: "all", label: "Caixa de entrada", icon: Inbox },
  { key: "unread", label: "Não lidas", icon: Mail },
  "separator",
  { key: "timesheet", label: "Timesheet", icon: Clock },
  { key: "reimbursement", label: "Reembolsos", icon: DollarSign },
  { key: "budget", label: "Orçamentos", icon: FileText },
  { key: "candidates", label: "Candidaturas", icon: UserSearch },
  "separator",
  { key: "archived", label: "Arquivadas", icon: Archive }
];

interface Props {
  activeFolder: InboxFolder;
  onFolderChange: (folder: InboxFolder) => void;
  counts: {
    all: number;
    unread: number;
    timesheet: number;
    reimbursement: number;
    budget: number;
    candidates: number;
    archived: number;
  };
  onNewAction: () => void;
}

export function InboxSidebar({
  activeFolder,
  onFolderChange,
  counts,
  onNewAction
}: Props) {
  const countMap: Record<InboxFolder, number> = {
    all: counts.all,
    unread: counts.unread,
    timesheet: counts.timesheet,
    reimbursement: counts.reimbursement,
    budget: counts.budget,
    candidates: counts.candidates,
    archived: counts.archived
  };

  return (
    <div className="w-[220px] border-r bg-card flex flex-col shrink-0">
      {/* New action button */}
      <div className="p-4">
        <Button className="w-full" onClick={onNewAction}>
          <Plus className="h-4 w-4 mr-2" />
          Nova ação
        </Button>
      </div>

      {/* Folders */}
      <nav className="flex-1 py-2">
        {folders.map((item, i) => {
          if (item === "separator") {
            return (
              <div key={`sep-${i}`} className="h-px bg-border mx-4 my-1" />
            );
          }
          const Icon = item.icon;
          const isActive = activeFolder === item.key;
          const count = countMap[item.key];

          return (
            <button
              key={item.key}
              onClick={() => onFolderChange(item.key)}
              className={cn(
                "w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors",
                isActive
                  ? "text-primary font-medium border-r-2 border-primary"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {count > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "shrink-0 h-5 min-w-[20px] px-1.5 text-[10px]",
                    isActive
                      ? "bg-primary/15 text-primary hover:bg-primary/15"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {count}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
