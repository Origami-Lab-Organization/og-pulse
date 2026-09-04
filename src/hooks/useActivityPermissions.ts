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
  const { employee, can } = useAuth();

  const isAdmin = can('pessoa:editar-papel');
  const isPM = isProjectManager(project, employee?.id);
  const isMember = isProjectTeamMember(project, employee?.id);
  /**
   * Espelha `can_manage_project`: gerente responsável OU `projeto:gerir-qualquer`.
   * Antes esta linha era `isAdmin || isPM`, e passou a divergir do banco quando o escopo
   * por projeto entrou — quem alcança projeto alheio é quem tem a capacidade, não quem
   * administra o sistema (PUL-201, TD-0018).
   */
  const canManage = can('projeto:gerir-qualquer') || isPM;

  /** Membro sem poder elevado neste projeto — mexe apenas no que é seu. */
  const isEmployee = isMember && !canManage;

  return {
    isAdmin,
    isPM,
    isMember,
    isEmployee,
    canManage,
    // Qualquer pessoa do time cria e move card: a policy de project_activity_cards é
    // tenant-wide, então restringir mais aqui esconderia o que o banco permite.
    canCreateCard: canManage || isMember,
    canMoveToProductBacklog: canManage || isMember,
    canMoveFromDone: canManage || isMember,
    /**
     * Configuração do quadro e tarefas de card.
     *
     * `project_activity_tasks` usa `can_manage_project` na escrita, então aqui a interface
     * espelha o banco. `project_activity_settings`, ao contrário, hoje tem policy apenas de
     * isolamento por cliente: a interface é DELIBERADAMENTE mais estreita que a RLS nesse
     * ponto, o que esconde o que o banco permitiria. Está registrado como achado — a
     * direção segura é esta, mas a policy é que devia restringir.
     */
    canAccessSettings: canManage,
  };
}
