import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { EmpresaReceita, OrdenacaoReceita, PaginaReceita } from '@/lib/prospecting/empresasReceita';

/**
 * Uma página da base da Receita (US-0002, ADR-0053).
 *
 * A base mora na VPS; o Supabase não guarda nada dela. A Edge Function `empresas-receita`
 * confere a sessão e `prospeccao:ler` (401/403 quando falta) e só então consulta a VPS. O erro
 * sobe tipado para a tela separar "sem permissão" de "base fora do ar": as duas como lista
 * vazia seriam indistinguíveis de "não há empresas".
 */

export const POR_PAGINA_RECEITA = 25;
/** A navegação vai até aqui; depois, os filtros (limite também na Edge Function, ADR-0053). */
export const LIMITE_DE_NAVEGACAO = 10_000;

export type FalhaDaBase = 'sem_permissao' | 'indisponivel';

export class ErroDaBase extends Error {
  constructor(readonly falha: FalhaDaBase) {
    super(falha === 'sem_permissao' ? 'Sem permissão para ver a base da Receita.' : 'A base da Receita está indisponível agora.');
  }
}

interface RespostaDaRpc {
  total: number | null;
  carregada_em: string | null;
  linhas: EmpresaReceita[] | null;
}

const STATUS_SEM_PERMISSAO = new Set([401, 403]);

function falhaDe(erro: unknown): FalhaDaBase {
  const status = erro instanceof FunctionsHttpError ? (erro.context as Response).status : 0;
  return STATUS_SEM_PERMISSAO.has(status) ? 'sem_permissao' : 'indisponivel';
}

async function buscarPagina(ordenacao: OrdenacaoReceita, pagina: number): Promise<PaginaReceita> {
  const { data, error } = await supabase.functions.invoke('empresas-receita', {
    body: { ordem: ordenacao.ordem, crescente: ordenacao.crescente, pagina },
  });
  if (error) throw new ErroDaBase(falhaDe(error));
  const resposta = data as RespostaDaRpc;
  return { total: resposta.total, carregadaEm: resposta.carregada_em, linhas: resposta.linhas ?? [] };
}

export function useEmpresasReceita(ordenacao: OrdenacaoReceita, pagina: number) {
  return useQuery({
    queryKey: ['receita-empresas', ordenacao.ordem, ordenacao.crescente, pagina],
    queryFn: () => buscarPagina(ordenacao, pagina),
    // Trocar de página ou de ordem mantém a lista anterior na tela até a nova chegar.
    placeholderData: keepPreviousData,
    // A base muda só na carga (ADR-0053): nada a buscar de novo a cada foco de janela.
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    // Sem permissão não muda tentando de novo.
    retry: (tentativas, erro) => !(erro instanceof ErroDaBase && erro.falha === 'sem_permissao') && tentativas < 2,
  });
}
