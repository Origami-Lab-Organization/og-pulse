import { useState, useMemo } from 'react';
import { LeadKanbanColumn } from './LeadKanbanColumn';
import { LeadDetailDialog } from './LeadDetailDialog';
import { CloseBusinessDialog } from './CloseBusinessDialog';
import { LeadWithBudget, CRMStage, CRM_LEAD_COLUMNS } from '@/types/lead';
import { useUpdateLeadStage } from '@/hooks/useLeads';
import { useCloseBusinessDeal } from '@/hooks/useCloseBusinessDeal';
import { useBudget } from '@/hooks/useBudgets';
import { useServices } from '@/hooks/useServices';

interface LeadKanbanBoardProps {
  leads: LeadWithBudget[];
  searchTerm: string;
}

export function LeadKanbanBoard({ leads, searchTerm }: LeadKanbanBoardProps) {
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadWithBudget | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [leadToClose, setLeadToClose] = useState<LeadWithBudget | null>(null);

  const updateStage = useUpdateLeadStage();
  const closeBusinessDeal = useCloseBusinessDeal();
  const { data: services = [] } = useServices();

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
