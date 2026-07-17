import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EmployeeJornadaOverview {
  employeeId: string;
  nome: string;
  cargo: string;
  horasExtrasMes: number;
  faltasMes: number;
  saldoAcumulado: number;
}

export const useEmployeesJornadaOverview = (monthStart: string, monthEnd: string) => {
  const { employee } = useAuth();

  return useQuery({
    queryKey: ['employees-jornada-overview', employee?.tenant_id, monthStart, monthEnd],
    queryFn: async () => {
      const [{ data: employees, error: employeesError }, { data: summaries, error: summariesError }, { data: ledger, error: ledgerError }] =
        await Promise.all([
          supabase.from('employees').select('id, nome, cargo').eq('status', 'ativo').order('nome'),
          supabase
            .from('time_daily_summary')
            .select('employee_id, horas_extras, status')
            .gte('data', monthStart)
            .lte('data', monthEnd),
          supabase
            .from('time_bank_ledger')
            .select('employee_id, data, saldo_acumulado, created_at')
            .order('data', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1000),
        ]);

      if (employeesError) throw employeesError;
      if (summariesError) throw summariesError;
      if (ledgerError) throw ledgerError;

      const extrasPorFuncionario = new Map<string, number>();
      const faltasPorFuncionario = new Map<string, number>();
      for (const s of summaries || []) {
        extrasPorFuncionario.set(s.employee_id, (extrasPorFuncionario.get(s.employee_id) ?? 0) + Number(s.horas_extras || 0));
        if (s.status === 'falta') {
          faltasPorFuncionario.set(s.employee_id, (faltasPorFuncionario.get(s.employee_id) ?? 0) + 1);
        }
      }

      const saldoPorFuncionario = new Map<string, number>();
      for (const entry of ledger || []) {
        if (!saldoPorFuncionario.has(entry.employee_id)) {
          saldoPorFuncionario.set(entry.employee_id, entry.saldo_acumulado);
        }
      }

      return (employees || []).map((emp): EmployeeJornadaOverview => ({
        employeeId: emp.id,
        nome: emp.nome,
        cargo: emp.cargo,
        horasExtrasMes: extrasPorFuncionario.get(emp.id) ?? 0,
        faltasMes: faltasPorFuncionario.get(emp.id) ?? 0,
        saldoAcumulado: saldoPorFuncionario.get(emp.id) ?? 0,
      }));
    },
    enabled: !!employee?.tenant_id,
  });
};
