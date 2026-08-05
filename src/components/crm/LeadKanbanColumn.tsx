import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LeadKanbanCard } from './LeadKanbanCard';
import { LeadWithBudget, CRMStage } from '@/types/lead';
import { Service } from '@/types/service';
import { LeadServiceRow } from '@/services/leadServicesService';
import { LeadFollowUp } from '@/hooks/useLeadFollowUps';
import { resolveLeadEstimatedValue, ServiceLineAvgTicketLookup } from '@/lib/leadValue';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface ColumnConfig {
  id: CRMStage;
  label: string;
  color: string;
}

interface LeadKanbanColumnProps {
  column: ColumnConfig;
  leads: LeadWithBudget[];
  onCardClick: (lead: LeadWithBudget) => void;
  services: Service[];
  avgTickets: ServiceLineAvgTicketLookup;
  leadServicesMap: Record<string, LeadServiceRow[]>;
  followUpsByLead: Record<string, LeadFollowUp[]>;
}

export function LeadKanbanColumn({ column, leads, onCardClick, services, avgTickets, leadServicesMap, followUpsByLead }: LeadKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const totalValue = useMemo(
    () => leads.reduce((sum, lead) => sum + resolveLeadEstimatedValue(lead, services, avgTickets), 0),
    [leads, services, avgTickets]
  );

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full min-h-[500px] rounded-lg border bg-muted/30 transition-colors',
        isOver && 'bg-primary/5 border-primary/40'
      )}
    >
      <div className="flex flex-col gap-1 p-3 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{column.label}</h3>
          <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
            {leads.length}
          </span>
        </div>
        {totalValue > 0 && (
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {formatCurrency(totalValue)}
          </span>
        )}
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2 min-h-[50px]">
          {leads.map((lead) => (
            <LeadKanbanCard
              key={lead.id}
              lead={lead}
              currentStage={column.id}
              onClick={() => onCardClick(lead)}
              services={services}
              avgTickets={avgTickets}
              leadServices={leadServicesMap[lead.id] ?? []}
              pendingFollowUps={followUpsByLead[lead.id] ?? []}
            />
          ))}
          {leads.length === 0 && (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              Nenhum lead
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
