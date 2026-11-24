import { format, parseISO } from 'date-fns';
import { ProjectRoadmapTab } from '@/components/projects/detail/ProjectRoadmapTab';
import type { ProjectWithRelations } from '@/types/project';
import { PlanningIntro } from './PlanningPanelParts';

interface PlanningRoadmapPanelProps {
  project: ProjectWithRelations;
  canEdit: boolean;
}

const toBR = (iso: string) => format(parseISO(iso), 'dd/MM/yyyy');

function periodText(project: ProjectWithRelations) {
  if (project.is_continuous || !project.end_date) return `a partir de ${toBR(project.start_date)}`;
  return `${toBR(project.start_date)} a ${toBR(project.end_date)}`;
}

/**
 * Aba Roadmap do planejamento (US-0039, cenário 5): a linha do tempo do projeto vai se montando
 * com os marcos (pontos) e as barras de duração (épicos e releases), dentro do período.
 */
export function PlanningRoadmapPanel(props: PlanningRoadmapPanelProps) {
  const { project, canEdit } = props;
  const period = { start: project.start_date, end: project.is_continuous ? null : project.end_date };
  return (
    <div className="grid gap-4">
      <PlanningIntro title="Quando cada entrega acontece.">
        Marque as entregas que o cliente reconhece e a duração de cada etapa, dentro do período do projeto ({periodText(project)}).
      </PlanningIntro>
      <ProjectRoadmapTab project={project} isReadOnly={!canEdit} period={period} />
    </div>
  );
}
