import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  ArrowRight,
  Pencil,
  FileText,
  FileEdit,
  Unlink,
  Archive,
  ArchiveRestore,
  Trophy,
  XCircle,
  History,
  CalendarClock,
  Sprout,
  Undo2,
} from 'lucide-react';
import { getStageLabel } from '@/types/lead';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeadTimeline, TimelineItem } from '@/hooks/useLeadTimeline';
import { useEmployees } from '@/hooks/useEmployees';
import { LeadActivityType, LeadActivityWithCreator } from '@/services/leadActivityService';
import { LeadInteraction, CHANNEL_LABELS } from '@/hooks/useLeadInteractions';
import { LeadFollowUp } from '@/hooks/useLeadFollowUps';
import { getFollowUpVisualStatus, FOLLOW_UP_STATUS_LABEL, FollowUpVisualStatus } from '@/lib/followUps';
import { LeadAttachmentLink } from './LeadAttachmentLink';
import { cn } from '@/lib/utils';

interface LeadActivityTimelineProps {
  leadId: string;
}

// Ícone por tipo automático — cor sempre neutra (atividade de sistema = ruído de fundo, GP-J5 CA-02).
const ACTIVITY_ICON: Record<LeadActivityType, typeof Plus> = {
  created: Plus,
  stage_changed: ArrowRight,
  lead_updated: Pencil,
  budget_created: FileText,
  budget_updated: FileEdit,
  budget_unlinked: Unlink,
  archived: Archive,
  unarchived: ArchiveRestore,
  closed: Trophy,
  closed_lost: XCircle,
  moved_to_follow_up: Sprout,
  follow_up_resumed: Undo2,
  note_added: Pencil,
};

const FOLLOW_UP_BADGE_CLASSES: Record<FollowUpVisualStatus, string> = {
  pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30',
  skipped: 'bg-muted text-muted-foreground',
};

function relativeTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ptBR });
}

function fullTime(iso: string): string {
  return format(new Date(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

/** Linha da timeline: coluna do marcador (badge + fio) + conteúdo. */
function TimelineRow({
  badge,
  isLast,
  children,
}: {
  badge: React.ReactNode;
  isLast: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 relative">
      <div className="flex flex-col items-center">
        {badge}
        {!isLast && <div className="w-px bg-border flex-1 min-h-[16px]" />}
      </div>
      <div className="pb-4 flex-1 min-w-0">{children}</div>
    </div>
  );
}

/** Tipo 1 — atividade automática: ícone cinza, texto compacto. */
function AutomaticActivityItem({ activity, isLast }: { activity: LeadActivityWithCreator; isLast: boolean }) {
  const Icon = ACTIVITY_ICON[activity.activity_type] || Pencil;
  const badge = (
    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-muted shrink-0">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );

  return (
    <TimelineRow badge={badge} isLast={isLast}>
      <p className="text-xs text-muted-foreground leading-tight break-words">{activity.description}</p>

      {activity.activity_type === 'stage_changed' && activity.metadata?.from_stage && (
        <div className="flex items-center gap-1.5 mt-1">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
            {getStageLabel(activity.metadata.from_stage as string)}
          </Badge>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
            {getStageLabel(activity.metadata.to_stage as string)}
          </Badge>
        </div>
      )}

      {activity.activity_type === 'budget_updated' && activity.metadata?.change_summary && (
        <p className="text-[11px] text-muted-foreground mt-0.5 break-words">
          {activity.metadata.change_summary as string}
        </p>
      )}

      <span className="text-[11px] text-muted-foreground/80" title={fullTime(activity.created_at)}>
        {relativeTime(activity.created_at)}
        {activity.creator && ` · ${activity.creator.nome}`}
      </span>
    </TimelineRow>
  );
}

/** Tipo 2 — comentário manual: avatar colorido + texto completo + anexos. */
function CommentItem({ comment, isLast }: { comment: LeadInteraction; isLast: boolean }) {
  const initial = comment.creator?.nome?.charAt(0).toUpperCase() ?? '?';
  const badge = (
    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
      {initial}
    </div>
  );
  const attachments = comment.attachments ?? [];

  return (
    <TimelineRow badge={badge} isLast={isLast}>
      <div className="flex items-center gap-2 flex-wrap">
        {comment.creator && <span className="text-sm font-medium">{comment.creator.nome}</span>}
        {comment.channel && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
            {CHANNEL_LABELS[comment.channel] ?? comment.channel}
          </Badge>
        )}
      </div>

      <p className="text-sm leading-snug mt-1 whitespace-pre-wrap break-words">{comment.message}</p>

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {attachments.map((att) => (
            <LeadAttachmentLink key={att.path} attachment={att} />
          ))}
        </div>
      )}

      <span className="text-[11px] text-muted-foreground/80 block mt-1" title={fullTime(comment.created_at)}>
        {relativeTime(comment.created_at)}
      </span>
    </TimelineRow>
  );
}

/** Tipo 3 — follow-up: ícone de calendário + badge de status. */
function FollowUpItem({ followUp, isLast, creatorName }: { followUp: LeadFollowUp; isLast: boolean; creatorName: string | null }) {
  const status = getFollowUpVisualStatus(followUp);
  const badge = (
    <div
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
        FOLLOW_UP_BADGE_CLASSES[status],
      )}
    >
      <CalendarClock className="h-4 w-4" />
    </div>
  );

  return (
    <TimelineRow badge={badge} isLast={isLast}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium">Follow-up</span>
        <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0 h-5', FOLLOW_UP_BADGE_CLASSES[status])}>
          {FOLLOW_UP_STATUS_LABEL[status]}
        </Badge>
      </div>
      <p className="text-sm leading-snug mt-1 break-words">{followUp.description}</p>
      <span className="text-[11px] text-muted-foreground block" title={fullTime(followUp.scheduled_at)}>
        Agendado para {fullTime(followUp.scheduled_at)}
      </span>
      <span className="text-[11px] text-muted-foreground/80" title={fullTime(followUp.created_at)}>
        criado {relativeTime(followUp.created_at)}
        {creatorName && ` · ${creatorName}`}
      </span>
    </TimelineRow>
  );
}

function TimelineEntry({
  item,
  isLast,
  nameOf,
}: {
  item: TimelineItem;
  isLast: boolean;
  nameOf: (id: string | null) => string | null;
}) {
  if (item.kind === 'comment') return <CommentItem comment={item.comment} isLast={isLast} />;
  if (item.kind === 'followup')
    return <FollowUpItem followUp={item.followUp} isLast={isLast} creatorName={nameOf(item.followUp.created_by)} />;
  return <AutomaticActivityItem activity={item.activity} isLast={isLast} />;
}

export function LeadActivityTimeline({ leadId }: LeadActivityTimelineProps) {
  const { items, isLoading } = useLeadTimeline(leadId);
  const { data: employees = [] } = useEmployees();
  const nameOf = (id: string | null) => (id ? employees.find((e) => e.id === id)?.nome ?? null : null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="space-y-1 flex-1">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <History className="h-8 w-8 mb-2" />
        <p className="text-sm">Nenhuma atividade registrada ainda.</p>
        <p className="text-xs mt-1">O histórico começará a ser registrado automaticamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-0 pr-2">
      {items.map((item, index) => (
        <TimelineEntry key={`${item.kind}-${item.id}`} item={item} isLast={index === items.length - 1} nameOf={nameOf} />
      ))}
    </div>
  );
}
