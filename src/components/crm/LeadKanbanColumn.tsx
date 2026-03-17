import { useDroppable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LeadKanbanCard } from './LeadKanbanCard';
import { LeadWithBudget, CRMStage } from '@/types/lead';
import { Service } from '@/types/service';
import { LeadServiceRow } from '@/services/leadServicesService';
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
  leadServicesMap: Record<string, LeadServiceRow[]>;
}

export function LeadKanbanColumn({ column, leads, onCardClick, services, leadServicesMap }: LeadKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full min-h-[500px] rounded-lg border bg-muted/30 transition-colors',
        isOver && 'bg-primary/5 border-primary/40'
      )}
    >
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">{column.label}</h3>
        <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {leads.length}
        </span>
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
              leadServices={leadServicesMap[lead.id] ?? []}
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
