import { ProjectStakeholdersTab } from '@/components/projects/detail/ProjectStakeholdersTab';
import type { ProjectWithRelations } from '@/types/project';

interface PlanningStakeholdersPanelProps {
  project: ProjectWithRelations;
  canEdit: boolean;
}

/**
 * Aba Stakeholders do planejamento (US-0039, cenário 7), com o cadastro completo da aba de
 * sempre: contato, papel, influência, interesse e patrocínio, e a importação do cliente. A linha
 * é do projeto e o banco carimba o cliente nela, então a pessoa aparece no cadastro do cliente
 * (ADR-0037).
 */
export function PlanningStakeholdersPanel(props: PlanningStakeholdersPanelProps) {
  return <ProjectStakeholdersTab project={props.project} isReadOnly={!props.canEdit} />;
}
