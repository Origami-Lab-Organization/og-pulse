import { useDroppable } from '@dnd-kit/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { JobApplicationDB } from '@/types/jobApplication';
import { CandidateKanbanCard } from './CandidateKanbanCard';

interface CandidateKanbanColumnProps {
  id: string;
  title: string;
  candidates: JobApplicationDB[];
  color: string;
  onCardClick: (candidate: JobApplicationDB) => void;
  onHireClick?: (candidate: JobApplicationDB) => void;
}

export function CandidateKanbanColumn({
  id,
  title,
  candidates,
  color,
  onCardClick,
  onHireClick,
}: CandidateKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-lg border bg-muted/30 transition-colors min-h-[400px] ${
        isOver ? 'border-primary/50 bg-primary/5' : 'border-border'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        <span className="text-xs font-medium text-muted-foreground bg-background rounded-full px-2 py-0.5 border border-border">
          {candidates.length}
        </span>
      </div>

      {/* Cards */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {candidates.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nenhum candidato
            </p>
          ) : (
            candidates.map((candidate) => (
              <CandidateKanbanCard
                key={candidate.id}
                candidate={candidate}
                onClick={() => onCardClick(candidate)}
                onHireClick={onHireClick ? () => onHireClick(candidate) : undefined}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
