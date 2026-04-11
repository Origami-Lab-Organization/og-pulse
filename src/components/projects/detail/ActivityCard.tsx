import { AlertOctagon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ProjectActivityCardWithRelations, ActivityCardType, CARD_TYPE_LABELS } from '@/types/projectActivity';

interface ActivityCardProps {
  card: ProjectActivityCardWithRelations;
  onClick?: () => void;
}

const CARD_TYPE_BADGE: Record<ActivityCardType, string> = {
  story: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  bug: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  tech_debt: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  task: 'bg-secondary text-secondary-foreground',
};

export function ActivityCard({ card, onClick }: ActivityCardProps) {
  const assigneeName: string = card.assignee?.nome ?? '';
  const initials = assigneeName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className="rounded-md bg-background border border-border p-3 shadow-sm space-y-2 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground leading-snug line-clamp-2 flex-1">
          {card.title}
        </p>
        {card.is_blocked && (
          <AlertOctagon className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
              CARD_TYPE_BADGE[card.card_type]
            )}
          >
            {CARD_TYPE_LABELS[card.card_type]}
          </span>

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
