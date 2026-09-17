/**
 * Qual versão da configuração financeira valia numa data (PUL-260).
 *
 * Fica separado do serviço porque telas que precisam de VÁRIAS datas — a evolução mensal
 * resolve doze meses — buscam a lista de versões uma vez e resolvem cada mês aqui, sem uma
 * ida ao banco por mês. A regra é a mesma de `public.financial_settings_at` no Postgres: a
 * versão de maior `effective_from` que não seja posterior à data.
 *
 * Sem versão anterior à data devolve `null`, e não a mais antiga: quem pergunta pela meta de
 * um mês anterior à primeira configuração da empresa não tinha meta, e inventar uma seria
 * pior do que não ter. Quem chama decide o default.
 */

/** Só o que a regra precisa — assim serve tanto à versão completa quanto a um recorte. */
interface ComVigencia {
  effective_from: string;
}

export function versaoVigenteEm<T extends ComVigencia>(
  versoes: readonly T[],
  data: string,
): T | null {
  let vigente: T | null = null;
  for (const versao of versoes) {
    if (versao.effective_from > data) continue;
    if (vigente === null || versao.effective_from > vigente.effective_from) vigente = versao;
  }
  return vigente;
}
