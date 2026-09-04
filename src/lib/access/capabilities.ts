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
  'ferias:aprovar',
  'ferias:gerir',
  'ferias:solicitar',
  'financeiro:editar',
  'financeiro:ler',
  'folha:ler',
  'guardrail-estrategia:editar',
  'horas-projeto:ler',
  'iniciativa:editar',
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
