import { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { BudgetWithDetails, BudgetStatus, CRM_COLUMNS } from '@/types/budget';
import { useUpdateBudgetStatus } from '@/hooks/useBudgets';

interface KanbanBoardProps {
  budgets: BudgetWithDetails[];
  searchTerm: string;
}

export function KanbanBoard({ budgets, searchTerm }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const updateStatus = useUpdateBudgetStatus();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Filter budgets by search term
  const filteredBudgets = useMemo(() => {
    if (!searchTerm.trim()) return budgets;
    const term = searchTerm.toLowerCase();
    return budgets.filter((b) =>
      b.title.toLowerCase().includes(term) ||
      b.budget_number.toLowerCase().includes(term) ||
      b.client?.company_name?.toLowerCase().includes(term) ||
      b.lead_name?.toLowerCase().includes(term)
    );
  }, [budgets, searchTerm]);

  // Group budgets by status (only CRM statuses)
  const budgetsByStatus = useMemo(() => {
    const grouped: Record<BudgetStatus, BudgetWithDetails[]> = {
      proposal: [],
      negotiation: [],
      active: [],
      draft: [],
      sent: [],
      approved: [],
      rejected: [],
      expired: [],
    };

    filteredBudgets.forEach((budget) => {
      // Map legacy statuses to CRM statuses
      let status = budget.status;
      if (status === 'draft' || status === 'sent') {
        status = 'proposal';
      } else if (status === 'approved') {
        status = 'active';
      }

      if (grouped[status]) {
        grouped[status].push(budget);
      }
    });

    return grouped;
  }, [filteredBudgets]);

  const activeBudget = useMemo(() => {
    if (!activeId) return null;
    return budgets.find((b) => b.id === activeId) || null;
  }, [activeId, budgets]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    
    const { active, over } = event;
    if (!over) return;

    const budgetId = active.id as string;
    const newStatus = over.id as BudgetStatus;
    
    const budget = budgets.find((b) => b.id === budgetId);
    if (!budget || budget.status === newStatus) return;

    // Prevent moving active (closed) budgets
    if (budget.status === 'active') return;

    // Update the budget status
    updateStatus.mutate({ id: budgetId, status: newStatus });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        {CRM_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            budgets={budgetsByStatus[column.id] || []}
            activeId={activeId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeBudget && <KanbanCard budget={activeBudget} />}
      </DragOverlay>
    </DndContext>
  );
}
