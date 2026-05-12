import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssignedProjectCard } from '@/types/personalKanban';
import { CARD_TYPE_LABELS } from '@/types/projectActivity';

interface ProjectActivityCardItemProps {
  card: AssignedProjectCard;
  onClick: () => void;
}

export function ProjectActivityCardItem({ card, onClick }: ProjectActivityCardItemProps) {
  return (
    <div
      className={cn(
        'relative rounded-md border border-border bg-background px-3 py-2.5 space-y-1.5',
        'cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all',
        'border-l-4',
        card.is_blocked ? 'border-l-destructive' : 'border-l-blue-500',
      )}
      onClick={onClick}
    >
      {card.project && (
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 rounded px-1.5 py-0.5 truncate max-w-[160px]">
            {card.project.name}
          </span>
          <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
            {CARD_TYPE_LABELS[card.card_type]}
          </span>
        </div>
      )}

      <p className="text-sm leading-snug line-clamp-2">{card.title}</p>

      {(card.points != null || card.is_blocked) && (
        <div className="flex items-center gap-2">
          {card.points != null && (
            <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5">
              {card.points} pts
            </span>
          )}
          {card.is_blocked && (
            <span className="inline-flex items-center gap-1 text-[10px] text-destructive">
              <AlertTriangle className="h-3 w-3" />
              Bloqueado
            </span>
          )}
        </div>
      )}
    </div>
  );
}
