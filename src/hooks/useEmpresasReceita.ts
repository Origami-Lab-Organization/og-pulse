import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { EmpresaReceita, OrdenacaoReceita, PaginaReceita } from '@/lib/prospecting/empresasReceita';

/**
 * Uma página da base da Receita (US-0002, ADR-0053).
 *
 * A autorização é da função `listar_empresas_receita`, que exige `prospeccao:ler` e responde
 * 42501 quando falta. O erro sobe tipado para a tela separar "sem permissão" de "base fora do
 * ar": as duas como lista vazia seriam indistinguíveis de "não há empresas".
 */

/** Sem o genérico do schema: a RPC nasceu nesta entrega. */
const db = supabase as unknown as SupabaseClient;

export const POR_PAGINA_RECEITA = 25;
/** A navegação vai até aqui; depois, os filtros (limite também na função, ADR-0053). */
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

async function buscarPagina(ordenacao: OrdenacaoReceita, pagina: number): Promise<PaginaReceita> {
  const { data, error } = await db.rpc('listar_empresas_receita', {
    p_ordem: ordenacao.ordem,
    p_crescente: ordenacao.crescente,
    p_pagina: pagina,
    p_por_pagina: POR_PAGINA_RECEITA,
  });
  if (error) throw new ErroDaBase(error.code === '42501' ? 'sem_permissao' : 'indisponivel');
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
