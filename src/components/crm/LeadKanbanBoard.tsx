import { useState, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { LeadKanbanColumn } from './LeadKanbanColumn';
import { LeadKanbanCard } from './LeadKanbanCard';
import { LeadDetailDialog } from './LeadDetailDialog';
import { CloseBusinessDialog } from './CloseBusinessDialog';
import { LeadWithBudget, CRMStage, CRM_LEAD_COLUMNS } from '@/types/lead';
import { useUpdateLeadStage } from '@/hooks/useLeads';
import { useCloseBusinessDeal } from '@/hooks/useCloseBusinessDeal';
import { useBudget } from '@/hooks/useBudgets';
import { toast } from '@/hooks/use-toast';
interface LeadKanbanBoardProps {
  leads: LeadWithBudget[];
  searchTerm: string;
}

export function LeadKanbanBoard({ leads, searchTerm }: LeadKanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadWithBudget | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [leadToClose, setLeadToClose] = useState<LeadWithBudget | null>(null);

  const updateStage = useUpdateLeadStage();
  const closeBusinessDeal = useCloseBusinessDeal();

  // Fetch full budget details when closing
  const { data: budgetForClose } = useBudget(leadToClose?.budget_id || null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const filteredLeads = useMemo(() => {
    if (!searchTerm.trim()) return leads;
    const term = searchTerm.toLowerCase();
    return leads.filter((l) =>
      l.name.toLowerCase().includes(term) ||
      l.company_name?.toLowerCase().includes(term) ||
      l.contact_name?.toLowerCase().includes(term) ||
      l.budget?.budget_number?.toLowerCase().includes(term)
    );
  }, [leads, searchTerm]);

  const leadsByStage = useMemo(() => {
    const grouped: Record<CRMStage, LeadWithBudget[]> = {
      screening: [], qualification: [], proposal: [], negotiation: [], closed: [],
    };
    filteredLeads.forEach((lead) => {
      if (grouped[lead.crm_stage]) {
        grouped[lead.crm_stage].push(lead);
      }
    });
    return grouped;
  }, [filteredLeads]);

  const activeLead = useMemo(() => {
    if (!activeId) return null;
    return leads.find((l) => l.id === activeId) || null;
  }, [activeId, leads]);

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newStage = over.id as CRMStage;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.crm_stage === newStage) return;

    // Locked leads can't move
    if (lead.crm_stage === 'closed') return;

    // Can't move to closed without budget
    if (newStage === 'closed') {
      if (!lead.budget_id) {
        toast({ title: 'Orçamento necessário', description: 'Crie um orçamento antes de fechar o negócio.', variant: 'destructive' });
        return;
      }
      setLeadToClose(lead);
      setCloseDialogOpen(true);
      return;
    }

    updateStage.mutate({ id: leadId, stage: newStage });
  };

  const handleCardClick = (lead: LeadWithBudget) => {
    setSelectedLead(lead);
    setDetailDialogOpen(true);
  };

  const handleCloseBusinessConfirm = (formData: {
    managerId: string;
    paymentMethod: string;
    installmentsCount: number;
    dueDay: number;
    firstInvoiceDate: string;
    startDate: string;
    endDate: string;
  }) => {
    if (!leadToClose || !budgetForClose) return;

    closeBusinessDeal.mutate(
      { budget: budgetForClose, ...formData, serviceLine: leadToClose.service_line || undefined },
      {
        onSuccess: () => {
          updateStage.mutate({ id: leadToClose.id, stage: 'closed' });
          setCloseDialogOpen(false);
          setLeadToClose(null);
        },
      }
    );
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-5 gap-3 h-[calc(100vh-220px)]">
        {CRM_LEAD_COLUMNS.map((column) => (
          <LeadKanbanColumn
            key={column.id}
            column={column}
            leads={leadsByStage[column.id] || []}
            activeId={activeId}
            onCardClick={handleCardClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead && (
          <LeadKanbanCard
            lead={activeLead}
            currentStage={activeLead.crm_stage}
          />
        )}
      </DragOverlay>

      <LeadDetailDialog
        open={detailDialogOpen}
        onOpenChange={(open) => { setDetailDialogOpen(open); if (!open) setSelectedLead(null); }}
        lead={selectedLead}
      />

      <CloseBusinessDialog
        open={closeDialogOpen}
        onOpenChange={(open) => { setCloseDialogOpen(open); if (!open) setLeadToClose(null); }}
        budget={budgetForClose || null}
        onConfirm={handleCloseBusinessConfirm}
        isSubmitting={closeBusinessDeal.isPending}
      />
    </DndContext>
  );
}
