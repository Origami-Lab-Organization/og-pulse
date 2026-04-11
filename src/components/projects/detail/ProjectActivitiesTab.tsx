import { useEffect, useState } from 'react';
import { Plus, KanbanSquare } from 'lucide-react';
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
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectWithRelations } from '@/types/project';
import {
  ACTIVITY_COLUMNS,
  COLUMN_LABELS,
  ActivityColumnName,
  ChecklistType,
  CreateActivityInput,
  ProjectActivityCardWithRelations,
} from '@/types/projectActivity';
import {
  useProjectActivities,
  useCreateActivity,
  useMoveActivity,
  useBatchUpdatePositions,
} from '@/hooks/useProjectActivities';
import { useActivityPermissions } from '@/hooks/useActivityPermissions';
import { useToast } from '@/hooks/use-toast';
import { ActivityCard } from './ActivityCard';
import { SortableActivityCard } from '@/components/projects/activities/SortableActivityCard';
import { ActivityCardFormDrawer } from './ActivityCardFormDrawer';
import { ActivityCardDetailDrawer } from '@/components/projects/activities/ActivityCardDetailDrawer';
import { ActivityErrorBoundary } from '@/components/projects/activities/ActivityErrorBoundary';

// ── WIP limits per column ────────────────────────────────────────────────────
const WIP_LIMITS: Partial<Record<ActivityColumnName, number>> = {
  in_dev: 5,
  in_test: 5,
  in_deploy: 3,
};

const COLUMN_ORDER = ACTIVITY_COLUMNS;
const ADDABLE_COLUMNS = new Set<ActivityColumnName>(['product_backlog', 'sprint_backlog']);

