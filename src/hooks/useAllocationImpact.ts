import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { equipeService } from '@/services/equipeService';
import { AllocationMarginImpact, SimulationMonth } from '@/types/equipe.types';

interface UseAllocationImpactParams {
  projectId: string;
  employeeId: string | undefined;
  months: SimulationMonth[];
  /** Só admin e GP do projeto abrem o painel — a RLS da RPC reforça no servidor. */
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * Simula o impacto na margem da alocação em composição, com debounce para não
 * metralhar a RPC a cada tecla nas horas (spec §5.3, ~400ms). Devolve apenas os
 * agregados de AllocationMarginImpact — nenhum dado salarial cru.
 */
export function useAllocationImpact({
  projectId,
  employeeId,
  months,
  enabled = true,
  debounceMs = 400,
}: UseAllocationImpactParams) {
  // Assinatura estável dos meses com horas > 0 (a RPC ignora meses zerados no custo,
  // mas mandamos só o que importa para a chave e o payload).
  const signature = useMemo(
    () =>
      months
        .filter((m) => m.hours > 0)
        .map((m) => `${m.year}-${m.month}:${m.hours}`)
        .join('|'),
    [months],
  );

  const [debouncedSignature, setDebouncedSignature] = useState(signature);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    timer.current = setTimeout(() => setDebouncedSignature(signature), debounceMs);
    return () => clearTimeout(timer.current);
  }, [signature, debounceMs]);

  const payloadMonths = useMemo(
    () => months.filter((m) => m.hours > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedSignature],
  );

  const isEnabled = enabled && !!projectId && !!employeeId && payloadMonths.length > 0;

  return useQuery({
    queryKey: ['allocation-impact', projectId, employeeId, debouncedSignature],
    queryFn: async (): Promise<AllocationMarginImpact | null> => {
      if (!employeeId) return null;
      return equipeService.simulateAllocationImpact(projectId, employeeId, payloadMonths);
    },
    enabled: isEnabled,
    staleTime: 30_000,
    // Falha rápido: se a RPC não existir/negar, mostramos o estado de erro em vez
    // de ficar em loading eterno.
    retry: 1,
  });
}
