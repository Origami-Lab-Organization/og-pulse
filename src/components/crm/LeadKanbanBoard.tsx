import { useState, useMemo } from 'react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { LeadKanbanColumn } from './LeadKanbanColumn';
import { LeadKanbanCard } from './LeadKanbanCard';
import { LeadDetailDialog } from './LeadDetailDialog';
import { CloseBusinessDialog } from './CloseBusinessDialog';
import { LoseDealDialog } from './LoseDealDialog';
import { LeadWithBudget, CRMStage, CRM_LEAD_COLUMNS } from '@/types/lead';
import { useUpdateLeadStage } from '@/hooks/useLeads';
import { EMPTY_AVG_TICKET_LOOKUP } from '@/lib/leadValue';

const STAGE_INDEX: Record<CRMStage, number> = {
  screening: 0,
  qualification: 1,
  proposal: 2,
  negotiation: 3,
  closed: 4,
  closed_lost: 5,
};
import { useCloseBusinessDeal } from '@/hooks/useCloseBusinessDeal';
import { useBudget } from '@/hooks/useBudgets';
import { useServices } from '@/hooks/useServices';
import { useLeadServicesMap } from '@/hooks/useLeadServices';
import { useAllPendingFollowUps, LeadFollowUp } from '@/hooks/useLeadFollowUps';
import { useServiceAvgTicketsMap } from '@/hooks/useServiceAvgTicketsMap';
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
  const [lossDialogOpen, setLossDialogOpen] = useState(false);
  const [leadToLose, setLeadToLose] = useState<LeadWithBudget | null>(null);
  const [activeLead, setActiveLead] = useState<LeadWithBudget | null>(null);
  const [highlightField, setHighlightField] = useState<'service_line' | 'budget_id' | null>(null);

  const updateStage = useUpdateLeadStage();
  const closeBusinessDeal = useCloseBusinessDeal();
  const { data: services = [] } = useServices();
  const leadServicesMap = useLeadServicesMap();
  const { data: avgTickets = EMPTY_AVG_TICKET_LOOKUP } = useServiceAvgTicketsMap();
  const { data: pendingFollowUps = [] } = useAllPendingFollowUps();
  const { toast } = useToast();

  // Agrupa os follow-ups pendentes do tenant por oportunidade — alimenta o indicador
  // de "vencido" nos cards (GP-J5 CA-01). Reage ao polling de 60s do hook.
  const followUpsByLead = useMemo(() => {
    const map: Record<string, LeadFollowUp[]> = {};
    for (const followUp of pendingFollowUps) {
      (map[followUp.lead_id] ??= []).push(followUp);
    }
    return map;
  }, [pendingFollowUps]);

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

    const lead = leads.find((l) => l.id === active.id);
    if (!lead || lead.archived) return;

    // Resolver a coluna de destino: over pode ser uma coluna ou um card
    let newStage: CRMStage;
    const validStages: string[] = ['screening', 'qualification', 'proposal', 'negotiation', 'closed', 'closed_lost'];

    if (validStages.includes(over.id as string)) {
      newStage = over.id as CRMStage;
    } else {
      const targetLead = leads.find((l) => l.id === over.id);
      if (targetLead) {
        newStage = targetLead.crm_stage;
      } else {
        const overData = over.data?.current;
        if (overData?.stage) {
          newStage = overData.stage as CRMStage;
        } else {
          return;
        }
      }
    }

    if (lead.crm_stage === newStage) return;

    if (newStage === 'closed') {
      setLeadToClose(lead);
      setCloseDialogOpen(true);
      return;
    }

    if (newStage === 'closed_lost') {
      setLeadToLose(lead);
      setLossDialogOpen(true);
      return;
    }

    const currentIndex = STAGE_INDEX[lead.crm_stage];
    const targetIndex = STAGE_INDEX[newStage];
    const diff = targetIndex - currentIndex;

    // Bloquear pulo de colunas — só adjacente permitido
    if (Math.abs(diff) > 1) {
      toast({
        title: 'Movimento inválido',
        description: 'Só é permitido mover para a coluna adjacente.',
        variant: 'destructive',
      });
      return;
    }

    // Validar gates APENAS ao avançar
    if (diff > 0) {
      if (lead.crm_stage === 'qualification' && !lead.service_line) {
        toast({
          title: 'Tipo de serviço obrigatório',
          description: 'Defina o tipo de serviço antes de avançar para Proposta.',
          variant: 'destructive',
        });
        setSelectedLead(lead);
        setDetailDialogOpen(true);
        return;
      }
      if (lead.crm_stage === 'proposal' && !lead.budget_id) {
        toast({
          title: 'Orçamento obrigatório',
          description: 'Atribua um orçamento antes de avançar para Negociação.',
          variant: 'destructive',
        });
        setSelectedLead(lead);
        setDetailDialogOpen(true);
        return;
      }
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
      screening: [], qualification: [], proposal: [], negotiation: [], closed: [], closed_lost: [],
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

  const handleCloseBusinessConfirm = async (formData: import('@/components/crm/CloseBusinessDialog').CloseBusinessFormValues) => {
    if (!leadToClose) return;

    const budget = budgetForClose || null;

    const project = await closeBusinessDeal.mutateAsync({
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
      customInstallments: formData.projectType === 'fixed_scope' ? formData.installments : undefined,
    });

    updateStage.mutate({ id: leadToClose.id, stage: 'closed', fromStage: leadToClose.crm_stage });
    return project;
  };

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-2">
        <div className="grid grid-cols-[repeat(6,minmax(220px,1fr))] gap-3 h-[calc(100vh-220px)]">
          {CRM_LEAD_COLUMNS.map((column) => (
            <LeadKanbanColumn
              key={column.id}
              column={column}
              leads={leadsByStage[column.id] || []}
              onCardClick={handleCardClick}
              services={services}
              avgTickets={avgTickets}
              leadServicesMap={leadServicesMap}
              followUpsByLead={followUpsByLead}
            />
          ))}
        </div>
        </div>

        <DragOverlay>
          {activeLead && (
            <LeadKanbanCard
              lead={activeLead}
              currentStage={activeLead.crm_stage}
              services={services}
              avgTickets={avgTickets}
            />
          )}
        </DragOverlay>
      </DndContext>

      <LeadDetailDialog
        open={detailDialogOpen}
        onOpenChange={(open) => { setDetailDialogOpen(open); if (!open) { setSelectedLead(null); setHighlightField(null); } }}
        lead={selectedLead}
        onAdvanceToClose={handleRequestAdvanceToClose}
        initialEditMode={highlightField === 'service_line'}
        highlightField={highlightField}
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

      <LoseDealDialog
        open={lossDialogOpen}
        onOpenChange={(open) => { setLossDialogOpen(open); if (!open) setLeadToLose(null); }}
        lead={leadToLose}
        fromStage={leadToLose?.crm_stage ?? null}
      />
    </>
  );
}