// ── Droppable column wrapper ─────────────────────────────────────────────────
function DroppableColumn({
  id,
  children,
}: {
  id: ActivityColumnName;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col gap-2 flex-1 min-h-0 rounded-lg border p-2 overflow-y-auto transition-colors ${
        isOver ? 'bg-primary/5 border-primary/30' : 'bg-muted/40 border-border'
      }`}
    >
      {children}
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────
interface ProjectActivitiesTabProps {
  project: ProjectWithRelations;
  isReadOnly: boolean;
  canCreate: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────
export function ProjectActivitiesTab({ project, isReadOnly, canCreate }: ProjectActivitiesTabProps) {
  const { data: activities = [], isLoading } = useProjectActivities(project.id);
  const createActivity = useCreateActivity();
  const moveActivity = useMoveActivity();
  const batchUpdatePositions = useBatchUpdatePositions();
  const { toast } = useToast();
  const { isEmployee, canMoveToProductBacklog } = useActivityPermissions(project);

  // Local optimistic state for instant DnD feedback
  const [localCards, setLocalCards] = useState<ProjectActivityCardWithRelations[]>([]);
  useEffect(() => setLocalCards(activities), [activities]);

  const [activeCard, setActiveCard] = useState<ProjectActivityCardWithRelations | null>(null);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [targetColumn, setTargetColumn] = useState<ActivityColumnName>('product_backlog');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    cardId: string;
    targetCol: ActivityColumnName;
    position: number;
  } | null>(null);
  const [pendingCheckType, setPendingCheckType] = useState<ChecklistType | null>(null);

  const selectedCard = localCards.find((a) => a.id === selectedCardId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Group cards by column, sorted by position
  const byColumn = ACTIVITY_COLUMNS.reduce<Record<ActivityColumnName, ProjectActivityCardWithRelations[]>>(
    (acc, col) => {
      acc[col] = localCards
        .filter((a) => a.column_name === col)
        .sort((a, b) => a.position - b.position);
      return acc;
    },
    {} as Record<ActivityColumnName, ProjectActivityCardWithRelations[]>
  );

  // ── Checklist completeness helper ────────────────────────────────────────────
  const isChecklistComplete = (card: ProjectActivityCardWithRelations, type: ChecklistType) => {
    const items = card.card_checklist?.filter((i) => i.type === type) ?? [];
    return items.length === 0 || items.every((i) => i.is_checked);
  };

  // ── Execute confirmed move ───────────────────────────────────────────────────
  const doMove = (cardId: string, targetCol: ActivityColumnName, position: number) => {
    setLocalCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, column_name: targetCol, position } : c
      )
    );
    moveActivity.mutate({ id: cardId, projectId: project.id, columnName: targetCol, position });
  };

  // ── DnD handlers ────────────────────────────────────────────────────────────
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

    // Resolve target column
    let targetCol: ActivityColumnName;
    if (ACTIVITY_COLUMNS.includes(over.id as ActivityColumnName)) {
      targetCol = over.id as ActivityColumnName;
    } else {
      const overCard = localCards.find((c) => c.id === over.id);
      if (!overCard) return;
      targetCol = overCard.column_name;
    }

    const sourceCol = card.column_name;
    const sourceIdx = COLUMN_ORDER.indexOf(sourceCol);
    const targetIdx = COLUMN_ORDER.indexOf(targetCol);

    // a) Card em "done" não pode ser arrastado
    if (sourceCol === 'done') return;

    // ── Reordenação dentro da mesma coluna ──────────────────────────────────
    if (sourceCol === targetCol) {
      const colCards = byColumn[sourceCol];
      const oldIndex = colCards.findIndex((c) => c.id === cardId);
      const overCard = localCards.find((c) => c.id === over.id);
      const newIndex = overCard && overCard.column_name === sourceCol
        ? colCards.findIndex((c) => c.id === overCard.id)
        : colCards.length - 1;

      if (oldIndex === newIndex) return;

      const reordered = arrayMove(colCards, oldIndex, newIndex);

      // Optimistic update
      setLocalCards((prev) => {
        const others = prev.filter((c) => c.column_name !== sourceCol);
        return [...others, ...reordered.map((c, i) => ({ ...c, position: i }))];
      });

      batchUpdatePositions.mutate({
        projectId: project.id,
        cards: reordered.map((c, i) => ({ id: c.id, position: i })),
      });
      return;
    }

    // b) Salto de mais de uma coluna
    if (Math.abs(sourceIdx - targetIdx) > 1) {
      toast({
        title: 'Movimento não permitido',
        description: 'Mova apenas para a coluna adjacente.',
        variant: 'destructive',
      });
      return;
    }

    // c) Funcionário simples não pode mover de/para Product Backlog
    if (isEmployee && (sourceCol === 'product_backlog' || targetCol === 'product_backlog')) {
      toast({
        title: 'Permissão insuficiente',
        description: 'Apenas PM ou Admin podem mover cards de/para o Product Backlog.',
        variant: 'destructive',
      });
      return;
    }

    // d) WIP limit
    const wipLimit = WIP_LIMITS[targetCol];
    if (wipLimit !== undefined && byColumn[targetCol].length >= wipLimit) {
      toast({
        title: `Limite WIP atingido na coluna ${COLUMN_LABELS[targetCol]}`,
        description: `Máximo: ${wipLimit} cards.`,
        variant: 'destructive',
      });
      return;
    }

    // e) Confirmar movimento
    const newPosition = byColumn[targetCol].length;

    // f) DoR check ao mover para sprint_backlog
    if (targetCol === 'sprint_backlog' && !isChecklistComplete(card, 'dor')) {
      setPendingMove({ cardId, targetCol, position: newPosition });
      setPendingCheckType('dor');
      return;
    }

    // g) DoD check ao mover para done
    if (targetCol === 'done' && !isChecklistComplete(card, 'dod')) {
      setPendingMove({ cardId, targetCol, position: newPosition });
      setPendingCheckType('dod');
      return;
    }

    doMove(cardId, targetCol, newPosition);
  };

  // ── Create card ──────────────────────────────────────────────────────────────
  const handleAddCard = (col: ActivityColumnName) => {
    setTargetColumn(col);
    setCreateDrawerOpen(true);
  };

  const handleSubmit = (input: CreateActivityInput) => {
    createActivity.mutate(input, {
      onSuccess: () => setCreateDrawerOpen(false),
    });
  };

  const boardHeight = 'h-[calc(100dvh-240px)]';

  if (isLoading) {
    return (
      <div className={`flex gap-4 ${boardHeight}`}>
        {ACTIVITY_COLUMNS.map((col) => (
          <Skeleton key={col} className="min-w-[280px] flex-shrink-0 h-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className={`w-full ${boardHeight}`}>
          <div className={`flex gap-4 pb-4 min-w-max ${boardHeight}`}>
            {ACTIVITY_COLUMNS.map((col) => {
              const cards = byColumn[col];
              const showAddButton = canCreate && !isReadOnly && ADDABLE_COLUMNS.has(col);
              const wipLimit = WIP_LIMITS[col];

              return (
                <div
                  key={col}
                  className="min-w-[280px] flex-shrink-0 flex flex-col gap-3"
                  style={{ height: '100%' }}
                >
                  <div className="flex items-center justify-between shrink-0">
                    <span className="text-sm font-medium text-foreground">
                      {COLUMN_LABELS[col]}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {wipLimit !== undefined && (
                        <span className={`text-xs ${cards.length >= wipLimit ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                          {cards.length}/{wipLimit}
                        </span>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {cards.length}
                      </Badge>
                    </div>
                  </div>

                  <DroppableColumn id={col}>
                    <SortableContext
                      items={cards.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {cards.length === 0 && col === 'product_backlog' ? (
                        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-muted-foreground">
                          <KanbanSquare className="h-6 w-6 opacity-40" />
                          <span className="text-xs">Nenhuma atividade</span>
                        </div>
                      ) : (
                        cards.map((card) => (
                          <SortableActivityCard
                            key={card.id}
                            card={card}
                            projectName={project.name}
                            disabled={isReadOnly || card.column_name === 'done'}
                            onClick={() => setSelectedCardId(card.id)}
                          />
                        ))
                      )}
                    </SortableContext>

                    {showAddButton && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground hover:text-foreground gap-1.5 mt-auto shrink-0"
                        onClick={() => handleAddCard(col)}
                      >
                        <Plus className="h-4 w-4" />
                        Card
                      </Button>
                    )}
                  </DroppableColumn>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <DragOverlay>
          {activeCard && <ActivityCard card={activeCard} projectName={project.name} />}
        </DragOverlay>
      </DndContext>

      <ActivityCardFormDrawer
        open={createDrawerOpen}
        onOpenChange={setCreateDrawerOpen}
        project={project}
        columnName={targetColumn}
        onSubmit={handleSubmit}
        isSubmitting={createActivity.isPending}
      />

      {selectedCard && (
        <ActivityErrorBoundary onClose={() => setSelectedCardId(null)}>
          <ActivityCardDetailDrawer
            open={!!selectedCardId}
            onOpenChange={(open) => { if (!open) setSelectedCardId(null); }}
            card={selectedCard}
            project={project}
            isReadOnly={isReadOnly}
          />
        </ActivityErrorBoundary>
      )}

      {/* ── AlertDialog: DoR / DoD incompleto ── */}
      <AlertDialog
        open={!!pendingMove}
        onOpenChange={(open) => { if (!open) setPendingMove(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingCheckType === 'dor' ? 'DoR incompleto' : 'DoD incompleto'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCheckType === 'dor'
                ? 'Nem todos os critérios de Definition of Ready foram marcados. Deseja mover o card mesmo assim?'
                : 'Nem todos os critérios de Definition of Done foram marcados. Deseja mover o card mesmo assim?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingMove(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingMove) {
                  doMove(pendingMove.cardId, pendingMove.targetCol, pendingMove.position);
                }
                setPendingMove(null);
              }}
            >
              Mover assim mesmo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
