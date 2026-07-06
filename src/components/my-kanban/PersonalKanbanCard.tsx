import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, X } from 'lucide-react';
import { format, parseISO, isPast, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PersonalKanbanCardWithTags } from '@/types/personalKanban';
import { TagBadge } from '@/components/projects/activities/TagBadge';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PersonalKanbanCardProps {
  card: PersonalKanbanCardWithTags;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  moveTargets?: { id: string; name: string }[];
  onMove?: (columnId: string) => void;
  moveDisabled?: boolean;
}

function DueDateBadge({ dueDate }: { dueDate: string }) {
  const date = parseISO(dueDate);
  const overdue = isPast(date) && !isToday(date);
  const dueToday = isToday(date);
  const dueTomorrow = isTomorrow(date);

  const label = dueToday
    ? 'Hoje'
    : dueTomorrow
    ? 'Amanhã'
    : format(date, 'dd/MM', { locale: ptBR });

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-medium rounded px-1.5 py-0.5',
        overdue
          ? 'bg-destructive/10 text-destructive'
          : dueToday
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          : 'bg-muted text-muted-foreground',
      )}
    >
      <CalendarDays className="h-3 w-3" />
      {label}
    </span>
  );
}

export function PersonalKanbanCard({ card, onClick, onDelete, moveTargets, onMove, moveDisabled }: PersonalKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const visibleTags = card.card_tags?.slice(0, 3) ?? [];
  const extraTags = (card.card_tags?.length ?? 0) - visibleTags.length;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div
        className={cn(
          'group relative rounded-md border border-border bg-background px-3 py-2.5 space-y-2',
          'cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all',
        )}
        onClick={onClick}
      >
        {/* Tags row */}
        {visibleTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visibleTags.map((ct) => (
              <TagBadge key={ct.tag_id} tag={ct.tag} />
            ))}
            {extraTags > 0 && (
              <span className="text-[10px] text-muted-foreground self-center">
                +{extraTags}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <p className="text-sm leading-snug line-clamp-2 pr-5">{card.title}</p>

        {/* Description */}
        {card.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{card.description}</p>
        )}

        {/* Due date */}
        {card.due_date && (
          <div>
            <DueDateBadge dueDate={card.due_date} />
          </div>
        )}

        {moveTargets && onMove && (
          <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
            <Select value={card.column_id} onValueChange={onMove} disabled={moveDisabled}>
              <SelectTrigger className="h-10 w-full text-xs" aria-label="Mover card para">
                <SelectValue placeholder="Mover para" />
              </SelectTrigger>
              <SelectContent>{moveTargets.map((target) => <SelectItem key={target.id} value={target.id}>{target.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        {/* Delete button */}
        <button
          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(e); }}
          tabIndex={-1}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
