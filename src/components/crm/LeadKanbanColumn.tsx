import { useDroppable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LeadKanbanCard } from './LeadKanbanCard';
import { LeadWithBudget, CRMStage } from '@/types/lead';
import { cn } from '@/lib/utils';

interface ColumnConfig {
  id: CRMStage;
  label: string;
  color: string;
}

interface LeadKanbanColumnProps {
  column: ColumnConfig;
  leads: LeadWithBudget[];
  activeId: string | null;
  onArchive: (lead: LeadWithBudget) => void;
  onEdit: (lead: LeadWithBudget) => void;
}

export function LeadKanbanColumn({ column, leads, activeId, onArchive, onEdit }: LeadKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full min-h-[500px] rounded-lg border bg-muted/30 transition-colors',
        isOver && 'bg-primary/5 border-primary/50'
      )}
    >
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">{column.label}</h3>
        <Badge variant="secondary" className={cn('text-xs', column.color)}>
          {leads.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {leads.map((lead) => (
            <LeadKanbanCard
              key={lead.id}
              lead={lead}
              isDragging={activeId === lead.id}
              currentStage={column.id}
              onArchive={onArchive}
              onEdit={onEdit}
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
