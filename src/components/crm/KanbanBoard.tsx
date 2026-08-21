import { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { CloseBusinessDialog } from './CloseBusinessDialog';
import type { CloseBusinessFormValues } from './CloseBusinessDialog';
import { BudgetWithDetails, BudgetStatus, CRM_COLUMNS } from '@/types/budget';
import { useUpdateBudgetStatus } from '@/hooks/useBudgets';
import { useCloseBusinessDeal } from '@/hooks/useCloseBusinessDeal';
import type { CloseBusinessInstallment } from '@/lib/closeBusinessFinancials';

interface KanbanBoardProps {
  budgets: BudgetWithDetails[];
  searchTerm: string;
}

export function KanbanBoard({ budgets, searchTerm }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [budgetToClose, setBudgetToClose] = useState<BudgetWithDetails | null>(null);
  const updateStatus = useUpdateBudgetStatus();
  const closeBusinessDeal = useCloseBusinessDeal();

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

    // If moving to 'active' (Negócio Fechado), open confirmation dialog
    if (newStatus === 'active') {
      setBudgetToClose(budget);
      setCloseDialogOpen(true);
      return;
    }

    // For other status changes, update directly
    updateStatus.mutate({ id: budgetId, status: newStatus });
  };

  const handleCloseBusinessConfirm = async (formData: CloseBusinessFormValues) => {
    if (!budgetToClose) return;

    // Check if budget has a client_id (required for project creation)
    if (!budgetToClose.client_id) {
      // If no client, we need to handle this case
      // For now, we'll proceed but the project creation might fail
    }

    return closeBusinessDeal.mutateAsync({
      leadId: '',
      budget: budgetToClose,
      ...formData,
      customInstallments: formData.projectType === 'fixed_scope' ? (formData.installments as CloseBusinessInstallment[]) : undefined,
    });
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-[repeat(3,minmax(240px,1fr))] gap-4 h-[calc(100vh-220px)]">
          {CRM_COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              budgets={budgetsByStatus[column.id] || []}
              activeId={activeId}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeBudget && <KanbanCard budget={activeBudget} />}
      </DragOverlay>

      <CloseBusinessDialog
        open={closeDialogOpen}
        onOpenChange={(open) => {
          setCloseDialogOpen(open);
          if (!open) setBudgetToClose(null);
        }}
        budget={budgetToClose}
        onConfirm={handleCloseBusinessConfirm}
        isSubmitting={closeBusinessDeal.isPending}
      />
    </DndContext>
  );
}
