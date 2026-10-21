import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { toast } from 'sonner';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { AssignedProjectCard, PendingDodMove, PersonalKanbanCardWithTags, PersonalKanbanColumnDB, ProjectFilter } from '@/types/personalKanban';
import { usePersonalKanbanSettings } from '@/hooks/usePersonalKanban';
import { useCardMoves, useLocalBoard, type CardMoves, type LocalBoard } from '@/hooks/usePersonalKanbanBoard';
import { usePwaEnvironment } from '@/hooks/use-pwa-environment';
import { PersonalKanbanColumn } from './PersonalKanbanColumn';
import { PersonalCardDetailDialog } from './PersonalCardDetailDialog';
import { ProjectCardDetailDialog } from './ProjectCardDetailDialog';
import { PersonalKanbanSettingsSheet } from './PersonalKanbanSettingsSheet';
import { PersonalArchivedCardsSheet } from './PersonalArchivedCardsSheet';
import { PersonalKanbanToolbar } from './PersonalKanbanToolbar';

const BOARD_HEIGHT = 'h-[calc(100dvh-268px)]';

function BoardSkeleton() {
  return (
    <div className="flex gap-4">
      {[1, 2, 3].map((i) => <Skeleton key={i} className="h-72 w-[300px] shrink-0 rounded-xl" />)}
    </div>
  );
}

function MobileColumnTabs(props: { columns: PersonalKanbanColumnDB[]; activeColumnId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Colunas do Kanban">
      {props.columns.map((column) => {
        const active = props.activeColumnId === column.id;
        return (
          <Button key={column.id} role="tab" aria-selected={active} variant={active ? 'default' : 'outline'} size="sm" className="min-h-10 shrink-0" onClick={() => props.onSelect(column.id)}>
            {column.name}
          </Button>
        );
      })}
    </div>
  );
}

