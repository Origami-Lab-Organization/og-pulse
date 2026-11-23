import { useQuery } from '@tanstack/react-query';
import { fetchResponsaveisDaProspeccao } from '@/services/responsaveisService';

const DEZ_MINUTOS = 10 * 60 * 1000;

/** Quem pode ser responsável por uma oportunidade (18/11/2026): ativos com `prospeccao:editar`. */
export function useResponsaveisDaProspeccao(enabled = true) {
  return useQuery({
    queryKey: ['prospeccao-responsaveis'],
    queryFn: fetchResponsaveisDaProspeccao,
    staleTime: DEZ_MINUTOS,
    enabled,
  });
}
