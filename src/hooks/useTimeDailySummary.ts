import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TimeDailySummary {
  id: string;
  data: string;
  horas_trabalhadas: number;
  horas_previstas: number;
  saldo_dia: number;
  horas_extras: number;
  status: 'normal' | 'atraso' | 'falta' | 'incompleto' | 'ferias' | 'atestado';
}

export const useTodaySummary = (employeeId: string | undefined) => {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['time-daily-summary', employeeId, today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_daily_summary')
        .select('id, data, horas_trabalhadas, horas_previstas, saldo_dia, horas_extras, status')
        .eq('employee_id', employeeId)
        .eq('data', today)
        .maybeSingle();

      if (error) throw error;
      return data as TimeDailySummary | null;
    },
    enabled: !!employeeId,
  });
};

export const useMonthSummary = (employeeId: string | undefined, monthStart: string, monthEnd: string) => {
  return useQuery({
    queryKey: ['time-daily-summary-range', employeeId, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_daily_summary')
        .select('id, data, horas_trabalhadas, horas_previstas, saldo_dia, horas_extras, status')
        .eq('employee_id', employeeId)
        .gte('data', monthStart)
        .lte('data', monthEnd)
        .order('data', { ascending: true });

      if (error) throw error;
      return (data || []) as TimeDailySummary[];
    },
    enabled: !!employeeId,
  });
};
