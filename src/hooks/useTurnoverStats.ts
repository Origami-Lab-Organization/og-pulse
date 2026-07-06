import { useQuery } from '@tanstack/react-query';
import { format, eachMonthOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  calculateTurnover,
  type TurnoverEmployeeInput,
  type TurnoverTerminationInput,
  type TurnoverResult,
} from '@/lib/turnoverCalculator';

interface TurnoverPeriodInput {
  startDate: Date;
  endDate: Date;
}

/**
 * Estatísticas de turnover (rotatividade) para o período selecionado.
 *
 * Busca admissões (employees.data_admissao) e desligamentos
 * (employee_terminations) — ambos protegidos por RLS/tenant — e delega o cálculo
 * à regra pura em `turnoverCalculator`. Reconstrói o headcount histórico pelas
 * datas, então precisa de TODOS os colaboradores (inclusive desligados/arquivados).
 */
export const useTurnoverStats = (period: TurnoverPeriodInput) => {
  const start = format(period.startDate, 'yyyy-MM-dd');
  const end = format(period.endDate, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['turnover-stats', start, end],
    queryFn: async (): Promise<TurnoverResult> => {
      const [employeesRes, terminationsRes] = await Promise.all([
        supabase.from('employees').select('id, data_admissao'),
        supabase
          .from('employee_terminations')
          .select('employee_id, termination_date, termination_type, status'),
      ]);

      if (employeesRes.error || terminationsRes.error) {
        throw new Error('Falha ao buscar dados de turnover');
      }

      const employees: TurnoverEmployeeInput[] = (employeesRes.data || []).map((e) => ({
        id: e.id,
        dataAdmissao: e.data_admissao,
      }));

      const terminations: TurnoverTerminationInput[] = (terminationsRes.data || []).map((t) => ({
        employeeId: t.employee_id,
        terminationDate: t.termination_date,
        terminationType: t.termination_type,
        status: t.status,
      }));

      const months = eachMonthOfInterval({
        start: period.startDate,
        end: period.endDate,
      }).map((d) => format(d, 'yyyy-MM'));

      return calculateTurnover(employees, terminations, { start, end }, months);
    },
    staleTime: 5 * 60 * 1000,
  });
};
