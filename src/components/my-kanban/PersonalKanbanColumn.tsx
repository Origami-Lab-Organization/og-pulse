import { useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { AssignedProjectCard, PersonalKanbanCardWithTags, PersonalKanbanColumnDB } from '@/types/personalKanban';
import { useCreatePersonalCard } from '@/hooks/usePersonalKanban';
import { PersonalKanbanCard } from './PersonalKanbanCard';
import { ProjectActivityCardItem } from './ProjectActivityCardItem';

interface PersonalKanbanColumnProps {
  column: PersonalKanbanColumnDB;
  cards: PersonalKanbanCardWithTags[];
  projectCards: AssignedProjectCard[];
  onCardClick: (card: PersonalKanbanCardWithTags) => void;
  onCardDelete: (cardId: string) => void;
  onProjectCardClick: (card: AssignedProjectCard) => void;
}

export function PersonalKanbanColumn({ column, cards, projectCards, onCardClick, onCardDelete, onProjectCardClick }: PersonalKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const createCard = useCreatePersonalCard();

  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');

  const cardInputRef = useRef<HTMLInputElement>(null);

  const handleAddCardSubmit = () => {
    const trimmed = newCardTitle.trim();
    if (!trimmed) {
      setShowAddCard(false);
      setNewCardTitle('');
      return;
    }
    createCard.mutate(
      { column_id: column.id, title: trimmed },
      {
        onSuccess: () => {
          setNewCardTitle('');
          setShowAddCard(false);
        },
      },
    );
  };

  return (
    <div className="min-w-[280px] flex-shrink-0 flex flex-col gap-3" style={{ height: '100%' }}>
      {/* ── Column header ── */}
      <div className="flex items-center justify-between shrink-0 gap-2">
        <span className="text-sm font-medium text-foreground select-none truncate">
          {column.name}
        </span>
        <Badge variant="secondary" className="text-xs tabular-nums shrink-0">
          {cards.length + projectCards.length}
        </Badge>
      </div>

      {/* ── Droppable body ── */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 flex-1 min-h-0 rounded-lg border p-2 overflow-y-auto transition-colors',
          isOver ? 'bg-primary/5 border-primary/30' : 'bg-muted/40 border-border',
        )}
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <PersonalKanbanCard
              key={card.id}
              card={card}
              onClick={() => onCardClick(card)}
              onDelete={() => onCardDelete(card.id)}
            />
          ))}
        </SortableContext>

        {projectCards.map((pc) => (
          <ProjectActivityCardItem
            key={pc.id}
            card={pc}
            onClick={() => onProjectCardClick(pc)}
          />
        ))}

        {/* ── Inline add card ── */}
        {showAddCard ? (
          <div className="mt-1 space-y-1.5">
            <Input
              ref={cardInputRef}
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Título do card..."
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCardSubmit();
                if (e.key === 'Escape') { setShowAddCard(false); setNewCardTitle(''); }
              }}
              onBlur={handleAddCardSubmit}
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground gap-1.5 mt-auto shrink-0"
            onClick={() => {
              setShowAddCard(true);
              setTimeout(() => cardInputRef.current?.focus(), 0);
            }}
          >
            <Plus className="h-4 w-4" />
            Card
          </Button>
        )}
      </div>
    </div>
  );
}
