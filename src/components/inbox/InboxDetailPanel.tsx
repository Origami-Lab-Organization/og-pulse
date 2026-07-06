import { useState } from "react";
import { cn } from "@/lib/utils";
import { Notification } from "@/hooks/useNotifications";
import { InboxTimesheetDetail } from "./InboxTimesheetDetail";
import { InboxReimbursementDetail } from "./InboxReimbursementDetail";
import { InboxBudgetDetail } from "./InboxBudgetDetail";
import { InboxVacationDetail } from "./InboxVacationDetail";
import { CorrectionData } from "@/components/reimbursements/ReimbursementFormDialog";
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
  Palmtree,
  FolderKanban,
  Bell,
  RotateCcw,
  ArrowRight
} from "lucide-react";

// Rótulo do botão de ação primária por tipo (usa action_url da notificação).
const typeActionLabel: Record<string, string> = {
  document_available: "Ver documento",
  project_started: "Ver projeto",
  project_health_alert: "Ver projeto",
  nps_response_received: "Ver resposta",
  card_assigned: "Ver atividade"
};
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";

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
  },
  vacation_pending: {
    label: "Aprovar/Recusar",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
  },
  vacation_approved: {
    label: "Aprovada",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
  },
  vacation_rejected: {
    label: "Recusada",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  },
  vacation_partially_approved: {
    label: "Em análise",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
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
  },
  projeto: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
    icon: FolderKanban,
    badge: "Projeto",
    badgeClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
  },
  documento: {
    bg: "bg-sky-100 dark:bg-sky-900/30",
    text: "text-sky-600 dark:text-sky-400",
    icon: FileText,
    badge: "Documento",
    badgeClass:
      "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
  },
  system: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    icon: Bell,
    badge: "Sistema",
    badgeClass: "bg-muted text-muted-foreground"
  },
  vacation: {
    bg: "bg-teal-100 dark:bg-teal-900/30",
    text: "text-teal-600 dark:text-teal-400",
    icon: Palmtree,
    badge: "Férias",
    badgeClass:
      "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
  }
};

interface Props {
  notification: Notification;
  onActionComplete: () => void;
  onOpenCorrectForm: (data: CorrectionData) => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
  onRestore?: () => void;
  isTrash?: boolean;
}

export function InboxDetailPanel({
  notification,
  onActionComplete,
  onOpenCorrectForm,
  onArchive,
  onUnarchive,
  onDelete,
  onRestore,
  isTrash = false
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
              {isTrash ? (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  title="Restaurar"
                  onClick={onRestore}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <>
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
                </>
              )}
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
            {notification.metadata?.project_name && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <FolderKanban className="h-3 w-3" />
                {notification.metadata.project_name}
              </span>
            )}
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
        {notification.message &&
          (notification.message.includes("**") ? (
            <div className="text-sm text-muted-foreground mb-4 [&_p]:m-0 [&_strong]:font-semibold [&_strong]:text-foreground">
              <ReactMarkdown>{notification.message}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4 whitespace-pre-line">
              {notification.message}
            </p>
          ))}

        {notification.category === "candidatos" && (
          <Button className="gap-2" onClick={() => navigate("/rh/candidatos")}>
            Ver candidatura
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}

        {/* Ação primária genérica via action_url (document_available, project_*, card_assigned, nps).
            Sem action_url (ex.: system) → nenhum botão. */}
        {notification.action_url && typeActionLabel[notification.type] && (
          <Button className="gap-2" onClick={() => navigate(notification.action_url!)}>
            {typeActionLabel[notification.type]}
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

        {notification.category === "vacation" && (
          <InboxVacationDetail
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
    </div>
  );
}
