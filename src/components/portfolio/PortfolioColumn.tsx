import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PortfolioCard } from './PortfolioCard';
import { PortfolioProject } from '@/hooks/usePortfolioProjects';
import { PortfolioStage } from '@/types/portfolio';
import { cn } from '@/lib/utils';

interface PortfolioColumnProps {
  id: PortfolioStage;
  label: string;
  color: string;
  projects: PortfolioProject[];
  onRemoveProject?: (project: PortfolioProject) => void;
}

export function PortfolioColumn({ id, label, color, projects, onRemoveProject }: PortfolioColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: 'column',
      stage: id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-lg border border-border bg-card transition-colors',
        isOver && 'border-primary/50 bg-primary/5'
      )}
    >
      {/* Column Header */}
      <div className={cn('px-3 py-2 rounded-t-lg', color)}>
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm truncate">{label}</h3>
          <span className="flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-background/50 text-xs font-medium">
            {projects.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="p-2">
        <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {projects.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Nenhum projeto
              </div>
            ) : (
              projects.map((project) => (
                <PortfolioCard key={project.id} project={project} onRemove={onRemoveProject} />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