// Mesmo aviso do board do projeto: Done com checklist incompleto pede confirmação, não bloqueia.
function DodConfirmDialog(props: { pending: PendingDodMove | null; onConfirm: () => void; onCancel: () => void }) {
  return (
    <AlertDialog open={!!props.pending} onOpenChange={(open) => !open && props.onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Checklist de Done incompleto</AlertDialogTitle>
          <AlertDialogDescription>
            "{props.pending?.cardTitle}" tem itens de Done não marcados no projeto. Concluir assim mesmo? A atividade vai para Done no board do projeto.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={props.onConfirm}>Concluir assim mesmo</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Notificação de lembrete abre /my-kanban?card=<id>: abre o card e limpa a URL.
function useCardDeepLink(cards: PersonalKanbanCardWithTags[], ready: boolean, openCard: (id: string) => void) {
  const [searchParams, setSearchParams] = useSearchParams();
  const cardId = searchParams.get('card');

  useEffect(() => {
    if (!cardId || !ready) return;
    if (cards.some((card) => card.id === cardId)) openCard(cardId);
    else toast.info('Esse card não está mais no board: pode ter sido arquivado ou excluído.');
    const next = new URLSearchParams(searchParams);
    next.delete('card');
    setSearchParams(next, { replace: true });
  }, [cardId, ready, cards, openCard, searchParams, setSearchParams]);
}

interface BoardColumnsAreaProps {
  board: LocalBoard;
  moves: CardMoves;
  isMobile: boolean;
  isOnline: boolean;
  onOpenCard: (id: string) => void;
  onOpenProjectCard: (card: AssignedProjectCard) => void;
  onConfigure: () => void;
}

function BoardColumnsArea(props: BoardColumnsAreaProps) {
  const { board, moves, isMobile } = props;
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const draggingCard = board.cards.find((card) => card.id === draggingCardId);
  const moveTargets = board.columns.map(({ id, name }) => ({ id, name }));

  const selectColumn = (id: string) => {
    setActiveColumnId(id);
    document.getElementById(`kanban-column-${id}`)?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggingCardId(null);
    if (over) moves.dropCard(String(active.id), String(over.id));
  };

  return (
    <DndContext
      sensors={isMobile ? [] : sensors}
      collisionDetection={closestCorners}
      onDragStart={(event: DragStartEvent) => setDraggingCardId(String(event.active.id))}
      onDragEnd={handleDragEnd}
    >
      {isMobile && <MobileColumnTabs columns={board.columns} activeColumnId={activeColumnId ?? board.columns[0]?.id ?? null} onSelect={selectColumn} />}
      <ScrollArea className={cn('w-full', BOARD_HEIGHT)}>
        <div className={cn('flex items-start gap-4 pb-4', BOARD_HEIGHT, isMobile ? 'snap-x snap-mandatory overflow-x-auto' : 'min-w-max')}>
          {board.columns.map((column) => (
            <div key={column.id} id={`kanban-column-${column.id}`} className="flex max-h-full snap-center">
              <PersonalKanbanColumn
                column={column}
                cards={board.visibleByColumn[column.id] ?? []}
                projectCards={board.visibleProjectByColumn[column.id] ?? []}
                onCardClick={(card) => props.onOpenCard(card.id)}
                onToggleDone={moves.toggleDone}
                onProjectCardClick={props.onOpenProjectCard}
                onConfigure={props.onConfigure}
                mobile={isMobile}
                moveTargets={moveTargets}
                onMoveCard={(cardId, columnId) => moves.moveCard(cardId, columnId, moves.nextPosition(columnId))}
                moveDisabled={!props.isOnline}
              />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <DragOverlay>
        {draggingCard && (
          <div className="w-[284px] rotate-1 rounded-lg border border-primary/40 bg-card p-3 shadow-lg">
            <p className="line-clamp-2 text-sm font-medium leading-snug">{draggingCard.title}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

export function PersonalKanbanBoard() {
  const [filter, setFilter] = useState<ProjectFilter>({ kind: 'all' });
  const board = useLocalBoard(filter);
  const { data: settings } = usePersonalKanbanSettings();
  const { isMobile, isOnline } = usePwaEnvironment();
  const moves = useCardMoves(board, isOnline);

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedProjectCard, setSelectedProjectCard] = useState<AssignedProjectCard | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const cardCountByColumn = Object.fromEntries(Object.entries(board.byColumn).map(([id, items]) => [id, items.length]));
  const selectedCard = board.cards.find((card) => card.id === selectedCardId) ?? null;
  const openCard = useCallback((id: string) => setSelectedCardId(id), []);

  useCardDeepLink(board.cards, !board.loading, openCard);

  if (board.loading) return <BoardSkeleton />;

  return (
    <>
      <PersonalKanbanToolbar
        summary={board.summary}
        filter={filter}
        projectOptions={board.projectOptions}
        onFilterChange={setFilter}
        onArchived={() => setArchivedOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />
      <BoardColumnsArea
        board={board}
        moves={moves}
        isMobile={isMobile}
        isOnline={isOnline}
        onOpenCard={openCard}
        onOpenProjectCard={setSelectedProjectCard}
        onConfigure={() => setSettingsOpen(true)}
      />

      <PersonalCardDetailDialog
        card={selectedCard}
        columns={board.columns}
        settings={settings}
        getNextPosition={moves.nextPosition}
        open={!!selectedCard}
        onOpenChange={(open) => !open && setSelectedCardId(null)}
      />
      <ProjectCardDetailDialog
        card={selectedProjectCard}
        columns={board.columns}
        open={!!selectedProjectCard}
        onOpenChange={(open) => !open && setSelectedProjectCard(null)}
      />
      <DodConfirmDialog pending={moves.pendingDod} onConfirm={moves.confirmPendingDod} onCancel={moves.cancelPendingDod} />
      <PersonalKanbanSettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} columns={board.columns} cardCountByColumn={cardCountByColumn} />
      <PersonalArchivedCardsSheet open={archivedOpen} onOpenChange={setArchivedOpen} columns={board.columns} />
    </>
  );
}
