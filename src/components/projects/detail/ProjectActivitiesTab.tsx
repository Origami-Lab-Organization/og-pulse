import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectWithRelations } from '@/types/project';
import {
  ACTIVITY_COLUMNS,
  COLUMN_LABELS,
  ActivityColumnName,
  ActivitySprintDB,
  ChecklistType,
  ProjectActivityCardWithRelations,
} from '@/types/projectActivity';
import {
  useProjectActivities,
  useCreateActivity,
  useMoveActivity,
  useBatchUpdatePositions,
} from '@/hooks/useProjectActivities';
import { useActivityPermissions } from '@/hooks/useActivityPermissions';
import { useActivitySettings, useActivitySprints } from '@/hooks/useActivitySprints';
import { useKanbanFilters, applyKanbanFilters } from '@/hooks/useKanbanFilters';
import { useArchivedCards } from '@/hooks/useActivityCards';
import { useToast } from '@/hooks/use-toast';
import { ActivityCard } from './ActivityCard';
import { ActivityKanbanColumn } from '@/components/projects/activities/ActivityKanbanColumn';
import { KanbanFiltersBar } from '@/components/projects/activities/KanbanFiltersBar';
import { ArchivedCardsSheet } from '@/components/projects/activities/ArchivedCardsSheet';
import { ActivityCardDetailDrawer } from '@/components/projects/activities/ActivityCardDetailDrawer';
import { ActivityErrorBoundary } from '@/components/projects/activities/ActivityErrorBoundary';
import { ActivitySettingsSheet } from '@/components/projects/activities/ActivitySettingsSheet';
import { SprintBanner } from '@/components/projects/activities/SprintBanner';
import { SprintPlanningDrawer } from '@/components/projects/activities/SprintPlanningDrawer';
import { CloseSprintDialog } from '@/components/projects/activities/CloseSprintDialog';
import { RoadmapView } from '@/components/projects/activities/RoadmapView';
import { ReleaseDetailSheet } from '@/components/projects/activities/ReleaseDetailSheet';
import { CreateReleaseDialog } from '@/components/projects/activities/CreateReleaseDialog';
import { useProjectReleases } from '@/hooks/useProjectReleases';
import { ProjectReleaseWithSprints } from '@/types/projectRelease';

// ── Default WIP limits (used when no settings row exists yet) ────────────────
const DEFAULT_WIP_LIMITS: Partial<Record<ActivityColumnName, number>> = {
  in_dev: 5,
  in_test: 5,
  in_deploy: 3,
};

const COLUMN_ORDER = ACTIVITY_COLUMNS;
const ADDABLE_COLUMNS = new Set<ActivityColumnName>(['product_backlog', 'sprint_backlog']);

// ── BacklogBySprintView ───────────────────────────────────────────────────────

interface BacklogBySprintViewProps {
  cards: ProjectActivityCardWithRelations[];
  sprints: ActivitySprintDB[];
  onCardClick: (id: string) => void;
}

