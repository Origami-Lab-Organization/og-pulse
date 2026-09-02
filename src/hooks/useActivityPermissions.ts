import { useAuth } from '@/contexts/AuthContext';
import { ProjectWithRelations } from '@/types/project';
import { isProjectManager, isProjectTeamMember } from '@/lib/access/projectRelation';

/**
 * O que a pessoa pode fazer no quadro de atividades deste projeto (PUL-205).
 *
 * As relações vêm de `src/lib/access/projectRelation`, que espelha os predicados da RLS.
 * Antes eram recalculadas aqui, e o cálculo divergia do banco num ponto que importava:
 *
 *   isPM = manager_id OU membro com role em ['pm','gerente','project manager']
 *
 * `project_members.role` é TEXT livre, e `can_manage_project` — o predicado que a policy
 * de `project_activity_settings` usa para escrita — só reconhece `projects.manager_id`.
 * Então a segunda metade daquele OR concedia na interface um poder que o banco recusa: a
 * aba de configurações do quadro abria e a gravação falhava. É o caso que o ADR-0027
 * proíbe no ponto 5 — capacidade mais permissiva que a RLS faz o usuário ver erro em vez
 * de ausência.
 *
 * A heurística também errava para o outro lado: um cargo cadastrado como "Gerente de
 * Projetos" não casava com a lista, então nem esse falso-positivo era consistente.
 */
export function useActivityPermissions(project: ProjectWithRelations) {
  const { employee } = useAuth();

  const isAdmin = employee?.isAdmin ?? false;
  const isPM = isProjectManager(project, employee?.id);
  const isMember = isProjectTeamMember(project, employee?.id);

  /** Membro sem poder elevado neste projeto — mexe apenas no que é seu. */
  const isEmployee = isMember && !isAdmin && !isPM;

  return {
    isAdmin,
    isPM,
    isMember,
    isEmployee,
    // Qualquer pessoa do time cria e move card: a policy de project_activity_cards é
    // tenant-wide, então restringir mais aqui esconderia o que o banco permite.
    canCreateCard: isAdmin || isPM || isMember,
    canMoveToProductBacklog: isAdmin || isPM || isMember,
    canMoveFromDone: isAdmin || isPM || isMember,
    // Configuração do quadro escreve em project_activity_settings, cuja policy usa
    // can_manage_project — admin ou o gerente responsável, e mais ninguém.
    canAccessSettings: isAdmin || isPM,
  };
}
