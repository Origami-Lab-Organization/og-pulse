import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { summarizePlatformUsage } from '@/lib/platformUsage';
import type { PlatformUsageRow, PlatformUsageSummary } from '@/types/platformUsage';

/**
 * Uso dos clientes (PUL-258, ADR-0033).
 *
 * A autorização NÃO é aqui. Quem decide é `platform_tenant_usage()`, que exige estar no
 * tenant dono e ter `plataforma:ler-uso`, e levanta exceção quando não. A rota também exige
 * a capacidade, mas isso é conveniência de navegação: a barreira é a função.
 *
 * O erro sobe cru de propósito. Se a função recusar, quem abriu a tela precisa ver que
 * recusou — um painel de operação que mostra zero em silêncio é pior que um que falha.
 */

const PLATFORM_USAGE_KEY = 'platform-usage';

/** Sem o genérico do schema: a RPC nasceu nesta entrega. */
const db = supabase as unknown as SupabaseClient;

export function usePlatformUsage(): {
  summary: PlatformUsageSummary | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: [PLATFORM_USAGE_KEY],
    queryFn: async (): Promise<PlatformUsageSummary> => {
      const { data, error } = await db.rpc('platform_tenant_usage');
      if (error) throw new Error(error.message);
      // `now` entra por parâmetro para a regra ser pura e o número não mudar entre renders.
      return summarizePlatformUsage((data ?? []) as PlatformUsageRow[], new Date());
    },
    // Painel de operação, não de tempo real: recarregar a cada foco de janela custaria
    // uma varredura de todos os tenants sem ninguém pedir.
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    summary: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: () => void query.refetch(),
  };
}
