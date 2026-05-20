import { useEffect, useRef, useState } from 'react';
import { KanbanSquare, Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ActivityColumnName, ProjectActivityCardWithRelations } from '@/types/projectActivity';
import { SortableActivityCard } from './SortableActivityCard';

interface ActivityKanbanColumnProps {
  id: ActivityColumnName;
  label: string;
  wipLimit?: number;
  cards: ProjectActivityCardWithRelations[];
  showAddButton: boolean;
  onCreateCard: (title: string) => void;
  isCreating?: boolean;
  projectName: string;
  isReadOnly: boolean;
  onCardClick: (cardId: string) => void;
  sprintNameById?: Record<string, string>;
}

export function ActivityKanbanColumn({
  id,
  label,
  wipLimit,
  cards,
  showAddButton,
  onCreateCard,
  isCreating,
  projectName,
  isReadOnly,
  onCardClick,
  sprintNameById,
}: ActivityKanbanColumnProps) {
  const [inlineOpen, setInlineOpen] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inlineOpen) inputRef.current?.focus();
  }, [inlineOpen]);

  const startInline = () => {
    setTitle('');
    setInlineOpen(true);
  };

  const cancelInline = () => {
    setTitle('');
    setInlineOpen(false);
  };

  const submitInline = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      cancelInline();
      return;
    }
    onCreateCard(trimmed);
    setTitle('');
    setInlineOpen(false);
  };

  const { setNodeRef, isOver } = useDroppable({ id });
  const cardCount = cards.length;
  const hasWip    = wipLimit != null && wipLimit > 0;
  const isAtLimit = hasWip && cardCount >= wipLimit!;

  return (
    <div className="w-[280px] flex-shrink-0 flex flex-col gap-3" style={{ height: '100%' }}>

      {/* ── Column header ── */}
      <div className="flex items-center justify-between shrink-0">
        <span className="text-sm font-medium text-foreground">{label}</span>

        {hasWip ? (
          <span
            className={cn(
              'text-xs font-medium tabular-nums',
              isAtLimit ? 'text-destructive animate-pulse' : 'text-muted-foreground'
            )}
          >
            {cardCount}/{wipLimit}
          </span>
        ) : (
          <Badge variant="secondary" className="text-xs tabular-nums">
            {cardCount}
          </Badge>
        )}
      </div>

      {/* ── Droppable body ── */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 flex-1 min-h-0 rounded-lg border p-2 overflow-y-auto transition-colors',
          isOver ? 'bg-primary/5 border-primary/30' : 'bg-muted/40 border-border'
        )}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.length === 0 && id === 'product_backlog' ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-2 text-muted-foreground">
              <KanbanSquare className="h-6 w-6 opacity-40" />
              <span className="text-xs">Nenhuma atividade</span>
            </div>
          ) : (
            cards.map((card) => (
              <SortableActivityCard
                key={card.id}
                card={card}
                projectName={projectName}
                targetSprintLabel={
                  card.target_sprint_id && sprintNameById
                    ? sprintNameById[card.target_sprint_id]
                    : undefined
                }
                disabled={isReadOnly || card.column_name === 'done'}
                onClick={() => onCardClick(card.id)}
              />
            ))
          )}
        </SortableContext>

        {showAddButton && (
          inlineOpen ? (
            <div className="mt-auto shrink-0 flex flex-col gap-2 rounded-md border border-border bg-background p-2">
              <Input
                ref={inputRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do card"
                className="h-8 text-sm"
                disabled={isCreating}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitInline();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelInline();
                  }
                }}
              />
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={submitInline}
                  disabled={isCreating || !title.trim()}
                >
                  {isCreating ? 'Adicionando...' : 'Adicionar'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={cancelInline}
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground gap-1.5 mt-auto shrink-0"
              onClick={startInline}
            >
              <Plus className="h-4 w-4" />
              Card
            </Button>
          )
        )}
      </div>
    </div>
  );
}
