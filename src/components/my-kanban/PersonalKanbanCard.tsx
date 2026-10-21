import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, AlignLeft, Bell, CalendarClock, CheckCircle2, Circle, Link2 } from 'lucide-react';
import { PersonalKanbanCardWithTags, DueTone } from '@/types/personalKanban';
import { TagBadge } from '@/components/projects/activities/TagBadge';
import { cn } from '@/lib/utils';
import { describeDue, reminderLabel } from '@/lib/personalKanban';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PersonalKanbanCardProps {
  card: PersonalKanbanCardWithTags;
  done: boolean;
  onClick: () => void;
  onToggleDone: () => void;
  moveTargets?: { id: string; name: string }[];
  onMove?: (columnId: string) => void;
  moveDisabled?: boolean;
}

interface CardPartProps {
  card: PersonalKanbanCardWithTags;
  done: boolean;
}

const DUE_TONE: Record<DueTone, { className: string; srPrefix: string }> = {
  overdue: { className: 'bg-destructive-subtle text-destructive', srPrefix: 'Atrasado:' },
  today: { className: 'bg-warning-subtle text-warning-emphasis', srPrefix: 'Prazo:' },
  upcoming: { className: 'bg-muted text-muted-foreground', srPrefix: 'Prazo:' },
  done: { className: 'bg-muted text-muted-foreground', srPrefix: 'Prazo:' },
};

const stopPropagation = (event: React.SyntheticEvent) => event.stopPropagation();

function DueChip(props: CardPartProps) {
  const { card, done } = props;
  const { label, tone } = describeDue(card.due_date!, card.due_time, { done });
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium', DUE_TONE[tone].className)}>
      <CalendarClock className="h-3 w-3" aria-hidden />
      <span className="sr-only">{DUE_TONE[tone].srPrefix}</span>
      {label}
    </span>
  );
}

function MetaIcon(props: { icon: typeof Bell; label: string }) {
  const { icon: Icon, label } = props;
  return (
    <span className="inline-flex items-center text-muted-foreground" title={label}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function hasPendingReminder(props: CardPartProps) {
  const { card, done } = props;
  return !done && card.reminder_minutes !== null && !card.reminder_sent_at;
}

function CardMeta(props: CardPartProps) {
  const { card } = props;
  if (!card.due_date && !card.description) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 pl-6">
      {card.due_date && <DueChip {...props} />}
      {hasPendingReminder(props) && (
        <MetaIcon icon={Bell} label={`Lembrete: ${reminderLabel(card.reminder_minutes!, !!card.due_time)}`} />
      )}
      {card.description && <MetaIcon icon={AlignLeft} label="Tem descrição" />}
    </div>
  );
}

function ProjectChip(props: Pick<CardPartProps, 'card'>) {
  const activity = props.card.project_activity;
  if (!activity) return null;
  const number = activity.card_number ? ` · #${activity.card_number}` : '';
  return (
    <div className="flex items-center gap-2 pl-6">
      <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-info-subtle px-1.5 py-0.5 text-[11px] font-medium text-info-emphasis" title="Vinculado a uma atividade do projeto">
        <Link2 className="h-3 w-3 shrink-0" aria-hidden />
        <span className="sr-only">Projeto:</span>
        <span className="truncate">{activity.project?.name ?? 'Projeto'}{number}</span>
      </span>
      {activity.is_blocked && (
        <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-destructive">
          <AlertTriangle className="h-3 w-3" aria-hidden />
          Bloqueado
        </span>
      )}
    </div>
  );
}

function CardTags(props: Pick<CardPartProps, 'card'>) {
  const visible = props.card.card_tags?.slice(0, 3) ?? [];
  const extra = (props.card.card_tags?.length ?? 0) - visible.length;
  if (visible.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 pl-6">
      {visible.map((ct) => <TagBadge key={ct.tag_id} tag={ct.tag} />)}
      {extra > 0 && <span className="self-center text-[11px] text-muted-foreground">+{extra}</span>}
    </div>
  );
}

function DoneToggle(props: CardPartProps & { onToggle: () => void }) {
  const { card, done, onToggle } = props;
  return (
    <button
      type="button"
      aria-label={done ? `Reabrir "${card.title}"` : `Concluir "${card.title}"`}
      aria-pressed={done}
      className={cn(
        'mt-px shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        done ? 'text-success' : 'text-muted-foreground/60 hover:text-success',
      )}
      onPointerDown={stopPropagation}
      onClick={(event) => { event.stopPropagation(); onToggle(); }}
    >
      {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
    </button>
  );
}

function MobileMove(props: Pick<PersonalKanbanCardProps, 'card' | 'moveTargets' | 'onMove' | 'moveDisabled'>) {
  const { card, moveTargets, onMove, moveDisabled } = props;
  if (!moveTargets || !onMove) return null;
  // Sem valor controlado: o gatilho mostra sempre "Mover para…", não a coluna onde o card já está.
  return (
    <div onPointerDown={stopPropagation} onClick={stopPropagation} className="pl-6">
      <Select onValueChange={onMove} disabled={moveDisabled}>
        <SelectTrigger className="h-10 w-full border-dashed bg-transparent text-xs text-muted-foreground" aria-label={`Mover "${card.title}" para outra coluna`}>
          <SelectValue placeholder="Mover para outra coluna…" />
        </SelectTrigger>
        <SelectContent>
          {moveTargets.filter((target) => target.id !== card.column_id).map((target) => <SelectItem key={target.id} value={target.id}>{target.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PersonalKanbanCard(props: PersonalKanbanCardProps) {
  const { card, done, onClick, onToggleDone } = props;
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} {...listeners}>
      <div
        className={cn(
          'group space-y-2 rounded-lg border border-border bg-card p-3 shadow-sm transition-[border-color,box-shadow,opacity]',
          'cursor-pointer hover:border-primary/40 hover:shadow-md',
          isDragging && 'opacity-40',
        )}
        onClick={onClick}
      >
        <ProjectChip card={card} />
        <CardTags card={card} />
        <div className="flex items-start gap-2">
          <DoneToggle card={card} done={done} onToggle={onToggleDone} />
          <button
            type="button"
            className={cn(
              'min-w-0 flex-1 rounded-sm text-left text-sm font-medium leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              done && 'text-muted-foreground line-through decoration-muted-foreground/50',
            )}
            onClick={(event) => { event.stopPropagation(); onClick(); }}
          >
            <span className="line-clamp-3">{card.title}</span>
          </button>
        </div>
        <CardMeta card={card} done={done} />
        <MobileMove {...props} />
      </div>
    </div>
  );
}
