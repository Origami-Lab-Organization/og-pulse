import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Onboarding da nova grade de lançamento de horas.
 *
 * Regras de negócio (definidas pelo usuário):
 * - Aparece no máximo UMA VEZ por conta (novo ou não), persistido no banco
 *   (não em localStorage) — precisa valer entre dispositivos/navegadores.
 * - Nunca aparece a partir de 01/08/2026 (corte de 31/07/2026 inclusive),
 *   em hipótese alguma — inclusive a reabertura manual fica indisponível.
 *
 * Espelha o padrão já usado pelo onboarding geral do sistema
 * (`onboarding_completed` + RPC `complete_onboarding`, ver
 * supabase/migrations/20260618150000_employee_onboarding.sql), mas sem o
 * backfill "só novos usuários" — aqui vale para todo mundo até o corte.
 */

// 31/07/2026 23:59:59 (horário local) — depois disso, nunca mais aparece.
const HARD_CUTOFF = new Date('2026-08-01T00:00:00').getTime();

const statusKey = (employeeId: string | undefined) => ['timesheet-onboarding-status', employeeId];

interface TimesheetOnboardingStatus {
  seen: boolean;
}

function useTimesheetOnboardingStatus() {
  const { employee } = useAuth();

  return useQuery<TimesheetOnboardingStatus>({
    queryKey: statusKey(employee?.id),
    enabled: !!employee?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // TD-0008: coluna nova (migration 20260722000000), ainda fora dos tipos
      // gerados — cast defensivo até rodar `supabase gen types`.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('employees') as any)
        .select('timesheet_onboarding_seen')
        .eq('id', employee!.id)
        .maybeSingle();

      // Defensivo: se a coluna/consulta falhar, nunca força o onboarding.
      if (error || !data) return { seen: true };
      return { seen: Boolean(data.timesheet_onboarding_seen) };
    },
  });
}

function useCompleteTimesheetOnboarding() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async () => {
      // TD-0008: RPC fora dos tipos gerados — mesmo cast já usado em useOnboarding.ts.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('complete_timesheet_onboarding');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData<TimesheetOnboardingStatus>(statusKey(employee?.id), { seen: true });
      queryClient.invalidateQueries({ queryKey: statusKey(employee?.id) });
    },
  });
}

export function useTimesheetOnboarding() {
  const { data: status, isLoading } = useTimesheetOnboardingStatus();
  const complete = useCompleteTimesheetOnboarding();
  const [manuallyOpen, setManuallyOpen] = useState(false);

  const withinWindow = Date.now() < HARD_CUTOFF;
  const autoOpen = withinWindow && !isLoading && !!status && !status.seen;
  const open = autoOpen || (withinWindow && manuallyOpen);

  const dismiss = () => {
    setManuallyOpen(false);
    if (!status?.seen) complete.mutate();
  };

  // Reabertura manual ("Como funciona?"): só reexibe o passo a passo — nunca
  // desfaz a marca de "visto" no banco, então a regra de "uma vez" continua valendo.
  const reopen = () => {
    if (withinWindow) setManuallyOpen(true);
  };

  return { open, dismiss, reopen, canReopen: withinWindow };
}
