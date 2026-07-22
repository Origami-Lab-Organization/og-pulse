import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalidação cruzada única de TODAS as leituras que projetam a mesma fonte de
 * verdade de alocação (`project_role_allocations` / `project_members` /
 * `timesheet_entries`). Chamada por QUALQUER caminho de escrita de plan/alocação/
 * desalocação — aba Equipe e Tela de Alocação — para que uma edição em uma
 * superfície reflita imediatamente na outra (mesma sessão), sem reload.
 *
 * Fonte única de invalidação (spec de sincronização §4.2 / §9.3): em vez de cada
 * tela invalidar um subconjunto próprio (o que causava divergência), todas
 * passam por aqui. Invalida por prefixo de chave — cobre todas as variações
 * (por projeto, por funcionário, por período) numa só chamada.
 */
export function invalidateAllocationQueries(queryClient: QueryClient): void {
  const keys = [
    // Aba Equipe (projeto)
    ['project-allocations'],
    ['project-allocations-filled-roles'],
    ['project-team-rows'],
    ['project-realized-hours'],
    ['project-team-financials'],
    // Tela de Alocação (lista + detalhe/painel)
    ['allocation-employee-month-summary'],
    ['allocation-employee-detail'],
    ['allocation-grid'],
    ['allocation-overview-planner'],
    ['allocation-panel'],
    // Disponibilidade / capacidade cross-projeto
    ['employee-availability'],
    ['employee-monthly-load'],
    ['tenant-monthly-capacity-summary'],
    // Timesheet: projetos lançáveis + pré-preenchimento derivam do plan/alocação
    ['my-project-memberships'],
    ['timesheet-prefill'],
  ];
  keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
}
