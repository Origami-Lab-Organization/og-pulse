import { useState, useMemo } from 'react';
import { ActivityCardType, ProjectActivityCardWithRelations } from '@/types/projectActivity';

export interface KanbanFilters {
  searchText:   string;
  assigneeIds:  string[];
  cardTypes:    ActivityCardType[];
  tagIds:       string[];
  sprintId:     string | null;
}

export interface KanbanFiltersReturn extends KanbanFilters {
  setSearchText:  (v: string) => void;
  setAssigneeIds: (v: string[]) => void;
  setCardTypes:   (v: ActivityCardType[]) => void;
  setTagIds:      (v: string[]) => void;
  setSprintId:    (v: string | null) => void;
  filterCount:    number;
  clearAllFilters: () => void;
}

// ── Filter predicates ─────────────────────────────────────────────────────────

export function applyKanbanFilters(
  cards: ProjectActivityCardWithRelations[],
  filters: KanbanFilters,
): ProjectActivityCardWithRelations[] {
  const { searchText, assigneeIds, cardTypes, tagIds, sprintId } = filters;
  const q = searchText.trim().toLowerCase();

  return cards.filter((c) => {
    if (q && !c.title.toLowerCase().includes(q) && !(c.user_story?.toLowerCase().includes(q))) {
      return false;
    }
    if (assigneeIds.length > 0 && !assigneeIds.includes(c.assignee_id ?? '')) {
      return false;
    }
    if (cardTypes.length > 0 && !cardTypes.includes(c.card_type)) {
      return false;
    }
    if (tagIds.length > 0) {
      const cardTagIds = c.card_tags?.map((ct) => ct.tag_id) ?? [];
      if (!tagIds.some((id) => cardTagIds.includes(id))) return false;
    }
    if (sprintId && c.sprint_id !== sprintId) {
      return false;
    }
    return true;
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useKanbanFilters(): KanbanFiltersReturn {
  const [searchText,  setSearchText]  = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [cardTypes, setCardTypes] = useState<ActivityCardType[]>([]);
  const [tagIds,    setTagIds]    = useState<string[]>([]);
  const [sprintId,  setSprintId]  = useState<string | null>(null);

  const filterCount = useMemo(() => {
    let n = 0;
    if (searchText.trim()) n++;
    if (assigneeIds.length > 0) n++;
    if (cardTypes.length > 0) n++;
    if (tagIds.length > 0) n++;
    if (sprintId) n++;
    return n;
  }, [searchText, assigneeIds, cardTypes, tagIds, sprintId]);

  const clearAllFilters = () => {
    setSearchText('');
    setAssigneeIds([]);
    setCardTypes([]);
    setTagIds([]);
    setSprintId(null);
  };

  return {
    searchText,  setSearchText,
    assigneeIds, setAssigneeIds,
    cardTypes,   setCardTypes,
    tagIds,      setTagIds,
    sprintId,    setSprintId,
    filterCount,
    clearAllFilters,
  };
}
