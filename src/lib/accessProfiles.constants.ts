/**
 * Consultas que mostram o papel de exibição da pessoa (`employees.system_role`).
 *
 * O papel é projeção do perfil de acesso, recalculada por gatilho quando muda o perfil da
 * pessoa ou a matriz do perfil (20260904280000). Quem altera perfis precisa descartar
 * estas consultas, senão a lista de gerentes do formulário de projeto continua a de antes
 * da mudança até o cache vencer.
 */
export const CONSULTAS_COM_PAPEL_DA_PESSOA = [
  ['employees'],
  ['employee'],
  ['profile-name-for-user'],
] as const;

/** Por que alguém aparece como gerente: a capacidade, não o nome do perfil (ADR-0027). */
export const REGRA_GERENTE_DO_PROJETO =
  'Aparece aqui quem tem "Editar projeto" no perfil de acesso.';

export const SEM_GERENTE_DISPONIVEL =
  'Nenhum gerente disponível. Em Perfis de acesso, ligue "Editar projeto" no perfil da pessoa.';
