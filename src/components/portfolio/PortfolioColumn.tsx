import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PortfolioCard } from './PortfolioCard';
import type { PortfolioProject } from '@/hooks/usePortfolioProjects';
import type { PortfolioAlert, PortfolioBoardColumnId } from '@/types/portfolio';
import type { PlanningReadiness } from '@/types/projectPlanning';
import { cn } from '@/lib/utils';

interface PortfolioColumnProps {
  id: PortfolioBoardColumnId;
  label: string;
  /** Regra da coluna em uma linha (quando o projeto entra e sai). */
  rule: string;
  projects: PortfolioProject[];
  /** Hoje, `yyyy-MM-dd`. */
  today: string;
  canDragProject?: (project: PortfolioProject) => boolean;
  hideValues?: boolean;
  alertsOf?: (project: PortfolioProject) => PortfolioAlert[];
  /** Prontidão do planejamento de cada projeto (US-0039). */
  planningOf?: (project: PortfolioProject) => PlanningReadiness | undefined;
}

/** Coluna do quadro do portfólio, com rolagem própria para a página não crescer (US-0035). */
export function PortfolioColumn(props: PortfolioColumnProps) {
  const { id, label, rule, projects, today, canDragProject = () => false, hideValues, alertsOf = () => [], planningOf = () => undefined } = props;
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'column', column: id } });

  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      className={cn(
        'flex max-h-[calc(100vh-22rem)] min-h-[16rem] min-w-0 flex-col rounded-lg border border-border bg-muted/30 transition-colors',
        isOver && 'border-primary/50 bg-primary/5',
      )}
    >
      <div className="flex items-center justify-between gap-2 rounded-t-lg bg-muted px-4 py-3 text-muted-foreground">
        <h3 className="truncate text-base font-medium">{label}</h3>
        <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-background/60 px-1.5 text-xs font-medium">
          {projects.length}
        </span>
      </div>
      <p className="px-4 pt-2 text-xs text-muted-foreground">{rule}</p>
      <div className="flex-1 overflow-y-auto p-2">
        <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {projects.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Nenhum projeto</p>
            ) : (
              projects.map((project) => (
                <PortfolioCard
                  key={project.id}
                  project={project}
                  column={id}
                  today={today}
                  canDrag={canDragProject(project)}
                  hideValues={hideValues}
                  alerts={alertsOf(project)}
                  planning={planningOf(project)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </section>
  );
}
