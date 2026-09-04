/**
 * Capacidades no cliente (ADR-0027, Cenário 4 da PUL-201).
 *
 * A tela consulta capacidade para decidir o que RENDERIZAR — a barreira continua sendo a
 * policy de RLS, que lê as mesmas linhas via `has_capability`. Esconder uma rota aqui e
 * esquecer a policy não protege nada; expor uma rota aqui sem a policy só mostra um erro.
 *
 * O vocabulário é fixo em código (seeded por migration); o que muda em runtime é quem tem
 * cada capacidade. A união de tipos abaixo faz um erro de digitação em `requireCapability`
 * falhar na compilação em vez de esconder a tela de todo mundo em silêncio.
 */
export const CAPABILITY_KEYS = [
  'alocacao:editar',
  'alocacao:ler',
  'alocacao:ler-tudo',
  'arquivo-projeto:ler',
  'candidatura:ler',
  'catalogo:editar',
  'catalogo:ler',
  'cliente:editar',
  'cliente:ler',
  'configuracao:editar',
  'curriculo:ler',
  'custo-hora:ler',
  'custo-hora:ler-relatorio',
  'desligamento:executar',
  'estrategia:editar',
  'ferias:administrar',
  'ferias:aprovar',
  'ferias:gerir',
  'ferias:solicitar',
  'financeiro:editar',
  'financeiro:ler',
  'folha:ler',
  'guardrail-estrategia:editar',
  'horas-projeto:ler',
  'iniciativa:editar',
  'lancamento:desfazer',
  'marca:editar',
  'margem:ler',
  'margem:ler-detalhe-mao-de-obra',
  'okr:editar',
  'orcamento:editar',
  'orcamento:ler',
  'parametro-folha:ler',
  'pessoa:administrar',
  'pessoa:editar',
  'pessoa:editar-elegibilidade-alocacao',
  'pessoa:editar-papel',
  'pessoa:ler-ficha-completa',
  'pessoa:ler-identidade',
  'pipeline:editar',
  'pipeline:ler',
  'ponto:aprovar',
  'ponto:auditar',
  'ponto:configurar',
  'ponto:ler-proprio',
  'ponto:ler-relatorio',
  'ponto:ler-terceiro',
  'ponto:travar-periodo',
  'portfolio:ler',
  'projeto:editar',
  'projeto:gerir-qualquer',
  'projeto:ler',
  'remuneracao-pessoa:editar',
  'remuneracao-pessoa:ler',
  'timesheet-proprio:apontar',
  'timesheet-terceiro:editar',
  'timesheet-terceiro:ler',
  'vaga:editar',
] as const;

export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];

/** Uma capacidade, ou uma lista em que QUALQUER uma basta. */
export type CapabilityRequirement = CapabilityKey | readonly CapabilityKey[];

/**
 * `required` ausente significa "sem exigência" — a rota/aba é para todo mundo autenticado.
 * Com lista, basta ter uma (uma aba "Análises" aparece para quem lê financeiro OU comercial).
 */
export function hasAnyCapability(
  granted: ReadonlySet<string> | readonly string[],
  required?: CapabilityRequirement,
): boolean {
  if (required === undefined) return true;
  const set = granted instanceof Set ? granted : new Set(granted);
  const list = typeof required === 'string' ? [required] : required;
  return list.some((key) => set.has(key));
}

/**
 * As três conveniências de leitura que sobreviveram ao mecanismo antigo de papel
 * (PUL-206), cada uma atrelada à capacidade que era equivalente ao papel: gerir
 * perfis era o que só admin fazia, editar projeto era admin ou gerente, e ler
 * candidatura era admin ou RH.
 */
export const LEGACY_ROLE_CAPABILITY = {
  isAdmin: 'pessoa:editar-papel',
  isManager: 'projeto:editar',
  isRH: 'candidatura:ler',
} as const;

export type LegacyRoleFlags = { isAdmin: boolean; isManager: boolean; isRH: boolean };

export function deriveLegacyRoleFlags(granted: readonly string[]): LegacyRoleFlags {
  const set = new Set(granted);
  return {
    isAdmin: set.has(LEGACY_ROLE_CAPABILITY.isAdmin),
    isManager: set.has(LEGACY_ROLE_CAPABILITY.isManager),
    isRH: set.has(LEGACY_ROLE_CAPABILITY.isRH),
  };
}

export type CapabilityResolution = {
  capabilities: string[];
  /**
   * `true` = o conjunto veio do banco agora. `false` = não deu para confirmar, e o
   * que está aqui é o último conjunto conhecido (ou nada).
   */
  confirmed: boolean;
};

/**
 * Uma consulta que falha NÃO é a mesma coisa que uma pessoa sem capacidade.
 *
 * Tratar as duas como iguais foi o que fez o deploy de PUL-206 esconder as abas de
 * quem era admin: o front antigo perdeu a fonte de papel no meio do build e a
 * interface leu o silêncio como "essa pessoa não pode nada". Sem confirmação, vale
 * o último conjunto conhecido — a RLS continua sendo a barreira de verdade, então o
 * pior caso é mostrar uma aba que o banco vai negar, e não sumir com o sistema.
 */
export function resolveCapabilities(
  fetched: readonly string[] | null,
  lastKnown?: readonly string[] | null,
): CapabilityResolution {
  if (fetched !== null) return { capabilities: [...fetched], confirmed: true };
  if (lastKnown && lastKnown.length > 0) return { capabilities: [...lastKnown], confirmed: false };
  return { capabilities: [], confirmed: false };
}
