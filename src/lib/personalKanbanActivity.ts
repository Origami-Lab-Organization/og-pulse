import type { ActivityColumnName } from '@/types/projectActivity';
import type {
  ActivityMovePlan,
  AssignedProjectCard,
  LinkedProjectActivity,
  PersonalKanbanCardWithTags,
  PersonalKanbanStage,
  ProjectFilter,
  ProjectOption,
} from '@/types/personalKanban';
import { PROJECT_TO_PERSONAL_STAGE, STAGE_ORDER } from '@/lib/personalKanban';

// As regras de movimento do board do projeto (ProjectActivitiesTab) valem também quando a
// atividade vinculada se move pelo Meu Kanban (ADR-0050).

/** Coluna onde nasce a atividade criada a partir de um card pessoal, pela etapa dele. */
export const NEW_ACTIVITY_COLUMN: Record<PersonalKanbanStage, ActivityColumnName> = {
  todo: 'product_backlog',
  doing: 'in_dev',
  done: 'done',
};

const REOPEN_COLUMN: ActivityColumnName = 'in_deploy';

type MovableActivity = Pick<LinkedProjectActivity, 'column_name' | 'is_blocked' | 'is_archived' | 'sprint_id'>;

const blocked = (reason: string): ActivityMovePlan => ({ kind: 'blocked', reason });

const rank = (stage: PersonalKanbanStage) => STAGE_ORDER.indexOf(stage);

// Voltar para "a fazer" mantém a atividade na sprint quando ela tem uma.
function columnForStage(activity: MovableActivity, stage: PersonalKanbanStage): ActivityColumnName {
  if (stage === 'todo' && activity.sprint_id) return 'sprint_backlog';
  return NEW_ACTIVITY_COLUMN[stage];
}

function reopenPlan(target: PersonalKanbanStage): ActivityMovePlan {
  if (target !== 'doing') return blocked('No projeto, atividade concluída só reabre para uma coluna de "Fazendo" (In Deploy).');
  return { kind: 'move', column: REOPEN_COLUMN, confirmDod: false };
}

export function planActivityMove(activity: MovableActivity, target: PersonalKanbanStage): ActivityMovePlan {
  const current = PROJECT_TO_PERSONAL_STAGE[activity.column_name];
  if (current === target) return { kind: 'unchanged' };
  if (activity.is_archived) return blocked('A atividade está arquivada no projeto.');
  if (current === 'done') return reopenPlan(target);
  if (activity.is_blocked && rank(target) > rank(current)) {
    return blocked('A atividade está bloqueada no projeto. Desbloqueie lá antes de avançar.');
  }
  return { kind: 'move', column: columnForStage(activity, target), confirmDod: target === 'done' };
}

// ── Filtro por projeto ───────────────────────────────────────────────────────

export function projectIdOfCard(card: PersonalKanbanCardWithTags): string | null {
  return card.project_activity?.project_id ?? null;
}

export function matchesProjectFilter(projectId: string | null, filter: ProjectFilter): boolean {
  if (filter.kind === 'all') return true;
  if (filter.kind === 'none') return projectId === null;
  return projectId === filter.projectId;
}

/** Projetos presentes no board: dos cards vinculados e das atividades atribuídas. */
export function projectOptionsFrom(cards: PersonalKanbanCardWithTags[], projectCards: AssignedProjectCard[]): ProjectOption[] {
  const byId = new Map<string, string>();
  cards.forEach((card) => {
    const project = card.project_activity?.project;
    if (project) byId.set(project.id, project.name);
  });
  projectCards.forEach((card) => {
    if (card.project) byId.set(card.project.id, card.project.name);
  });
  return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
