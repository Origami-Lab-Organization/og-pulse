import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface TimeTrackingPeriodLock {
  id: string;
  ano: number;
  mes: number;
  fechado_em: string;
}

export const useTimeTrackingPeriodLocks = () => {
  const { employee } = useAuth();
  return useQuery({
    queryKey: ['time-tracking-period-locks', employee?.tenant_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_tracking_period_locks')
        .select('id, ano, mes, fechado_em')
        .order('ano', { ascending: false })
        .order('mes', { ascending: false });

      if (error) throw error;
      return (data || []) as TimeTrackingPeriodLock[];
    },
    enabled: !!employee?.tenant_id,
  });
};

export const useCloseTimeTrackingPeriod = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { employee } = useAuth();

  return useMutation({
    mutationFn: async ({ ano, mes }: { ano: number; mes: number }) => {
      if (!employee?.tenant_id) throw new Error('Tenant não identificado');

      const { error } = await supabase.from('time_tracking_period_locks').insert({
        tenant_id: employee.tenant_id,
        ano,
        mes,
        fechado_por: employee.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-tracking-period-locks'] });
      toast({
        title: 'Período fechado',
        description: 'Novas marcações e ajustes ficam bloqueados para este mês.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Não foi possível fechar o período',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useReopenTimeTrackingPeriod = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('time_tracking_period_locks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-tracking-period-locks'] });
      toast({
        title: 'Período reaberto',
        description: 'Marcações e ajustes voltaram a ser permitidos para este mês.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Não foi possível reabrir o período',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
