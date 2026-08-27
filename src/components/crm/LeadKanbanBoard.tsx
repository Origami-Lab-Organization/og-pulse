import { useState, useMemo } from 'react';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import { LeadKanbanColumn } from './LeadKanbanColumn';
import { LeadKanbanCard } from './LeadKanbanCard';
import { LeadDetailDialog } from './LeadDetailDialog';
import { CloseBusinessDialog } from './CloseBusinessDialog';
import {
  LeadWithBudget, CRMStage, CRM_FUNNEL_STAGES, CRM_STAGE_META, getStageLabel,
} from '@/types/lead';
import { useUpdateLeadStage } from '@/hooks/useLeads';
import { resolveLeadEstimatedValue } from '@/lib/leadValue';
import { useCloseBusinessDeal } from '@/hooks/useCloseBusinessDeal';
import { useBudget } from '@/hooks/useBudgets';
import { useServices } from '@/hooks/useServices';
import { useLeadServicesMap } from '@/hooks/useLeadServices';
import { useAllPendingFollowUps, LeadFollowUp } from '@/hooks/useLeadFollowUps';
import { useToast } from '@/hooks/use-toast';
import type { CloseBusinessInstallment } from '@/lib/closeBusinessFinancials';

/**
 * Colunas do board: só o funil.
 *
 * Nem `closed_lost` nem `stand_by` são coluna — os dois são estados laterais,
 * dados de dentro do card, e vivem em abas próprias ("Perdas" e "Stand By").
 * Tirar o Stand By da grade devolve a largura das 5 colunas do funil, que é o
 * que a tela precisa mostrar bem.
 */
const BOARD_STAGES: CRMStage[] = [...CRM_FUNNEL_STAGES];
const FUNNEL_INDEX: Record<string, number> = Object.fromEntries(
  CRM_FUNNEL_STAGES.map((stage, index) => [stage, index])
);

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
  const [highlightField, setHighlightField] = useState<'service_line' | 'budget_id' | null>(null);

  const updateStage = useUpdateLeadStage();
  const closeBusinessDeal = useCloseBusinessDeal();
  const { data: services = [] } = useServices();
  const leadServicesMap = useLeadServicesMap();
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
    const validStages: string[] = BOARD_STAGES;

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

    const currentIndex = FUNNEL_INDEX[lead.crm_stage];
    const targetIndex = FUNNEL_INDEX[newStage];
    if (currentIndex === undefined || targetIndex === undefined) return;
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

    const stageLabel = getStageLabel(newStage);
    updateStage.mutate(
      { id: lead.id, stage: newStage, fromStage: lead.crm_stage },
      {
        onSuccess: () => {
          toast({
            title: 'Oportunidade movida',
            description: `"${lead.name}" foi movida para ${stageLabel}.`,
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
    const grouped: Record<string, LeadWithBudget[]> = Object.fromEntries(
      BOARD_STAGES.map((stage) => [stage, [] as LeadWithBudget[]])
    );
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
      totalValue: formData.totalValue || resolveLeadEstimatedValue(leadToClose),
      monthlyValue: formData.monthlyValue,
      customInstallments: formData.projectType === 'fixed_scope' ? (formData.installments as CloseBusinessInstallment[]) : undefined,
    });

    updateStage.mutate({ id: leadToClose.id, stage: 'closed', fromStage: leadToClose.crm_stage });
    return project;
  };

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto pb-2">
        {/* Só o funil: 5 colunas dividindo toda a largura. */}
        <div className="grid grid-cols-[repeat(5,minmax(220px,1fr))] gap-3 h-[calc(100vh-220px)]">
          {CRM_FUNNEL_STAGES.map((stage) => (
            <LeadKanbanColumn
              key={stage}
              column={CRM_STAGE_META[stage]}
              leads={leadsByStage[stage] || []}
              onCardClick={handleCardClick}
              services={services}
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
    </>
  );
}
