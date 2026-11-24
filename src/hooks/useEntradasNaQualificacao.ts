import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchEntradasNaQualificacao } from '@/services/qualificacaoService';

const NENHUMA = new Map<string, string>();

/** Data da última entrada em Qualificação de cada oportunidade da aba (US-0042). */
export function useEntradasNaQualificacao(ids: string[]): Map<string, string> {
  const chave = useMemo(() => [...ids].sort(), [ids]);
  const { data } = useQuery({
    queryKey: ['entradas-na-qualificacao', chave],
    queryFn: () => fetchEntradasNaQualificacao(chave),
    enabled: chave.length > 0,
    staleTime: 60_000,
  });
  return data ?? NENHUMA;
}
