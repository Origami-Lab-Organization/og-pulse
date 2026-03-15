import { useState, useMemo } from 'react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { LeadKanbanColumn } from './LeadKanbanColumn';
import { LeadKanbanCard } from './LeadKanbanCard';
import { LeadDetailDialog } from './LeadDetailDialog';
import { CloseBusinessDialog } from './CloseBusinessDialog';
import { LeadWithBudget, CRMStage, CRM_LEAD_COLUMNS } from '@/types/lead';
import { useUpdateLeadStage } from '@/hooks/useLeads';
import { useCloseBusinessDeal } from '@/hooks/useCloseBusinessDeal';
import { useBudget } from '@/hooks/useBudgets';
import { useServices } from '@/hooks/useServices';
import { useToast } from '@/hooks/use-toast';

interface LeadKanbanBoardProps {
  leads: LeadWithBudget[];
  searchTerm: string;
}

export function LeadKanbanBoard({ leads, searchTerm }: LeadKanbanBoardProps) {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadWithBudget | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [leadToClose, setLeadToClose] = useState<LeadWithBudget | null>(null);
  const [activeLead, setActiveLead] = useState<LeadWithBudget | null>(null);

  const updateStage = useUpdateLeadStage();
  const closeBusinessDeal = useCloseBusinessDeal();
  const { data: services = [] } = useServices();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    if (lead) setActiveLead(lead);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;
    const newStage = over.id as CRMStage;
    const lead = leads.find((l) => l.id === active.id);
    if (!lead || lead.crm_stage === newStage || lead.archived) return;

    if (newStage === 'closed') {
      setLeadToClose(lead);
      setCloseDialogOpen(true);
      return;
    }

    const stageLabel = CRM_LEAD_COLUMNS.find((c) => c.id === newStage)?.label ?? newStage;
    updateStage.mutate(
      { id: lead.id, stage: newStage, fromStage: lead.crm_stage },
      {
        onSuccess: () => {
          toast({
            title: 'Lead movido',
            description: `"${lead.name}" foi movido para ${stageLabel}.`,
          });
        },
      }
    );
  };

  // Fetch full budget details when closing
  const { data: budgetForClose } = useBudget(leadToClose?.budget_id || null);

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
      if (grouped[lead.crm_stage]) grouped[lead.crm_stage].push(lead);
    });
    return grouped;
  }, [filteredLeads]);

  const handleCardClick = (lead: LeadWithBudget) => {
    setSelectedLead(lead);
    setDetailDialogOpen(true);
  };

  // Called from LeadDetailDialog when user advances to "closed"
  const handleRequestAdvanceToClose = () => {
    if (!selectedLead) return;
    setLeadToClose(selectedLead);
    setDetailDialogOpen(false);
    setSelectedLead(null);
    setCloseDialogOpen(true);
  };

  const handleCloseBusinessConfirm = (formData: import('@/components/crm/CloseBusinessDialog').CloseBusinessFormValues) => {
    if (!leadToClose) return;

    const budget = budgetForClose || null;

    closeBusinessDeal.mutate(
      {
        leadId: leadToClose.id,
        budget,
        projectType: formData.projectType,
        managerId: formData.managerId,
        paymentMethod: formData.paymentMethod,
        installmentsCount: formData.installmentsCount,
        dueDay: formData.dueDay,
        firstInvoiceDate: formData.firstInvoiceDate,
        startDate: formData.startDate,
        endDate: formData.endDate,
        renewalDate: formData.renewalDate,
        successFeePercent: formData.successFeePercent,
        serviceLine: leadToClose.service_line || undefined,
        projectName: formData.projectName || leadToClose.name,
        clientId: formData.clientId || leadToClose.client_id || '',
        totalValue: formData.totalValue || leadToClose.estimated_value || 0,
        monthlyValue: formData.monthlyValue,
      },
      {
        onSuccess: () => {
          updateStage.mutate({ id: leadToClose.id, stage: 'closed', fromStage: leadToClose.crm_stage });
          setCloseDialogOpen(false);
          setLeadToClose(null);
        },
      }
    );
  };

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-5 gap-3 h-[calc(100vh-220px)]">
          {CRM_LEAD_COLUMNS.map((column) => (
            <LeadKanbanColumn
              key={column.id}
              column={column}
              leads={leadsByStage[column.id] || []}
              onCardClick={handleCardClick}
              services={services}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead && (
            <LeadKanbanCard
              lead={activeLead}
              currentStage={activeLead.crm_stage}
              services={services}
            />
          )}
        </DragOverlay>
      </DndContext>

      <LeadDetailDialog
        open={detailDialogOpen}
        onOpenChange={(open) => { setDetailDialogOpen(open); if (!open) setSelectedLead(null); }}
        lead={selectedLead}
        onAdvanceToClose={handleRequestAdvanceToClose}
      />

      <CloseBusinessDialog
        open={closeDialogOpen}
        onOpenChange={(open) => { setCloseDialogOpen(open); if (!open) setLeadToClose(null); }}
        budget={budgetForClose || null}
        lead={leadToClose}
        onConfirm={handleCloseBusinessConfirm}
        isSubmitting={closeBusinessDeal.isPending}
        services={services}
      />
    </>
  );
}
