import { type MouseEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CalendarDays, Plus, User, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getStrategyInitiativeBadgeClass } from '@/lib/strategyInitiativeBadge';
import { cn } from '@/lib/utils';
import {
  InitiativeStatus,
  StrategyInitiative,
  StrategyObjectiveWithKrs,
} from '@/types/strategy';
import {
  useDeleteStrategyInitiative,
  useReorderInitiatives,
  useUpdateInitiativeStatus,
} from '@/hooks/useStrategy';
import { InitiativeDetailDialog } from './InitiativeDetailDialog';
import { InitiativeFormDialog } from './InitiativeFormDialog';

const EMPTY_OWNER_FILTER = '__unassigned__';

const COLUMNS: { id: InitiativeStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'text-muted-foreground' },
  { id: 'in_progress', label: 'Em andamento', color: 'text-blue-600 dark:text-blue-400' },
  { id: 'review', label: 'Em revisão', color: 'text-amber-600 dark:text-amber-400' },
  { id: 'done', label: 'Concluído', color: 'text-emerald-600 dark:text-emerald-400' },
];

function formatDueDate(date: string | null) {
  if (!date) return null;
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface InitiativeCardProps {
  initiative: StrategyInitiative;
  isDragging?: boolean;
  isOverlay?: boolean;
  cycleIsActive: boolean;
  onDelete: () => void;
  onOpen?: () => void;
}

function InitiativeCard({
  initiative,
  isDragging,
  isOverlay,
  cycleIsActive,
  onDelete,
  onOpen,
}: InitiativeCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: initiative.id,
    disabled: !cycleIsActive,
  });
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);
  const dueDateLabel = formatDueDate(initiative.dueDate);
  const initiativeBadgeClass = getStrategyInitiativeBadgeClass(
    initiative.objectiveId ?? initiative.objectiveTitle ?? initiative.id,
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handlePointerDownCapture = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    pointerDownRef.current = { x: event.clientX, y: event.clientY };
    movedRef.current = false;
  };

  const handlePointerMoveCapture = (event: PointerEvent<HTMLDivElement>) => {
    if (!pointerDownRef.current) return;

    const dx = Math.abs(event.clientX - pointerDownRef.current.x);
    const dy = Math.abs(event.clientY - pointerDownRef.current.y);
    if (dx > 5 || dy > 5) {
      movedRef.current = true;
    }
  };

  const resetPointerState = () => {
    pointerDownRef.current = null;
    movedRef.current = false;
  };

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) {
      resetPointerState();
      return;
    }
    if (!onOpen || isOverlay || isDragging || movedRef.current) {
      resetPointerState();
      return;
    }

    onOpen();
    resetPointerState();
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(cycleIsActive ? listeners : {})}
      onPointerDownCapture={handlePointerDownCapture}
      onPointerMoveCapture={handlePointerMoveCapture}
      onPointerCancelCapture={resetPointerState}
      onClickCapture={handleClickCapture}
      className={cn(
        'group relative select-none transition-all hover:border-primary/40',
        cycleIsActive && 'cursor-grab active:cursor-grabbing',
        onOpen && !isOverlay && 'cursor-pointer',
        isDragging && 'opacity-40',
        isOverlay && 'rotate-1 shadow-xl opacity-95 cursor-grabbing',
      )}
    >
      <CardContent className="space-y-2 p-3">
        {cycleIsActive && (
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="absolute right-2 top-2 hidden h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:flex"
          >
            <X className="h-3 w-3" />
          </button>
        )}

        <p className="pr-5 text-sm font-medium leading-snug line-clamp-3">{initiative.title}</p>

        {initiative.objectiveTitle && (
          <Badge
            variant="outline"
            className={cn(
              'block max-w-full truncate text-[10px] font-medium',
              initiativeBadgeClass,
            )}
          >
            <span className="truncate">{initiative.objectiveTitle}</span>
          </Badge>
        )}

        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          {dueDateLabel && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-2.5 w-2.5" />
              {dueDateLabel}
            </span>
          )}

          {initiative.ownerName && (
            <span className="inline-flex items-center gap-0.5 sm:ml-auto">
              <User className="h-2.5 w-2.5" />
              <span className="max-w-[110px] truncate">{initiative.ownerName.split(' ')[0]}</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface KanbanColumnProps {
  column: (typeof COLUMNS)[number];
  initiatives: StrategyInitiative[];
  activeId: string | null;
  cycleIsActive: boolean;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
}

function KanbanColumn({
  column,
  initiatives,
  activeId,
  cycleIsActive,
  onDelete,
  onOpen,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full min-h-[480px] flex-col rounded-lg border bg-muted/30 transition-colors',
        isOver && 'border-primary/60 border-dashed bg-primary/5',
      )}
    >
      <div className="flex items-center justify-between border-b p-3">
        <h3 className={cn('text-sm font-semibold', column.color)}>{column.label}</h3>
        <Badge variant="secondary" className="text-xs">
          {initiatives.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1 p-2">
        <SortableContext
          id={column.id}
          items={initiatives.map((initiative) => initiative.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {initiatives.map((initiative) => (
              <InitiativeCard
                key={initiative.id}
                initiative={initiative}
                isDragging={activeId === initiative.id}
                cycleIsActive={cycleIsActive}
                onDelete={() => onDelete(initiative.id)}
                onOpen={() => onOpen(initiative.id)}
              />
            ))}
            {initiatives.length === 0 && (
              <div className="flex h-20 items-center justify-center text-xs text-muted-foreground">
                Nenhuma iniciativa
              </div>
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}

interface InitiativesKanbanProps {
  initiatives: StrategyInitiative[];
  objectives: StrategyObjectiveWithKrs[];
  cycleId: string;
  cycleIsActive: boolean;
}

export function InitiativesKanban({
  initiatives,
  objectives,
  cycleId: _cycleId,
  cycleIsActive,
}: InitiativesKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingInitiativeId, setEditingInitiativeId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterObjectiveId, setFilterObjectiveId] = useState<string>('all');
  const [filterOwnerId, setFilterOwnerId] = useState<string>('all');
  const [localOrder, setLocalOrder] = useState<StrategyInitiative[]>(initiatives);

  useEffect(() => {
    setLocalOrder(initiatives);
  }, [initiatives]);

  useEffect(() => {
    if (detailId && !localOrder.some((initiative) => initiative.id === detailId)) {
      setDetailId(null);
    }
  }, [detailId, localOrder]);

  useEffect(() => {
    if (editingInitiativeId && !localOrder.some((initiative) => initiative.id === editingInitiativeId)) {
      setEditingInitiativeId(null);
      setFormOpen(false);
    }
  }, [editingInitiativeId, localOrder]);

  const updateStatus = useUpdateInitiativeStatus();
  const deleteInitiative = useDeleteStrategyInitiative();
  const reorderInitiatives = useReorderInitiatives();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const ownerOptions = useMemo(() => {
    const owners = new Map<string, string>();
    let hasUnassigned = false;

    localOrder.forEach((initiative) => {
      if (!initiative.ownerId) {
        hasUnassigned = true;
        return;
      }

      owners.set(initiative.ownerId, initiative.ownerName ?? 'Dono removido');
    });

    return {
      hasUnassigned,
      owners: [...owners.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    };
  }, [localOrder]);

  const filtered = useMemo(
    () =>
      localOrder.filter((initiative) => {
        if (filterObjectiveId !== 'all' && initiative.objectiveId !== filterObjectiveId) {
          return false;
        }
        if (filterOwnerId === EMPTY_OWNER_FILTER && initiative.ownerId) {
          return false;
        }
        if (
          filterOwnerId !== 'all' &&
          filterOwnerId !== EMPTY_OWNER_FILTER &&
          initiative.ownerId !== filterOwnerId
        ) {
          return false;
        }
        return true;
      }),
    [filterObjectiveId, filterOwnerId, localOrder],
  );

  const byStatus = useMemo(() => {
    const grouped: Record<InitiativeStatus, StrategyInitiative[]> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    };

    filtered.forEach((initiative) => {
      grouped[initiative.status].push(initiative);
    });

    Object.values(grouped).forEach((column) => column.sort((a, b) => a.position - b.position));
    return grouped;
  }, [filtered]);

  const activeInitiative = useMemo(
    () => localOrder.find((initiative) => initiative.id === activeId) ?? null,
    [activeId, localOrder],
  );

  const detailInitiative = useMemo(
    () => localOrder.find((initiative) => initiative.id === detailId) ?? null,
    [detailId, localOrder],
  );

  const editingInitiative = useMemo(
    () => localOrder.find((initiative) => initiative.id === editingInitiativeId) ?? null,
    [editingInitiativeId, localOrder],
  );

  const findColumn = (id: string): InitiativeStatus | null => {
    for (const column of COLUMNS) {
      if (column.id === id) return column.id;
      if (byStatus[column.id].some((initiative) => initiative.id === id)) {
        return column.id;
      }
    }
    return null;
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;

    const activeColumn = findColumn(active.id as string);
    const overColumn = findColumn(over.id as string);
    if (!activeColumn || !overColumn || activeColumn === overColumn) return;

    setLocalOrder((current) =>
      current.map((initiative) =>
        initiative.id === active.id ? { ...initiative, status: overColumn } : initiative,
      ),
    );
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;

    const activeColumn = findColumn(active.id as string);
    const overColumn = findColumn(over.id as string);
    if (!activeColumn || !overColumn) return;

    const original = initiatives.find((initiative) => initiative.id === active.id);
    if (!original) return;

    if (activeColumn !== overColumn) {
      const columnItems = byStatus[overColumn];
      const newPosition = columnItems.length;
      updateStatus.mutate({
        id: active.id as string,
        status: overColumn,
        position: newPosition,
      });
      return;
    }

    const columnItems = byStatus[activeColumn];
    const oldIndex = columnItems.findIndex((initiative) => initiative.id === active.id);
    const newIndex = columnItems.findIndex((initiative) => initiative.id === over.id);
    if (oldIndex === newIndex) return;

    const reordered = arrayMove(columnItems, oldIndex, newIndex);
    const updates = reordered.map((initiative, index) => ({
      id: initiative.id,
      position: index,
    }));

    setLocalOrder((current) => {
      const rest = current.filter((initiative) => initiative.status !== activeColumn);
      const updatedColumn = reordered.map((initiative, index) => ({
        ...initiative,
        position: index,
      }));
      return [...rest, ...updatedColumn];
    });

    reorderInitiatives.mutate(updates);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteInitiative.mutate(deleteId, {
      onSuccess: () => {
        setDeleteId(null);
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {cycleIsActive && (
          <Button
            size="sm"
            onClick={() => {
              setEditingInitiativeId(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Nova iniciativa
          </Button>
        )}

        <Select value={filterObjectiveId} onValueChange={setFilterObjectiveId}>
          <SelectTrigger aria-label="Filtrar por objetivo" className="h-8 w-52 text-sm">
            <SelectValue placeholder="Filtrar por objetivo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os objetivos</SelectItem>
            {objectives.map((objective) => (
              <SelectItem key={objective.id} value={objective.id}>
                <span className="max-w-xs truncate">{objective.title}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterOwnerId} onValueChange={setFilterOwnerId}>
          <SelectTrigger aria-label="Filtrar por dono" className="h-8 w-44 text-sm">
            <SelectValue placeholder="Filtrar por dono" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os donos</SelectItem>
            {ownerOptions.owners.map((owner) => (
              <SelectItem key={owner.id} value={owner.id}>
                {owner.name}
              </SelectItem>
            ))}
            {ownerOptions.hasUnassigned && (
              <SelectItem value={EMPTY_OWNER_FILTER}>Sem dono</SelectItem>
            )}
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'iniciativa' : 'iniciativas'}
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-cols-[repeat(4,minmax(240px,1fr))] gap-4">
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                initiatives={byStatus[column.id]}
                activeId={activeId}
                cycleIsActive={cycleIsActive}
                onDelete={setDeleteId}
                onOpen={setDetailId}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeInitiative && (
            <InitiativeCard
              initiative={activeInitiative}
              isOverlay
              cycleIsActive={cycleIsActive}
              onDelete={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>

      <InitiativeFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingInitiativeId(null);
          }
        }}
        objectives={objectives}
        initiative={editingInitiative}
      />

      <InitiativeDetailDialog
        open={!!detailInitiative}
        onOpenChange={(open) => {
          if (!open) {
            setDetailId(null);
          }
        }}
        initiative={detailInitiative}
        objectives={objectives}
        cycleIsActive={cycleIsActive}
        onDelete={() => {
          if (!detailInitiative) return;
          setDetailId(null);
          setDeleteId(detailInitiative.id);
        }}
      />

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir iniciativa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
