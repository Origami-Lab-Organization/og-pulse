/** Limite padrão de linhas por resposta do PostgREST no Supabase. */
export const LINHAS_POR_PAGINA = 1000;

type Pagina = PromiseLike<{ data: unknown[] | null; error: unknown }>;

/**
 * Lê todas as páginas de uma consulta.
 *
 * O PostgREST devolve no máximo 1000 linhas e corta o resto sem erro: uma soma de horas do
 * ano inteiro sairia menor, o custo menor e a margem maior, sem nada que denunciasse. A
 * consulta precisa de `.order(...)` por uma chave única (em geral `id`), senão as páginas
 * podem repetir ou pular linhas.
 */
export async function todasAsPaginas<T>(pagina: (de: number, ate: number) => Pagina): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; ; de += LINHAS_POR_PAGINA) {
    const { data, error } = await pagina(de, de + LINHAS_POR_PAGINA - 1);
    if (error) throw error;
    linhas.push(...((data ?? []) as T[]));
    if (!data || data.length < LINHAS_POR_PAGINA) return linhas;
  }
}
