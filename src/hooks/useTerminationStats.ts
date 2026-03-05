import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

interface TerminationStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  totalCost: number;
  byType: Record<string, number>;
  byMonth: { month: string; count: number }[];
}

export const useTerminationStats = (period?: { from?: string; to?: string }) => {
  const query = useQuery({
    queryKey: ['termination-stats', period],
    queryFn: async (): Promise<TerminationStats> => {
      let q = supabase
        .from('employee_terminations')
        .select('id, status, termination_type, termination_date, created_at');

      if (period?.from) {
        q = q.gte('termination_date', period.from);
      }
      if (period?.to) {
        q = q.lte('termination_date', period.to);
      }

      const { data, error } = await q;
      if (error) throw new Error('Falha ao buscar estatísticas');

      const rows = data || [];

      const pending = rows.filter(r => r.status === 'pending').length;
      const inProgress = rows.filter(r => r.status === 'in_progress').length;
      const completed = rows.filter(r => r.status === 'completed').length;
      const cancelled = rows.filter(r => r.status === 'cancelled').length;

      // By type
      const byType: Record<string, number> = {};
      rows.forEach(r => {
        byType[r.termination_type] = (byType[r.termination_type] || 0) + 1;
      });

      // By month
      const monthMap: Record<string, number> = {};
      rows.forEach(r => {
        const m = r.termination_date?.substring(0, 7); // YYYY-MM
        if (m) monthMap[m] = (monthMap[m] || 0) + 1;
      });
      const byMonth = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count }));

      // Total cost from payroll adjustments for completed terminations
      const completedIds = rows.filter(r => r.status === 'completed').map(r => r.id);
      let totalCost = 0;

      if (completedIds.length > 0) {
        const { data: adjustments } = await supabase
          .from('payroll_adjustments')
          .select('amount, is_credit')
          .in('termination_id', completedIds);

        if (adjustments) {
          totalCost = adjustments.reduce((sum, a) => {
            return sum + (a.is_credit ? Number(a.amount) : -Number(a.amount));
          }, 0);
        }
      }

      return {
        total: rows.length,
        pending,
        inProgress,
        completed,
        cancelled,
        totalCost,
        byType,
        byMonth,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  return query;
};
