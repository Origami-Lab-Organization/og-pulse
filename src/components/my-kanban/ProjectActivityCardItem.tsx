import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssignedProjectCard } from '@/types/personalKanban';
import { CARD_TYPE_LABELS } from '@/types/projectActivity';

interface ProjectActivityCardItemProps {
  card: AssignedProjectCard;
  onClick: () => void;
}

function ProjectCardFooter(props: { card: AssignedProjectCard }) {
  const { card } = props;
  if (card.points == null && !card.is_blocked) return null;
  return (
    <div className="flex items-center gap-2">
      {card.points != null && (
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{card.points} pts</span>
      )}
      {card.is_blocked && (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
          <AlertTriangle className="h-3 w-3" aria-hidden />
          Bloqueado
        </span>
      )}
    </div>
  );
}

export function ProjectActivityCardItem(props: ProjectActivityCardItemProps) {
  const { card, onClick } = props;
  return (
    <button
      type="button"
      className={cn(
        'w-full space-y-2 rounded-lg border border-l-[3px] border-border bg-card p-3 text-left shadow-sm transition-[border-color,box-shadow]',
        'hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        card.is_blocked ? 'border-l-destructive' : 'border-l-info',
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="max-w-[180px] truncate rounded-md bg-info-subtle px-1.5 py-0.5 text-[11px] font-medium text-info-emphasis">
          {card.project?.name ?? 'Projeto'}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">{CARD_TYPE_LABELS[card.card_type]}</span>
      </div>
      <p className="line-clamp-3 text-sm font-medium leading-snug">{card.title}</p>
      <ProjectCardFooter card={card} />
    </button>
  );
}
