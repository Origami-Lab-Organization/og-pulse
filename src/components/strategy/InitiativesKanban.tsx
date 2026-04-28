import { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { X, Plus, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
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
import {
  StrategyInitiative,
  StrategyObjectiveWithKrs,
  InitiativeStatus,
  InitiativePriority,
  InitiativeEffort,
} from '@/types/strategy';
import {
  useUpdateInitiativeStatus,
  useDeleteStrategyInitiative,
  useReorderInitiatives,
} from '@/hooks/useStrategy';
import { InitiativeFormDialog } from './InitiativeFormDialog';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: { id: InitiativeStatus; label: string; color: string }[] = [
  { id: 'backlog', label: 'Backlog', color: 'text-muted-foreground' },
  { id: 'in_progress', label: 'Em andamento', color: 'text-blue-600 dark:text-blue-400' },
  { id: 'review', label: 'Em revisão', color: 'text-amber-600 dark:text-amber-400' },
  { id: 'done', label: 'Concluído', color: 'text-emerald-600 dark:text-emerald-400' },
];

const PRIORITY_CONFIG: Record<InitiativePriority, { label: string; className: string }> = {
  alta: { label: 'Alta', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  media: { label: 'Média', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  baixa: { label: 'Baixa', className: 'bg-muted text-muted-foreground' },
};

const EFFORT_LABELS: Record<InitiativeEffort, string> = { 1: 'P', 2: 'M', 3: 'G' };

// ─── Initiative Card ──────────────────────────────────────────────────────────

interface InitiativeCardProps {
  initiative: StrategyInitiative;
  isDragging?: boolean;
  isOverlay?: boolean;
  cycleIsActive: boolean;
  onDelete: () => void;
}

function InitiativeCard({ initiative, isDragging, isOverlay, cycleIsActive, onDelete }: InitiativeCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: initiative.id,
    disabled: !cycleIsActive,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(cycleIsActive ? listeners : {})}
      className={cn(
        'group relative select-none transition-all',
        cycleIsActive && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
        isOverlay && 'rotate-1 shadow-xl opacity-95 cursor-grabbing',
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Delete button */}
        {cycleIsActive && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute top-2 right-2 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        )}

        {/* Title */}
        <p className="text-sm font-medium leading-snug pr-5 line-clamp-2">{initiative.title}</p>

        {/* Objective badge */}
        {initiative.objectiveTitle && (
          <Badge
            variant="outline"
            className="text-[10px] font-medium border-violet-400 text-violet-600 dark:text-violet-400 max-w-full truncate block"
          >
            <span className="truncate">{initiative.objectiveTitle}</span>
          </Badge>
        )}

        {/* Footer row */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {initiative.priority && (
            <span
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold',
                PRIORITY_CONFIG[initiative.priority].className,
              )}
            >
              {PRIORITY_CONFIG[initiative.priority].label}
            </span>
          )}

          {initiative.effort && (
            <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
              {EFFORT_LABELS[initiative.effort]}
            </span>
          )}

          {initiative.ownerName && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
              <User className="h-2.5 w-2.5" />
              <span className="max-w-[80px] truncate">{initiative.ownerName.split(' ')[0]}</span>
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  column: (typeof COLUMNS)[number];
  initiatives: StrategyInitiative[];
  activeId: string | null;
  cycleIsActive: boolean;
  onDelete: (id: string) => void;
}

function KanbanColumn({ column, initiatives, activeId, cycleIsActive, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full min-h-[480px] rounded-lg border bg-muted/30 transition-colors',
        isOver && 'border-primary/60 border-dashed bg-primary/5',
      )}
    >
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className={cn('font-semibold text-sm', column.color)}>{column.label}</h3>
        <Badge variant="secondary" className="text-xs">
          {initiatives.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1 p-2">
        <SortableContext
          id={column.id}
          items={initiatives.map((i) => i.id)}
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
              />
            ))}
            {initiatives.length === 0 && (
              <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
                Nenhuma iniciativa
              </div>
            )}
          </div>
        </SortableContext>
      </ScrollArea>
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

interface InitiativesKanbanProps {
  initiatives: StrategyInitiative[];
  objectives: StrategyObjectiveWithKrs[];
  cycleId: string;
  cycleIsActive: boolean;
}

export function InitiativesKanban({ initiatives, objectives, cycleId, cycleIsActive }: InitiativesKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterObjectiveId, setFilterObjectiveId] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Local optimistic state so the board reorders immediately
  const [localOrder, setLocalOrder] = useState<StrategyInitiative[]>(initiatives);

  // Sync when server data changes (refetch)
  useEffect(() => { setLocalOrder(initiatives); }, [initiatives]);

  const updateStatus = useUpdateInitiativeStatus();
  const deleteInitiative = useDeleteStrategyInitiative();
  const reorderInitiatives = useReorderInitiatives();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const filtered = useMemo(() => {
    return localOrder.filter((i) => {
      if (filterObjectiveId !== 'all' && i.objectiveId !== filterObjectiveId) return false;
      if (filterPriority !== 'all' && i.priority !== filterPriority) return false;
      return true;
    });
  }, [localOrder, filterObjectiveId, filterPriority]);

  const byStatus = useMemo(() => {
    const map: Record<InitiativeStatus, StrategyInitiative[]> = {
      backlog: [],
      in_progress: [],
      review: [],
      done: [],
    };
    filtered.forEach((i) => { map[i.status].push(i); });
    // Maintain position order within each column
    Object.values(map).forEach((col) => col.sort((a, b) => a.position - b.position));
    return map;
  }, [filtered]);

  const activeInitiative = useMemo(
    () => localOrder.find((i) => i.id === activeId) ?? null,
    [activeId, localOrder],
  );

  const findColumn = (id: string): InitiativeStatus | null => {
    for (const col of COLUMNS) {
      if (col.id === id) return col.id;
      if (byStatus[col.id].some((i) => i.id === id)) return col.id;
    }
    return null;
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const activeCol = findColumn(active.id as string);
    const overCol = findColumn(over.id as string);
    if (!activeCol || !overCol || activeCol === overCol) return;

    setLocalOrder((prev) =>
      prev.map((i) => (i.id === active.id ? { ...i, status: overCol } : i)),
    );
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;

    const activeCol = findColumn(active.id as string);
    const overCol = findColumn(over.id as string);
    if (!activeCol || !overCol) return;

    const original = initiatives.find((i) => i.id === active.id);
    if (!original) return;

    if (activeCol !== overCol) {
      // Column change
      const colItems = byStatus[overCol];
      const newPosition = colItems.length;
      updateStatus.mutate({ id: active.id as string, status: overCol, position: newPosition });
      return;
    }

    // Same column — reorder
    const colItems = byStatus[activeCol];
    const oldIndex = colItems.findIndex((i) => i.id === active.id);
    const newIndex = colItems.findIndex((i) => i.id === over.id);
    if (oldIndex === newIndex) return;

    const reordered = arrayMove(colItems, oldIndex, newIndex);
    const updates = reordered.map((item, idx) => ({ id: item.id, position: idx }));

    // Apply optimistic update
    setLocalOrder((prev) => {
      const rest = prev.filter((i) => i.status !== activeCol);
      const updated = reordered.map((item, idx) => ({ ...item, position: idx }));
      return [...rest, ...updated];
    });

    reorderInitiatives.mutate(updates);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteInitiative.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {cycleIsActive && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Nova iniciativa
          </Button>
        )}

        <Select value={filterObjectiveId} onValueChange={setFilterObjectiveId}>
          <SelectTrigger className="w-52 h-8 text-sm">
            <SelectValue placeholder="Filtrar por OKR" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os objetivos</SelectItem>
            {objectives.map((obj) => (
              <SelectItem key={obj.id} value={obj.id}>
                <span className="truncate max-w-xs">{obj.title}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <SelectValue placeholder="Filtrar prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'iniciativa' : 'iniciativas'}
        </span>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-cols-[repeat(4,minmax(240px,1fr))] gap-4">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                initiatives={byStatus[col.id]}
                activeId={activeId}
                cycleIsActive={cycleIsActive}
                onDelete={setDeleteId}
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

      {/* Form Dialog */}
      <InitiativeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        objectives={objectives}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
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
