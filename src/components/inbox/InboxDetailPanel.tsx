import { useState } from "react";
import { cn } from "@/lib/utils";
import { Notification } from "@/hooks/useNotifications";
import { InboxTimesheetDetail } from "./InboxTimesheetDetail";
import { InboxReimbursementDetail } from "./InboxReimbursementDetail";
import { InboxBudgetDetail } from "./InboxBudgetDetail";
import { CorrectionData } from "@/components/reimbursements/ReimbursementFormDialog";
import { MyProjectsWidget } from "@/components/dashboard/MyProjectsWidget";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Archive,
  ArchiveX,
  Trash2,
  Inbox,
  Clock,
  DollarSign,
  UserSearch,
  FileText,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const statusBadge: Record<string, { label: string; className: string }> = {
  timesheet_reminder: {
    label: "Ação necessária",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
  },
  timesheet_pending: {
    label: "Pendente",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  },
  timesheet_modified: {
    label: "Informativo",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  },
  timesheet_submitted: {
    label: "Enviado",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
  },
  reimbursement_pending: {
    label: "Aprovar/Rejeitar",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
  },
  reimbursement_approved: {
    label: "Aprovado",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
  },
  reimbursement_rejected: {
    label: "Rejeitado",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  },
  reimbursement_paid: {
    label: "Pago",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  },
  budget_margin_pending: {
    label: "Aprovar/Rejeitar",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
  },
  budget_margin_approved: {
    label: "Aprovado",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
  },
  budget_margin_rejected: {
    label: "Não aprovado",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  }
};

const categoryConfig: Record<
  string,
  {
    bg: string;
    text: string;
    icon: React.ElementType;
    badge: string;
    badgeClass: string;
  }
> = {
  timesheet: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-600 dark:text-amber-400",
    icon: Clock,
    badge: "Timesheet",
    badgeClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
  },
  reimbursement: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-600 dark:text-green-400",
    icon: DollarSign,
    badge: "Reembolso",
    badgeClass:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
  },
  candidatos: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-600 dark:text-purple-400",
    icon: UserSearch,
    badge: "Candidatura",
    badgeClass:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
  },
  budget: {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-600 dark:text-orange-400",
    icon: FileText,
    badge: "Orçamento",
    badgeClass:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
  }
};

interface Props {
  notification: Notification;
  onActionComplete: () => void;
  onOpenCorrectForm: (data: CorrectionData) => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}

export function InboxDetailPanel({
  notification,
  onActionComplete,
  onOpenCorrectForm,
  onArchive,
  onUnarchive,
  onDelete
}: Props) {
  const navigate = useNavigate();
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  // Reset when notification changes
  const [lastNotifId, setLastNotifId] = useState(notification.id);
  if (notification.id !== lastNotifId) {
    setLastNotifId(notification.id);
    setLiveStatus(null);
  }

  const liveReimbursementBadgeKey = liveStatus
    ? `reimbursement_${liveStatus}`
    : null;
  const badge =
    (liveReimbursementBadgeKey && statusBadge[liveReimbursementBadgeKey]) ??
    statusBadge[notification.type];
  const catConfig =
    categoryConfig[notification.category] ?? categoryConfig.timesheet;
  const CatIcon = catConfig.icon;

  let timestamp = "";
  try {
    timestamp = format(
      parseISO(notification.created_at),
      "dd 'de' MMMM 'às' HH:mm",
      { locale: ptBR }
    );
  } catch {
    timestamp = notification.created_at;
  }

  return (
    <div className="flex flex-col h-full w-full animate-in fade-in-0 duration-150">
      {/* Header */}
      <div className="px-6 py-5 border-b flex items-start gap-4">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md flex-shrink-0 mt-0.5",
            catConfig.bg,
            catConfig.text
          )}
        >
          <CatIcon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-medium leading-snug">
              {notification.title}
            </h2>
            <div className="flex gap-1 flex-shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                title={notification.is_archived ? "Desarquivar" : "Arquivar"}
                onClick={notification.is_archived ? onUnarchive : onArchive}
              >
                {notification.is_archived
                  ? <ArchiveX className="h-3.5 w-3.5" />
                  : <Archive className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                title="Excluir"
                onClick={onDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{timestamp}</p>

          {/* Tags row */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span
              className={cn(
                "text-[11px] px-2 py-0.5 rounded-full font-medium",
                catConfig.badgeClass
              )}
            >
              {catConfig.badge}
            </span>
            {notification.priority === "high" && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                Urgente
              </span>
            )}
            {badge && (
              <span
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full font-medium",
                  badge.className
                )}
              >
                {badge.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {notification.message && (
          <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line">
            {notification.message}
          </p>
        )}

        {notification.category === "candidatos" && (
          <Button className="gap-2" onClick={() => navigate("/rh/candidatos")}>
            Ver candidatura
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {notification.category === "timesheet" && (
          <InboxTimesheetDetail notification={notification} />
        )}

        {notification.category === "reimbursement" && (
          <InboxReimbursementDetail
            notification={notification}
            onActionComplete={onActionComplete}
            onOpenCorrectForm={onOpenCorrectForm}
            onLiveStatusLoaded={setLiveStatus}
          />
        )}

        {notification.category === "budget" && (
          <InboxBudgetDetail
            notification={notification}
            onActionComplete={onActionComplete}
          />
        )}
      </div>
    </div>
  );
}

/** Empty state shown when no notification is selected */
export function InboxDetailEmpty() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-16 text-center px-6 animate-in fade-in-0 duration-300">
      <div className="p-4 rounded-full bg-muted mb-4">
        <Inbox className="h-10 w-10 text-muted-foreground opacity-50" />
      </div>
      <p className="text-sm font-medium text-foreground">
        Selecione uma notificação
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Clique em um item à esquerda para ver os detalhes
      </p>
      <div className="mt-10 w-full flex justify-center">
        <MyProjectsWidget />
      </div>
    </div>
  );
}
