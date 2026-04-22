import { ShieldAlert, BookOpen, Bug, Wrench, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ProjectActivityCardWithRelations, ActivityCardType, CARD_TYPE_LABELS } from '@/types/projectActivity';
import { TagBadge } from '@/components/projects/activities/TagBadge';

// ── Card type icon map ───────────────────────────────────────────────────────
const CARD_TYPE_ICON: Record<ActivityCardType, React.ElementType> = {
  story:     BookOpen,
  bug:       Bug,
  tech_debt: Wrench,
  task:      CheckSquare,
};

const CARD_TYPE_COLOR: Record<ActivityCardType, string> = {
  story:     'text-blue-600 dark:text-blue-400',
  bug:       'text-red-600 dark:text-red-400',
  tech_debt: 'text-amber-600 dark:text-amber-400',
  task:      'text-muted-foreground',
};

// ── Card code helper ─────────────────────────────────────────────────────────
function getCardCode(projectName: string, cardNumber: number | null): string {
  if (cardNumber == null) return '';
  const prefix = projectName
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, 'X');
  return `${prefix}-${cardNumber}`;
}

// ── Props ────────────────────────────────────────────────────────────────────
interface ActivityCardProps {
  card: ProjectActivityCardWithRelations;
  projectName?: string;
  targetSprintLabel?: string;
  onClick?: () => void;
}

export function ActivityCard({ card, projectName, targetSprintLabel, onClick }: ActivityCardProps) {
  const assigneeName: string = card.assignee?.nome ?? '';
  const initials = assigneeName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const Icon = CARD_TYPE_ICON[card.card_type];
  const cardCode = projectName ? getCardCode(projectName, card.card_number) : '';

  return (
    <div
      className="rounded-md bg-background border border-border p-3 space-y-2 cursor-pointer hover:border-primary/40 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
            {card.title}
          </p>
          {targetSprintLabel && (
            <p className="text-[10px] text-muted-foreground mt-0.5">→ {targetSprintLabel}</p>
          )}
        </div>
        {card.is_blocked && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              </TooltipTrigger>
              {card.blocked_reason && (
                <TooltipContent side="top" className="max-w-[200px] text-xs">
                  {card.blocked_reason}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Task progress */}
      {(() => {
        const tasks = card.card_tasks ?? [];
        if (tasks.length === 0) return null;
        const done = tasks.filter((t) => t.completed_at != null).length;
        return (
          <span className={cn(
            'text-xs font-mono',
            done === tasks.length ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
          )}>
            {done}/{tasks.length} tarefas
          </span>
        );
      })()}

      {/* DoR / DoD progress */}
      {(() => {
        const dorItems = card.card_checklist?.filter((i) => i.type === 'dor') ?? [];
        const dodItems = card.card_checklist?.filter((i) => i.type === 'dod') ?? [];
        const dorChecked = dorItems.filter((i) => i.is_checked).length;
        const dodChecked = dodItems.filter((i) => i.is_checked).length;
        if (dorItems.length === 0 && dodItems.length === 0) return null;
        return (
          <div className="flex items-center gap-2">
            {dorItems.length > 0 && (
              <span className={cn(
                'text-xs font-mono',
                dorChecked === dorItems.length ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
              )}>
                DoR {dorChecked}/{dorItems.length}
              </span>
            )}
            {dodItems.length > 0 && (
              <span className={cn(
                'text-xs font-mono',
                dodChecked === dodItems.length ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
              )}>
                DoD {dodChecked}/{dodItems.length}
              </span>
            )}
          </div>
        );
      })()}

      {/* Tags row */}
      {card.card_tags && card.card_tags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {card.card_tags.slice(0, 2).map((ct) => (
            <TagBadge key={ct.tag_id} tag={ct.tag} />
          ))}
          {card.card_tags.length > 2 && (
            <span className="text-xs text-muted-foreground">
              +{card.card_tags.length - 2}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Icon replaces badge */}
          <Icon
            className={cn('h-4 w-4 shrink-0', CARD_TYPE_COLOR[card.card_type])}
            title={CARD_TYPE_LABELS[card.card_type]}
          />

          {/* Card code */}
          {cardCode && (
            <span className="text-xs text-muted-foreground font-mono">{cardCode}</span>
          )}

          {card.points != null && (
            <Badge variant="outline" className="text-xs h-5 px-1.5">
              {card.points}
            </Badge>
          )}
        </div>

        {card.assignee && (
          <Avatar className="h-6 w-6 shrink-0">
            {card.assignee.foto_url ? (
              <AvatarImage src={card.assignee.foto_url} alt={assigneeName} />
            ) : null}
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}
