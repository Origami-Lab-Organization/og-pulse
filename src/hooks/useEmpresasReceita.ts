import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { EmpresaReceita, OrdenacaoReceita, PaginaReceita, TotalReceita } from '@/lib/prospecting/empresasReceita';
import type { CnaeEncontrado, FiltrosReceita } from '@/types/filtrosReceita';

/**
 * A base da Receita na tela Empresas (US-0002, US-0003, ADR-0053).
 *
 * A base mora na VPS; o Supabase não guarda nada dela. A Edge Function `empresas-receita`
 * confere a sessão e `prospeccao:ler` (401/403 quando falta) e só então consulta a VPS. O erro
 * sobe tipado para a tela separar "sem permissão" de "base fora do ar": as duas como lista
 * vazia seriam indistinguíveis de "não há empresas".
 *
 * A página e o total são consultas separadas: a lista aparece sem esperar a contagem.
 * `busca` (US-0005) é o CNPJ ou o texto já validado por `buscaDoPedido`; sem busca, só filtros.
 */

export const POR_PAGINA_RECEITA = 25;
/** A navegação vai até aqui; depois, os filtros (limite também na Edge Function, ADR-0053). */
export const LIMITE_DE_NAVEGACAO = 10_000;

export type FalhaDaBase = 'sem_permissao' | 'indisponivel';

export const SEM_PERMISSAO: FalhaDaBase = 'sem_permissao';
const INDISPONIVEL: FalhaDaBase = 'indisponivel';

export class ErroDaBase extends Error {
  constructor(readonly falha: FalhaDaBase) {
    super(falha === SEM_PERMISSAO ? 'Sem permissão para ver a base da Receita.' : 'A base da Receita está indisponível agora.');
  }
}

const STATUS_SEM_PERMISSAO = new Set([401, 403]);

function falhaDe(erro: unknown): FalhaDaBase {
  const status = erro instanceof FunctionsHttpError ? (erro.context as Response).status : 0;
  return STATUS_SEM_PERMISSAO.has(status) ? SEM_PERMISSAO : INDISPONIVEL;
}

async function chamar<T>(corpo: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('empresas-receita', { body: corpo });
  if (error) throw new ErroDaBase(falhaDe(error));
  return data as T;
}

// A base muda só na carga (ADR-0053): nada a buscar de novo a cada foco de janela.
const DA_BASE = {
  staleTime: 10 * 60 * 1000,
  refetchOnWindowFocus: false,
  // Sem permissão não muda tentando de novo.
  retry: (tentativas: number, erro: Error) => !(erro instanceof ErroDaBase && erro.falha === SEM_PERMISSAO) && tentativas < 2,
} as const;

interface RespostaDaPagina {
  total_da_base: number | null;
  carregada_em: string | null;
  linhas: EmpresaReceita[] | null;
}

export function useEmpresasReceita(filtros: FiltrosReceita, ordenacao: OrdenacaoReceita, pagina: number, busca?: string) {
  return useQuery({
    queryKey: ['receita-empresas', filtros, busca ?? '', ordenacao.ordem, ordenacao.crescente, pagina],
    queryFn: async (): Promise<PaginaReceita> => {
      const r = await chamar<RespostaDaPagina>({ ordem: ordenacao.ordem, crescente: ordenacao.crescente, pagina, filtros, busca });
      return { totalDaBase: r.total_da_base, carregadaEm: r.carregada_em, linhas: r.linhas ?? [] };
    },
    // Trocar de página, ordem ou filtro mantém a lista anterior na tela até a nova chegar.
    placeholderData: keepPreviousData,
    ...DA_BASE,
  });
}

export function useTotalReceita(filtros: FiltrosReceita, busca?: string) {
  return useQuery({
    queryKey: ['receita-empresas-total', filtros, busca ?? ''],
    queryFn: () => chamar<TotalReceita>({ modo: 'total', filtros, busca }),
    ...DA_BASE,
  });
}

/** CNAEs pelo código ou pela descrição, para o campo de CNAE (a partir de 2 caracteres). */
export function useCnaesReceita(termo: string) {
  const limpo = termo.trim();
  return useQuery({
    queryKey: ['receita-cnaes', limpo],
    queryFn: async () => (await chamar<{ cnaes: CnaeEncontrado[] }>({ modo: 'cnaes', termo: limpo })).cnaes,
    enabled: limpo.length >= 2,
    placeholderData: keepPreviousData,
    ...DA_BASE,
  });
}
