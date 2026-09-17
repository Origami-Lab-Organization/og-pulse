import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { ProspectStage, ProspectWithCompany } from '@/types/prospect';
import { ProspectKanbanCard } from './ProspectKanbanCard';

interface ProspectKanbanColumnProps {
  stage: ProspectStage;
  label: string;
  prospects: ProspectWithCompany[];
  onOpen: (prospect: ProspectWithCompany) => void;
}

export function ProspectKanbanColumn({
  stage,
  label,
  prospects,
  onOpen,
}: ProspectKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, data: { stage } });

  return (
    <div className="flex min-h-0 flex-col rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">{prospects.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 overflow-y-auto p-2 scrollbar-hide transition-colors',
          isOver && 'bg-accent/50',
        )}
      >
        {prospects.map((prospect) => (
          <ProspectKanbanCard
            key={prospect.id}
            prospect={prospect}
            currentStage={stage}
            onOpen={onOpen}
          />
        ))}
        {prospects.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">Vazio</p>
        )}
      </div>
    </div>
  );
}