function BacklogBySprintView({ cards, sprints, onCardClick }: BacklogBySprintViewProps) {
  const plannedSprints = sprints.filter((s) => s.status === 'planned');

  // Build groups: one per planned sprint + "sem sprint alvo"
  const groups: { sprintId: string | null; label: string; sublabel?: string; cards: ProjectActivityCardWithRelations[] }[] = [
    ...plannedSprints.map((s) => ({
      sprintId: s.id,
      label: s.name,
      sublabel: `${format(parseISO(s.start_date), 'dd/MM', { locale: ptBR })} – ${format(parseISO(s.end_date), 'dd/MM', { locale: ptBR })}`,
      cards: cards.filter((c) => c.target_sprint_id === s.id),
    })),
    {
      sprintId: null,
      label: 'Sem sprint alvo',
      cards: cards.filter((c) => !c.target_sprint_id),
    },
  ];

  return (
    <div className="space-y-4 mb-4">
      {groups.map((group) => {
        const totalPoints = group.cards.reduce((sum, c) => sum + (c.points ?? 0), 0);
        return (
          <div key={group.sprintId ?? '__none__'} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{group.label}</span>
              {group.sublabel && (
                <span className="text-xs text-muted-foreground">{group.sublabel}</span>
              )}
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
                {group.cards.length} card{group.cards.length !== 1 ? 's' : ''}
              </Badge>
              {totalPoints > 0 && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                  {totalPoints}pts
                </Badge>
              )}
            </div>
            {group.cards.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-1">Nenhum card previsto.</p>
            ) : (
              <div className="grid grid-cols-1 gap-1.5">
                {group.cards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm cursor-pointer hover:border-primary/40 transition-colors"
                    onClick={() => onCardClick(card.id)}
                  >
                    <span className="flex-1 leading-snug line-clamp-1">{card.title}</span>
                    {card.points != null && (
                      <Badge variant="outline" className="text-xs h-5 px-1.5 shrink-0">
                        {card.points}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────
interface ProjectActivitiesTabProps {
  project: ProjectWithRelations;
  isReadOnly: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────
export function ProjectActivitiesTab({ project, isReadOnly }: ProjectActivitiesTabProps) {
  const { data: activitiesData, isLoading } = useProjectActivities(project.id);
  // Stable reference: inline `= []` in destructuring creates a new array every render
  // when data is undefined (error / loading), which causes the localCards effect to loop.
  const activities = useMemo(() => activitiesData ?? [], [activitiesData]);
  const { data: boardSettings } = useActivitySettings(project.id);
  const { data: sprints = [] } = useActivitySprints(project.id);
  const { data: releases = [] } = useProjectReleases(project.id);
  const createActivity = useCreateActivity();
  const moveActivity = useMoveActivity();
  const batchUpdatePositions = useBatchUpdatePositions();
  const { toast } = useToast();
  const activityPermissions = useActivityPermissions(project);
  const { isAdmin, isEmployee } = activityPermissions;
  // Seguindo .harness/patterns/security.md: quando o detalhe esta em modo leitura,
  // nenhuma permissao interna de atividade deve reabrir escrita por role legado.
  const canCreateCard = activityPermissions.canCreateCard && !isReadOnly;
  const canAccessSettings = activityPermissions.canAccessSettings && !isReadOnly;
  const canMoveToProductBacklog = activityPermissions.canMoveToProductBacklog && !isReadOnly;
  const filters = useKanbanFilters();
  const { data: archivedCards = [] } = useArchivedCards(canAccessSettings ? project.id : undefined);
  const archivedCount = archivedCards.length;

  // WIP limits: from DB settings when available, else fall back to defaults
  const WIP_LIMITS: Partial<Record<ActivityColumnName, number>> = boardSettings
    ? {
        ...(boardSettings.wip_in_dev    != null ? { in_dev:    boardSettings.wip_in_dev    } : {}),
        ...(boardSettings.wip_in_test   != null ? { in_test:   boardSettings.wip_in_test   } : {}),
        ...(boardSettings.wip_in_deploy != null ? { in_deploy: boardSettings.wip_in_deploy } : {}),
      }
    : DEFAULT_WIP_LIMITS;

  // Local optimistic state for instant DnD feedback
  const [localCards, setLocalCards] = useState<ProjectActivityCardWithRelations[]>([]);
  useEffect(() => setLocalCards(activities), [activities]);

  const [view,              setView]              = useState<'kanban' | 'roadmap'>('kanban');
  const [groupBacklog,      setGroupBacklog]      = useState(false);
  const [archivedOpen,      setArchivedOpen]      = useState(false);
  const [selectedRelease,   setSelectedRelease]   = useState<ProjectReleaseWithSprints | null>(null);
  const [createReleaseOpen, setCreateReleaseOpen] = useState(false);
  const [settingsOpen,      setSettingsOpen]      = useState(false);
  const [planningOpen,      setPlanningOpen]      = useState(false);
  const [planningSprintId,  setPlanningSprintId]  = useState<string | null>(null);
  const [closeSprintOpen,   setCloseSprintOpen]   = useState(false);
  const [activeCard, setActiveCard] = useState<ProjectActivityCardWithRelations | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    cardId: string;
    targetCol: ActivityColumnName;
    position: number;
  } | null>(null);
  const [pendingCheckType, setPendingCheckType] = useState<ChecklistType | null>(null);

  const selectedCard = localCards.find((a) => a.id === selectedCardId) ?? null;

  const activeSprint        = sprints.find((s) => s.status === 'active') ?? null;
  const nextSprint          = sprints.find((s) => s.status === 'planned') ?? null;

  // Lookup map: sprint id → name (used to render "→ Sprint N" on backlog cards)
  const sprintNameById = useMemo(
    () => Object.fromEntries(sprints.map((s) => [s.id, s.name])),
    [sprints],
  );
  const planningTargetSprint = sprints.find((s) => s.id === planningSprintId) ?? null;

  const handleOpenPlanning = (sprintId: string) => {
    setPlanningSprintId(sprintId);
    setPlanningOpen(true);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Apply filters (DnD still uses full localCards for state management)
  const visibleCards = applyKanbanFilters(localCards, filters);

  // Group visible cards by column, sorted by position
  const byColumn = ACTIVITY_COLUMNS.reduce<Record<ActivityColumnName, ProjectActivityCardWithRelations[]>>(
    (acc, col) => {
      acc[col] = visibleCards
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

    // c) Sem permissão para mover de/para Product Backlog
    if (!canMoveToProductBacklog && (sourceCol === 'product_backlog' || targetCol === 'product_backlog')) {
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

    // f) DoR check ao mover de sprint_backlog → in_dev
    if (targetCol === 'in_dev' && card.column_name === 'sprint_backlog' && !isChecklistComplete(card, 'dor')) {
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
  const handleCreateCard = (col: ActivityColumnName, title: string) => {
    createActivity.mutate({
      projectId: project.id,
      title,
      columnName: col,
    });
  };

  const boardHeight = 'h-[calc(100dvh-280px)]';

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
      {/* ── View toggle (Kanban | Roadmap) ── */}
      <div className="mb-3 flex items-center gap-1 shrink-0">
        <Button
          variant={view === 'kanban' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setView('kanban')}
        >
          Kanban
        </Button>
        <Button
          variant={view === 'roadmap' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setView('roadmap')}
        >
          Roadmap
        </Button>
      </div>

      {/* ── Roadmap view ── */}
      {view === 'roadmap' && (
        <RoadmapView
          releases={releases}
          sprints={sprints}
          cards={localCards}
          canManage={canAccessSettings}
          onReleaseClick={(r) => setSelectedRelease(r)}
          onNewRelease={() => setCreateReleaseOpen(true)}
        />
      )}

      {/* ── Kanban view ── */}
      {view === 'kanban' && (
      <>

      {/* ── Sprint Banner ── */}
      <SprintBanner
        projectId={project.id}
        cards={localCards}
        isPM={canAccessSettings}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenPlanning={handleOpenPlanning}
        onCloseSprint={() => setCloseSprintOpen(true)}
      />

      <div className="mb-3 flex items-center gap-2 shrink-0">
        <KanbanFiltersBar projectId={project.id} {...filters} />

        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          <Button
            variant={groupBacklog ? 'secondary' : 'outline'}
            size="sm"
            className="h-8 text-xs font-normal"
            onClick={() => setGroupBacklog((v) => !v)}
            title="Agrupar Product Backlog por sprint alvo"
          >
            Backlog por sprint
          </Button>

          {canAccessSettings && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-normal"
              onClick={() => setArchivedOpen(true)}
            >
              Arquivados
              {archivedCount > 0 && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px] leading-none">
                  {archivedCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* ── Backlog by target sprint (grouped view) ── */}
      {groupBacklog && (
        <BacklogBySprintView
          cards={byColumn['product_backlog']}
          sprints={sprints}
          onCardClick={(id) => setSelectedCardId(id)}
        />
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className={`w-full ${groupBacklog ? 'hidden' : ''} ${boardHeight}`}>
          <div className={`flex gap-4 pb-4 min-w-max ${boardHeight}`}>
            {ACTIVITY_COLUMNS.map((col) => (
              <ActivityKanbanColumn
                key={col}
                id={col}
                label={COLUMN_LABELS[col]}
                wipLimit={WIP_LIMITS[col]}
                cards={byColumn[col]}
                showAddButton={canCreateCard && !isReadOnly && ADDABLE_COLUMNS.has(col)}
                onCreateCard={(title) => handleCreateCard(col, title)}
                isCreating={createActivity.isPending}
                projectName={project.name}
                isReadOnly={isReadOnly}
                onCardClick={(id) => setSelectedCardId(id)}
                sprintNameById={col === 'product_backlog' ? sprintNameById : undefined}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <DragOverlay>
          {activeCard && <ActivityCard card={activeCard} projectName={project.name} />}
        </DragOverlay>
      </DndContext>

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

      <ActivitySettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        project={project}
      />

      <SprintPlanningDrawer
        open={planningOpen}
        targetSprint={planningTargetSprint}
        projectId={project.id}
        cards={localCards}
        onClose={() => setPlanningOpen(false)}
      />

      {activeSprint && (
        <CloseSprintDialog
          open={closeSprintOpen}
          onOpenChange={setCloseSprintOpen}
          activeSprint={activeSprint}
          nextSprint={nextSprint}
          cards={localCards}
          projectId={project.id}
          onSuccess={(next) => {
            if (next) handleOpenPlanning(next.id);
          }}
        />
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

      {canAccessSettings && (
        <ArchivedCardsSheet
          open={archivedOpen}
          onOpenChange={setArchivedOpen}
          projectId={project.id}
          isAdmin={isAdmin}
          canManage={canAccessSettings}
        />
      )}

      </> /* end kanban <> */
      )} {/* end view === 'kanban' */}

      {/* ── Release detail sheet ── */}
      {selectedRelease && (
        <ReleaseDetailSheet
          open={!!selectedRelease}
          onOpenChange={(o) => { if (!o) setSelectedRelease(null); }}
          release={selectedRelease}
          projectId={project.id}
          sprints={sprints}
          cards={localCards}
          canManage={canAccessSettings}
        />
      )}

      <CreateReleaseDialog
        open={createReleaseOpen}
        onOpenChange={setCreateReleaseOpen}
        projectId={project.id}
      />
    </>
  );
}
