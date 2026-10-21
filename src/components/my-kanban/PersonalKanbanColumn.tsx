import { useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { COLUMN_COLORS, isDoneColumn } from '@/lib/personalKanban';
import { AssignedProjectCard, PersonalKanbanCardWithTags, PersonalKanbanColumnDB } from '@/types/personalKanban';
import { useCreatePersonalCard } from '@/hooks/usePersonalKanban';
import { PersonalKanbanCard } from './PersonalKanbanCard';
import { ProjectActivityCardItem } from './ProjectActivityCardItem';

interface PersonalKanbanColumnProps {
  column: PersonalKanbanColumnDB;
  cards: PersonalKanbanCardWithTags[];
  projectCards: AssignedProjectCard[];
  onCardClick: (card: PersonalKanbanCardWithTags) => void;
  onToggleDone: (card: PersonalKanbanCardWithTags) => void;
  onProjectCardClick: (card: AssignedProjectCard) => void;
  onConfigure: () => void;
  mobile?: boolean;
  moveTargets?: { id: string; name: string }[];
  onMoveCard?: (cardId: string, columnId: string) => void;
  moveDisabled?: boolean;
}

function CardComposer(props: { columnId: string; columnName: string; onClose: () => void }) {
  const { columnId, columnName, onClose } = props;
  const createCard = useCreatePersonalCard();
  const [title, setTitle] = useState('');

  // Enter cria e mantém o campo aberto para o próximo card; sair do campo salva o que houver.
  const submit = (keepOpen: boolean) => {
    const trimmed = title.trim();
    if (!trimmed) { onClose(); return; }
    createCard.mutate({ column_id: columnId, title: trimmed }, {
      onSuccess: () => { setTitle(''); if (!keepOpen) onClose(); },
    });
  };

  return (
    <Input
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      placeholder="O que precisa ser feito?"
      aria-label={`Novo card em ${columnName}`}
      className="h-9 bg-card text-sm"
      autoFocus
      disabled={createCard.isPending}
      onKeyDown={(event) => {
        if (event.key === 'Enter') submit(true);
        if (event.key === 'Escape') onClose();
      }}
      onBlur={() => submit(false)}
    />
  );
}

function ColumnHeader(props: { column: PersonalKanbanColumnDB; count: number; onAdd: () => void; onConfigure: () => void }) {
  const { column, count, onAdd, onConfigure } = props;
  return (
    <header className="flex items-center gap-2 px-3 pb-2 pt-3">
      <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', COLUMN_COLORS[column.color].dot)} aria-hidden />
      <h2 className="truncate text-sm font-semibold text-foreground">{column.name}</h2>
      <span className="text-xs tabular-nums text-muted-foreground" aria-label={`${count} cards`}>{count}</span>
      <div className="ml-auto flex items-center">
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Adicionar card em ${column.name}`} onClick={onAdd}>
          <Plus className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Opções da coluna ${column.name}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onConfigure}>Configurar colunas</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function EmptyColumn(props: { done: boolean }) {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
      {props.done ? 'O que você concluir aparece aqui.' : 'Nada por aqui. Arraste um card ou adicione um novo.'}
    </div>
  );
}

function ColumnCards(props: PersonalKanbanColumnProps & { done: boolean }) {
  const { cards, projectCards, mobile, done } = props;
  return (
    <>
      <SortableContext items={cards.map((card) => card.id)} strategy={verticalListSortingStrategy}>
        {cards.map((card) => (
          <PersonalKanbanCard
            key={card.id}
            card={card}
            done={done}
            onClick={() => props.onCardClick(card)}
            onToggleDone={() => props.onToggleDone(card)}
            moveTargets={mobile ? props.moveTargets : undefined}
            onMove={mobile ? (columnId) => props.onMoveCard?.(card.id, columnId) : undefined}
            moveDisabled={props.moveDisabled}
          />
        ))}
      </SortableContext>
      {projectCards.map((projectCard) => (
        <ProjectActivityCardItem key={projectCard.id} card={projectCard} onClick={() => props.onProjectCardClick(projectCard)} />
      ))}
    </>
  );
}

export function PersonalKanbanColumn(props: PersonalKanbanColumnProps) {
  const { column, cards, projectCards, mobile } = props;
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [composing, setComposing] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const done = isDoneColumn(column);
  const isEmpty = cards.length + projectCards.length === 0;

  const openComposer = () => {
    setComposing(true);
    requestAnimationFrame(() => bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }));
  };

  return (
    <section
      aria-label={`Coluna ${column.name}`}
      className={cn(
        'flex max-h-full shrink-0 flex-col rounded-xl border border-border/70 bg-muted/50',
        mobile ? 'w-[calc(100vw-2rem)] snap-center' : 'w-[300px]',
      )}
    >
      <ColumnHeader column={column} count={cards.length + projectCards.length} onAdd={openComposer} onConfigure={props.onConfigure} />

      <div
        ref={(node) => { setNodeRef(node); bodyRef.current = node; }}
        className={cn(
          'mx-1 flex min-h-[88px] flex-col gap-2 overflow-y-auto rounded-lg px-1 pb-2 transition-colors',
          isOver && 'bg-accent-subtle',
        )}
      >
        <ColumnCards {...props} done={done} />
        {isEmpty && !composing && <EmptyColumn done={done} />}
        {composing && <CardComposer columnId={column.id} columnName={column.name} onClose={() => setComposing(false)} />}
      </div>

      {!composing && (
        <div className="px-2 pb-2">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-1.5 text-muted-foreground hover:text-foreground" onClick={openComposer}>
            <Plus className="h-4 w-4" />
            Adicionar card
          </Button>
        </div>
      )}
    </section>
  );
}
