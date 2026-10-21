import { useEffect, useMemo, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from 'sonner';
import { personalKanbanService } from '@/services/personalKanbanService';
import {
  useAssignedProjectCards,
  useBatchUpdateCardPositions,
  useMoveLinkedActivity,
  usePersonalKanbanCards,
  usePersonalKanbanColumns,
  useUpdatePersonalCard,
} from '@/hooks/usePersonalKanban';
import {
  PROJECT_TO_PERSONAL_STAGE,
  describeDue,
  firstColumnOfStage,
  isDoneColumn,
  toggleDoneTarget,
} from '@/lib/personalKanban';
import { matchesProjectFilter, planActivityMove, projectIdOfCard, projectOptionsFrom } from '@/lib/personalKanbanActivity';
import type {
  ActivityMove,
  AssignedProjectCard,
  BoardSummary,
  PendingDodMove,
  PersonalKanbanCardWithTags,
  PersonalKanbanColumnDB,
  ProjectFilter,
} from '@/types/personalKanban';

type CardsByColumn = Record<string, PersonalKanbanCardWithTags[]>;
type ProjectCardsByColumn = Record<string, AssignedProjectCard[]>;

function groupCards(columns: PersonalKanbanColumnDB[], cards: PersonalKanbanCardWithTags[]): CardsByColumn {
  return columns.reduce<CardsByColumn>((acc, column) => {
    acc[column.id] = cards.filter((card) => card.column_id === column.id).sort((a, b) => a.position - b.position);
    return acc;
  }, {});
}

// Atividade de projeto cai na primeira coluna da etapa correspondente (ADR-0050).
function groupProjectCards(columns: PersonalKanbanColumnDB[], projectCards: AssignedProjectCard[]) {
  return projectCards.reduce<ProjectCardsByColumn>((acc, projectCard) => {
    const column = firstColumnOfStage(columns, PROJECT_TO_PERSONAL_STAGE[projectCard.column_name]);
    if (column) acc[column.id] = [...(acc[column.id] ?? []), projectCard];
    return acc;
  }, {});
}

function summarize(columns: PersonalKanbanColumnDB[], cards: PersonalKanbanCardWithTags[]): BoardSummary {
  const doneIds = new Set(columns.filter((column) => isDoneColumn(column)).map((column) => column.id));
  const pending = cards.filter((card) => !doneIds.has(card.column_id));
  return pending.reduce<BoardSummary>((acc, card) => {
    if (!card.due_date) return acc;
    const { tone } = describeDue(card.due_date, card.due_time);
    return { ...acc, [tone]: (acc[tone] ?? 0) + 1 };
  }, { pending: pending.length });
}

function resolveTargetColumnId(overId: string, columns: PersonalKanbanColumnDB[], cards: PersonalKanbanCardWithTags[]) {
  if (columns.some((column) => column.id === overId)) return overId;
  return cards.find((card) => card.id === overId)?.column_id ?? null;
}

// A atividade vinculada já aparece pelo card pessoal: não repete como card de projeto.
function withoutLinked(projectCards: AssignedProjectCard[], cards: PersonalKanbanCardWithTags[]) {
  const linked = new Set(cards.map((card) => card.project_activity_card_id).filter(Boolean));
  return projectCards.filter((projectCard) => !linked.has(projectCard.projectCardId));
}

export function useLocalBoard(filter: ProjectFilter) {
  const { data: columnsData, isLoading: columnsLoading } = usePersonalKanbanColumns();
  const { data: cardsData, isLoading: cardsLoading } = usePersonalKanbanCards();
  const { data: projectCardsData, isLoading: projectLoading } = useAssignedProjectCards();
  const [columns, setColumns] = useState<PersonalKanbanColumnDB[]>([]);
  const [cards, setCards] = useState<PersonalKanbanCardWithTags[]>([]);

  useEffect(() => { setColumns(columnsData ?? []); }, [columnsData]);
  useEffect(() => { setCards(cardsData ?? []); }, [cardsData]);

  const projectCards = useMemo(() => withoutLinked(projectCardsData ?? [], cards), [projectCardsData, cards]);
  const visibleCards = useMemo(() => cards.filter((card) => matchesProjectFilter(projectIdOfCard(card), filter)), [cards, filter]);
  const visibleProjectCards = useMemo(() => projectCards.filter((card) => matchesProjectFilter(card.project_id, filter)), [projectCards, filter]);

  return {
    columns,
    cards,
    setCards,
    // Posições sempre sobre a coluna inteira; o filtro só decide o que aparece.
    byColumn: useMemo(() => groupCards(columns, cards), [columns, cards]),
    visibleByColumn: useMemo(() => groupCards(columns, visibleCards), [columns, visibleCards]),
    visibleProjectByColumn: useMemo(() => groupProjectCards(columns, visibleProjectCards), [columns, visibleProjectCards]),
    summary: useMemo(() => summarize(columns, visibleCards), [columns, visibleCards]),
    projectOptions: useMemo(() => projectOptionsFrom(cards, projectCards), [cards, projectCards]),
    loading: columnsLoading || cardsLoading || projectLoading,
  };
}

export type LocalBoard = ReturnType<typeof useLocalBoard>;

async function needsDodConfirmation(activityId: string): Promise<boolean> {
  try {
    return !(await personalKanbanService.isActivityDodComplete(activityId));
  } catch {
    return true;
  }
}

export function useCardMoves(board: LocalBoard, isOnline: boolean) {
  const { columns, cards, setCards, byColumn } = board;
  const updateCard = useUpdatePersonalCard();
  const batchUpdateCards = useBatchUpdateCardPositions();
  const moveActivity = useMoveLinkedActivity();
  const [pendingDod, setPendingDod] = useState<PendingDodMove | null>(null);

  const positionsOf = (columnId: string) => (byColumn[columnId] ?? []).map((card) => card.position);
  const nextPosition = (columnId: string) => Math.max(-1, ...positionsOf(columnId)) + 1;
  const topPosition = (columnId: string) => Math.min(0, ...positionsOf(columnId)) - 1;

  // A atividade se move antes; se o projeto recusar, o card pessoal volta para onde estava.
  const commitMove = (cardId: string, columnId: string, position: number, activityMove?: ActivityMove) => {
    const previous = cards;
    const rollback = () => setCards(previous);
    setCards((items) => items.map((item) => (item.id === cardId ? { ...item, column_id: columnId, position } : item)));
    const persistCard = () => updateCard.mutate({ id: cardId, updates: { column_id: columnId, position } }, { onError: rollback });
    if (!activityMove) { persistCard(); return; }
    moveActivity.mutate(activityMove, {
      onSuccess: persistCard,
      onError: () => { rollback(); toast.error('Não foi possível mover a atividade no projeto.'); },
    });
  };

  const moveLinkedCard = async (card: PersonalKanbanCardWithTags, target: PersonalKanbanColumnDB, position: number) => {
    const activity = card.project_activity!;
    const plan = planActivityMove(activity, target.stage);
    if (plan.kind === 'blocked') { toast.error(plan.reason); return; }
    if (plan.kind === 'unchanged') { commitMove(card.id, target.id, position); return; }
    const activityMove = { activityId: activity.id, projectId: activity.project_id, column: plan.column };
    if (plan.confirmDod && (await needsDodConfirmation(activity.id))) {
      setPendingDod({ cardId: card.id, cardTitle: card.title, columnId: target.id, position, activityMove });
      return;
    }
    commitMove(card.id, target.id, position, activityMove);
  };

  const moveCard = (cardId: string, columnId: string, position: number) => {
    if (!isOnline) { toast.error('Sem conexão. Reconecte para salvar.'); return; }
    const card = cards.find((item) => item.id === cardId);
    const target = columns.find((column) => column.id === columnId);
    if (!card || !target) return;
    if (card.project_activity) void moveLinkedCard(card, target, position);
    else commitMove(cardId, columnId, position);
  };

  const reorderWithinColumn = (card: PersonalKanbanCardWithTags, overId: string) => {
    const colCards = byColumn[card.column_id] ?? [];
    const oldIndex = colCards.findIndex((item) => item.id === card.id);
    const overIndex = colCards.findIndex((item) => item.id === overId);
    const newIndex = overIndex === -1 ? colCards.length - 1 : overIndex;
    if (oldIndex === newIndex) return;
    const reordered = arrayMove(colCards, oldIndex, newIndex).map((item, position) => ({ ...item, position }));
    setCards((prev) => [...prev.filter((item) => item.column_id !== card.column_id), ...reordered]);
    batchUpdateCards.mutate(reordered.map(({ id, position, column_id }) => ({ id, position, column_id })));
  };

  const dropCard = (cardId: string, overId: string) => {
    const card = cards.find((item) => item.id === cardId);
    const targetColumnId = resolveTargetColumnId(overId, columns, cards);
    if (!card || !targetColumnId) return;
    if (card.column_id === targetColumnId) reorderWithinColumn(card, overId);
    else moveCard(card.id, targetColumnId, nextPosition(targetColumnId));
  };

  // Concluído entra no topo do Feito; reaberto volta ao fim de A fazer.
  const toggleDone = (card: PersonalKanbanCardWithTags) => {
    const target = toggleDoneTarget(columns, card.column_id);
    if (!target) return;
    moveCard(card.id, target.id, isDoneColumn(target) ? topPosition(target.id) : nextPosition(target.id));
  };

  const confirmPendingDod = () => {
    if (pendingDod) commitMove(pendingDod.cardId, pendingDod.columnId, pendingDod.position, pendingDod.activityMove);
    setPendingDod(null);
  };

  return {
    nextPosition,
    moveCard,
    dropCard,
    toggleDone,
    pendingDod,
    confirmPendingDod,
    cancelPendingDod: () => setPendingDod(null),
  };
}

export type CardMoves = ReturnType<typeof useCardMoves>;
