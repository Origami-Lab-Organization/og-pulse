import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TimeBankLedgerEntry {
  id: string;
  data: string;
  tipo: 'credito' | 'debito';
  horas: number;
  saldo_acumulado: number;
  origem: string;
}

export const useTimeBankBalance = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['time-bank-balance', employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_bank_ledger')
        .select('id, data, tipo, horas, saldo_acumulado, origem')
        .eq('employee_id', employeeId)
        .order('data', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data as TimeBankLedgerEntry | null)?.saldo_acumulado ?? 0;
    },
    enabled: !!employeeId,
  });
};

export const useTimeBankLedger = (employeeId: string | undefined, monthStart: string, monthEnd: string) => {
  return useQuery({
    queryKey: ['time-bank-ledger', employeeId, monthStart, monthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_bank_ledger')
        .select('id, data, tipo, horas, saldo_acumulado, origem')
        .eq('employee_id', employeeId)
        .gte('data', monthStart)
        .lte('data', monthEnd)
        .order('data', { ascending: true });

      if (error) throw error;
      return (data || []) as TimeBankLedgerEntry[];
    },
    enabled: !!employeeId,
  });
};
