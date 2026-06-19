import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// FUNC-J2 — estado do onboarding do funcionário logado.
// Defensivo: se a coluna ainda não existir (migration pendente) ou a consulta
// falhar, assume `completed: true` para NUNCA forçar onboarding indevidamente
// nem bloquear a navegação.

const onboardingKey = (employeeId: string | undefined) => ['onboarding-status', employeeId];

interface OnboardingStatus {
  completed: boolean;
}

export function useOnboardingStatus() {
  const { employee } = useAuth();

  return useQuery<OnboardingStatus>({
    queryKey: onboardingKey(employee?.id),
    enabled: !!employee?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('onboarding_completed')
        .eq('id', employee!.id)
        .maybeSingle();

      if (error || !data) return { completed: true };
      return { completed: Boolean(data.onboarding_completed) };
    },
  });
}

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async () => {
      // RPC fora dos tipos gerados — segue o cast já usado no projeto.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('complete_onboarding');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.setQueryData<OnboardingStatus>(onboardingKey(employee?.id), { completed: true });
      queryClient.invalidateQueries({ queryKey: onboardingKey(employee?.id) });
    },
  });
}
