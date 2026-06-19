import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AssignedProjectCard,
  PersonalKanbanCardWithTags,
  PersonalKanbanColumnDB,
  PROJECT_TO_PERSONAL_COLUMN,
} from '@/types/personalKanban';
import {
  usePersonalKanbanColumns,
  usePersonalKanbanCards,
  useUpdatePersonalCard,
  useBatchUpdateCardPositions,
  useDeletePersonalCard,
  useAssignedProjectCards,
} from '@/hooks/usePersonalKanban';
import { PersonalKanbanColumn } from './PersonalKanbanColumn';
import { PersonalCardDetailDialog } from './PersonalCardDetailDialog';
import { ProjectCardDetailDialog } from './ProjectCardDetailDialog';
import { usePwaEnvironment } from '@/hooks/use-pwa-environment';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function PersonalKanbanBoard() {
  const { data: columnsData, isLoading: colLoading } = usePersonalKanbanColumns();
  const { data: cardsData, isLoading: cardsLoading } = usePersonalKanbanCards();
  const { data: projectCardsData, isLoading: projLoading } = useAssignedProjectCards();
  const updateCard = useUpdatePersonalCard();
  const batchUpdateCards = useBatchUpdateCardPositions();
  const deleteCard = useDeletePersonalCard();
  const { isMobile, isOnline } = usePwaEnvironment();
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  const columns = useMemo(() => columnsData ?? [], [columnsData]);
  const cards = useMemo(() => cardsData ?? [], [cardsData]);
  const projectCards = useMemo(() => projectCardsData ?? [], [projectCardsData]);

  const [localColumns, setLocalColumns] = useState<PersonalKanbanColumnDB[]>([]);
  const [localCards, setLocalCards] = useState<PersonalKanbanCardWithTags[]>([]);
  const [activeCard, setActiveCard] = useState<PersonalKanbanCardWithTags | null>(null);
  const [selectedCard, setSelectedCard] = useState<PersonalKanbanCardWithTags | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProjectCard, setSelectedProjectCard] = useState<AssignedProjectCard | null>(null);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  useEffect(() => { setLocalColumns(columns); }, [columns]);
  useEffect(() => { if (!activeColumnId && columns[0]) setActiveColumnId(columns[0].id); }, [activeColumnId, columns]);
  useEffect(() => { setLocalCards(cards); }, [cards]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const byColumn = useMemo(() =>
    localColumns.reduce<Record<string, PersonalKanbanCardWithTags[]>>((acc, col) => {
      acc[col.id] = localCards
        .filter((c) => c.column_id === col.id)
        .sort((a, b) => a.position - b.position);
      return acc;
    }, {}),
    [localColumns, localCards],
  );

  const byColumnProjectCards = useMemo(() =>
    localColumns.reduce<Record<string, AssignedProjectCard[]>>((acc, col) => {
      acc[col.id] = projectCards.filter(
        (pc) => PROJECT_TO_PERSONAL_COLUMN[pc.column_name] === col.name,
      );
      return acc;
    }, {}),
    [localColumns, projectCards],
  );

  const handleDragStart = (event: DragStartEvent) => {
    const card = localCards.find((c) => c.id === event.active.id);
    if (card) setActiveCard(card);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    if (!over) return;

    const cardId = active.id as string;
    const card = localCards.find((c) => c.id === cardId);
    if (!card) return;

    let targetColId: string;
    if (localColumns.some((col) => col.id === over.id)) {
      targetColId = over.id as string;
    } else {
      const overCard = localCards.find((c) => c.id === over.id);
      if (!overCard) return;
      targetColId = overCard.column_id;
    }

    const sourceColId = card.column_id;

    if (sourceColId === targetColId) {
      const colCards = byColumn[sourceColId] ?? [];
      const oldIndex = colCards.findIndex((c) => c.id === cardId);
      const overCard = localCards.find((c) => c.id === over.id);
      const newIndex = overCard && overCard.column_id === sourceColId
        ? colCards.findIndex((c) => c.id === overCard.id)
        : colCards.length - 1;

      if (oldIndex === newIndex) return;

      const reordered = arrayMove(colCards, oldIndex, newIndex);
      setLocalCards((prev) => {
        const others = prev.filter((c) => c.column_id !== sourceColId);
        return [...others, ...reordered.map((c, i) => ({ ...c, position: i }))];
      });
      batchUpdateCards.mutate(reordered.map((c, i) => ({ id: c.id, position: i, column_id: c.column_id })));
    } else {
      const targetCards = byColumn[targetColId] ?? [];
      const newPosition = targetCards.length;

      setLocalCards((prev) =>
        prev.map((c) =>
          c.id === cardId ? { ...c, column_id: targetColId, position: newPosition } : c,
        ),
      );
      updateCard.mutate({ id: cardId, updates: { column_id: targetColId, position: newPosition } });
    }
  };

  const handleCardClick = (card: PersonalKanbanCardWithTags) => {
    setSelectedCard(card);
    setDialogOpen(true);
  };

  const handleCardDelete = (cardId: string) => {
    if (!isOnline) { toast.error('Sem conexão. Reconecte para salvar.'); return; }
    deleteCard.mutate(cardId);
  };

  const handleMobileMove = (cardId: string, columnId: string) => {
    if (!isOnline) { toast.error('Sem conexão. Reconecte para salvar.'); return; }
    const card = localCards.find((item) => item.id === cardId);
    if (!card || card.column_id === columnId) return;
    const previous = localCards;
    const position = (byColumn[columnId] ?? []).length;
    setLocalCards((items) => items.map((item) => item.id === cardId ? { ...item, column_id: columnId, position } : item));
    updateCard.mutate({ id: cardId, updates: { column_id: columnId, position } }, {
      onError: () => { setLocalCards(previous); toast.error('Não foi possível mover o card.'); },
    });
  };

  const boardHeight = 'h-[calc(100dvh-220px)]';
  const isLoading = colLoading || cardsLoading || projLoading;

  if (isLoading) {
    return (
      <div className={`flex gap-4 ${boardHeight}`}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="min-w-[280px] flex-shrink-0 h-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={isMobile ? [] : sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {isMobile && <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Colunas do Kanban">
          {localColumns.map((column) => <Button key={column.id} role="tab" aria-selected={activeColumnId === column.id} variant={activeColumnId === column.id ? 'default' : 'outline'} size="sm" className="min-h-10 shrink-0" onClick={() => { setActiveColumnId(column.id); document.getElementById(`kanban-column-${column.id}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center' }); }}>{column.name}</Button>)}
        </div>}
        <ScrollArea className={`w-full ${boardHeight}`}>
          <div className={`flex gap-4 pb-4 ${isMobile ? 'snap-x snap-mandatory overflow-x-auto' : 'min-w-max'} ${boardHeight}`}>
            {localColumns.map((col) => (
              <div key={col.id} id={`kanban-column-${col.id}`} className={isMobile ? 'snap-center' : ''} onPointerEnter={() => isMobile && setActiveColumnId(col.id)}>
              <PersonalKanbanColumn
                column={col}
                cards={byColumn[col.id] ?? []}
                projectCards={byColumnProjectCards[col.id] ?? []}
                onCardClick={handleCardClick}
                onCardDelete={handleCardDelete}
                onProjectCardClick={(card) => {
                  setSelectedProjectCard(card);
                  setProjectDialogOpen(true);
                }}
                mobile={isMobile}
                moveTargets={localColumns.map(({ id, name }) => ({ id, name }))}
                onMoveCard={handleMobileMove}
                moveDisabled={!isOnline}
              />
              </div>
            ))}
          </div>
          {!isMobile && <ScrollBar orientation="horizontal" />}
        </ScrollArea>

        <DragOverlay>
          {activeCard && (
            <div className="rounded-md border border-primary/40 bg-background px-3 py-2.5 shadow-lg w-[268px] opacity-90">
              <p className="text-sm leading-snug line-clamp-2">{activeCard.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <PersonalCardDetailDialog
        card={selectedCard}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setSelectedCard(null);
        }}
      />

      <ProjectCardDetailDialog
        card={selectedProjectCard}
        open={projectDialogOpen}
        onOpenChange={(open) => {
          setProjectDialogOpen(open);
          if (!open) setSelectedProjectCard(null);
        }}
      />
    </>
  );
}
