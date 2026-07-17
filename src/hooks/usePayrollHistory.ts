import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePayrollProfile } from './usePayrollProfile';
import { useHolidays } from './useHolidays';
import { buildPayrollHistory, buildYearMonths, type PayrollHistoryEmployeeInput } from '@/lib/payrollHistory';
import type { ContractType } from '@/types/employee';

/**
 * Busca TODOS os colaboradores do tenant (inclusive desligados/arquivados —
 * `useEmployees()` já os exclui) mais desligamentos, ferramentas e benefícios,
 * para reconstruir a composição da folha em cada um dos últimos meses. RLS já
 * escopa por tenant, sem necessidade de filtro explícito (mesmo padrão de
 * `useTurnoverStats`).
 */
export function usePayrollHistory() {
  const { employee: currentEmployee } = useAuth();
  const tenantId = currentEmployee?.tenant_id;
  const { data: payrollProfile, isLoading: isLoadingProfile } = usePayrollProfile();
  const { data: holidays, isLoading: isLoadingHolidays } = useHolidays();

  const rawQuery = useQuery({
    queryKey: ['payroll-history-raw', tenantId],
    queryFn: async (): Promise<PayrollHistoryEmployeeInput[]> => {
      const [employeesRes, terminationsRes, toolsRes, benefitsRes] = await Promise.all([
        supabase
          .from('employees')
          .select('id, nome, cargo, status, tipo_contratacao, data_admissao, salario_mensal, bolsa_auxilio, valor_contrato_pj, pro_labore, dividendos'),
        supabase.from('employee_terminations').select('employee_id, termination_date, status'),
        supabase.from('employee_tools').select('employee_id, monthly_cost, is_active'),
        supabase.from('employee_benefits').select('employee_id, monthly_value, is_active'),
      ]);

      if (employeesRes.error) throw employeesRes.error;
      if (terminationsRes.error) throw terminationsRes.error;
      if (toolsRes.error) throw toolsRes.error;
      if (benefitsRes.error) throw benefitsRes.error;

      const terminationDates = new Map<string, string>();
      for (const t of terminationsRes.data || []) {
        if (t.status === 'cancelled' || !t.termination_date) continue;
        const current = terminationDates.get(t.employee_id);
        if (!current || t.termination_date < current) {
          terminationDates.set(t.employee_id, t.termination_date);
        }
      }

      const toolsByEmployee = new Map<string, number>();
      for (const tool of toolsRes.data || []) {
        if (tool.is_active === false) continue;
        toolsByEmployee.set(tool.employee_id, (toolsByEmployee.get(tool.employee_id) || 0) + Number(tool.monthly_cost));
      }

      const benefitsByEmployee = new Map<string, number>();
      for (const benefit of benefitsRes.data || []) {
        if (benefit.is_active === false) continue;
        benefitsByEmployee.set(
          benefit.employee_id,
          (benefitsByEmployee.get(benefit.employee_id) || 0) + Number(benefit.monthly_value),
        );
      }

      return (employeesRes.data || []).map((e) => ({
        id: e.id,
        nome: e.nome,
        cargo: e.cargo,
        status: e.status,
        tipoContratacao: (e.tipo_contratacao || 'CLT') as ContractType,
        dataAdmissao: e.data_admissao,
        salarioMensal: Number(e.salario_mensal) || 0,
        bolsaAuxilio: Number(e.bolsa_auxilio) || 0,
        valorContratoPj: Number(e.valor_contrato_pj) || 0,
        proLabore: Number(e.pro_labore) || 0,
        dividendos: Number(e.dividendos) || 0,
        totalBenefitsCost: benefitsByEmployee.get(e.id) || 0,
        totalToolsCost: toolsByEmployee.get(e.id) || 0,
        terminationDate: terminationDates.get(e.id) || null,
      }));
    },
    enabled: !!tenantId,
  });

  const months = useMemo(() => buildYearMonths(new Date()), []);

  const history = useMemo(() => {
    if (!rawQuery.data || !payrollProfile || !holidays) return [];
    return buildPayrollHistory(rawQuery.data, payrollProfile, months, holidays);
  }, [rawQuery.data, payrollProfile, months, holidays]);

  return { history, isLoading: rawQuery.isLoading || isLoadingProfile || isLoadingHolidays };
}
