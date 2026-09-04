/**
 * Relação da pessoa com o projeto — espelho dos predicados que a RLS aplica.
 *
 * Capacidade responde "esta pessoa pode?"; relação responde "sobre qual registro?".
 * O ADR-0027 é explícito que escopo por registro nunca vira flag: é relação, e continua
 * na policy. Estes helpers existem para que o front faça a MESMA pergunta que o banco —
 * porque quando as duas divergem, a tela ou promete o que o banco nega (o usuário vê erro
 * em vez de ausência) ou esconde o que o banco liberaria (funcionalidade que some sem
 * explicação).
 *
 * Fonte de verdade de cada função está citada na doc. Se a policy mudar, este arquivo
 * muda junto — é o preço de duplicar o predicado, e a alternativa (uma chamada ao banco
 * por projeto renderizado) é pior.
 */
import type { ProjectWithRelations } from '@/types/project';

/**
 * Espelha a metade de relação de `can_manage_project(_user_id, _project_id)`
 * (hoje em supabase/migrations/20260904210000_capability_gerir_qualquer_projeto.sql):
 *
 *   has_capability(_user_id, tenant, 'projeto:gerir-qualquer')
 *   OR employees.auth_id = _user_id do employee em projects.manager_id
 *
 * Ou seja: **o único PM de um projeto é quem está em `projects.manager_id`.** Não existe
 * "PM por cargo" no banco.
 *
 * O `useActivityPermissions` considerava PM também quem fosse membro com `role` em
 * `['pm', 'gerente', 'project manager']`. `project_members.role` é TEXT livre, então isso
 * era frágil nos dois sentidos: "Gerente de Projetos" não casava com a lista, e quem
 * casava recebia da interface um poder que a policy recusa — a aba de configurações do
 * quadro escreve em `project_activity_settings`, cuja policy usa `can_manage_project`.
 * Resultado: botão visível, gravação negada.
 *
 * @param employeeId `employees.id` da pessoa (não o `auth_id` — o front compara pelo id
 *   do cadastro, que é o que `projects.manager_id` guarda).
 */
export function isProjectManager(
  project: Pick<ProjectWithRelations, 'manager_id'>,
  employeeId: string | undefined,
): boolean {
  if (!employeeId) return false;
  return project.manager_id === employeeId;
}

/**
 * Espelha `is_project_team_member(_user_id, _project_id)`
 * (supabase/migrations/20260811160000_project_files_member_access.sql):
 *
 *   existe alocação em project_role_allocations  OR  existe linha em project_members
 *
 * A segunda fonte é legada e sai na Fase 4 do ADR-0006; até lá as duas valem, porque
 * projetos anteriores ao cutover só existem em `project_members`.
 *
 * **Lacuna conhecida:** `ProjectWithRelations` carrega apenas `members` — o fetch em
 * `projectService.getById` popula de `project_members` e não traz `project_role_allocations`.
 * Então o front vê um subconjunto do que o banco considera membro: quem foi alocado só
 * pela fonte nova é membro para a RLS e não para a tela. O parâmetro `allocatedEmployeeIds`
 * existe para quando o fetch trouxer essa fonte — o helper já está correto, a lacuna é do
 * carregamento.
 */
export function isProjectTeamMember(
  project: Pick<ProjectWithRelations, 'members'>,
  employeeId: string | undefined,
  allocatedEmployeeIds?: readonly string[],
): boolean {
  if (!employeeId) return false;

  if (allocatedEmployeeIds?.includes(employeeId)) return true;

  return project.members?.some((m) => m.employee_id === employeeId) ?? false;
}

/**
 * Quem pode administrar o projeto: quem alcança qualquer projeto, ou o gerente responsável.
 *
 * É o predicado completo de `can_manage_project`. O terceiro argumento era `isAdmin`, e
 * isso deixou de espelhar o banco quando o escopo por projeto entrou (PUL-201/TD-0018):
 * quem alcança projeto alheio é quem tem `projeto:gerir-qualquer`, capacidade configurável
 * por perfil — não quem administra o sistema. Manter `isAdmin` aqui significaria que
 * desligar o interruptor na tela de perfis faria o banco negar sem a interface perceber:
 * o botão continuaria aparecendo e a gravação falharia.
 *
 * @param canManageAnyProject resultado de `can('projeto:gerir-qualquer')`.
 */
export function canManageProject(
  project: Pick<ProjectWithRelations, 'manager_id'>,
  employeeId: string | undefined,
  canManageAnyProject: boolean,
): boolean {
  return canManageAnyProject || isProjectManager(project, employeeId);
}
