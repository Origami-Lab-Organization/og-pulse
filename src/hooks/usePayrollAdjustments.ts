import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { terminationService } from '@/services/terminationService';
import { PayrollAdjustmentFormData } from '@/types/termination';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

// ─── List adjustments with totals ─────────────────────────────
export const usePayrollAdjustments = (terminationId: string | undefined) => {
  return useQuery({
    queryKey: ['payroll-adjustments', terminationId],
    queryFn: () => terminationService.getPayrollAdjustments(terminationId!),
    enabled: !!terminationId,
    staleTime: 3 * 60 * 1000,
  });
};

// ─── Add adjustment ───────────────────────────────────────────
export const useAddAdjustment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: PayrollAdjustmentFormData) =>
      terminationService.addPayrollAdjustment(data),

    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-adjustments', vars.termination_id] });
      queryClient.invalidateQueries({ queryKey: ['termination', vars.termination_id] });
      toast({ title: 'Ajuste adicionado' });
    },

    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar ajuste', description: error.message, variant: 'destructive' });
    },
  });
};

// ─── Update adjustment ────────────────────────────────────────
export const useUpdateAdjustment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      adjustmentId,
      terminationId,
      updates,
    }: {
      adjustmentId: string;
      terminationId: string;
      updates: Partial<PayrollAdjustmentFormData>;
    }) => terminationService.updatePayrollAdjustment(adjustmentId, updates),

    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-adjustments', vars.terminationId] });
      queryClient.invalidateQueries({ queryKey: ['termination', vars.terminationId] });
      toast({ title: 'Ajuste atualizado' });
    },

    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar ajuste', description: error.message, variant: 'destructive' });
    },
  });
};

// ─── Delete adjustment ────────────────────────────────────────
export const useDeleteAdjustment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ adjustmentId, terminationId }: { adjustmentId: string; terminationId: string }) =>
      terminationService.deletePayrollAdjustment(adjustmentId),

    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['payroll-adjustments', vars.terminationId] });
      queryClient.invalidateQueries({ queryKey: ['termination', vars.terminationId] });
      toast({ title: 'Ajuste removido' });
    },

    onError: (error: Error) => {
      toast({ title: 'Erro ao remover ajuste', description: error.message, variant: 'destructive' });
    },
  });
};

// ─── Auto-calculate termination values ────────────────────────
export const useCalculateTerminationValues = (
  employeeId: string | undefined,
  terminationDate: string | undefined
) => {
  return useQuery({
    queryKey: ['termination-calc', employeeId, terminationDate],
    queryFn: async () => {
      if (!employeeId || !terminationDate) return null;

      const { data: emp, error } = await supabase
        .from('employees')
        .select('salario_mensal, data_admissao, tipo_contratacao, ferias, decimo_terceiro, fgts')
        .eq('id', employeeId)
        .single();

      if (error || !emp) throw new Error('Funcionário não encontrado');

      const admissao = new Date(emp.data_admissao);
      const desligamento = new Date(terminationDate);
      const diffMs = desligamento.getTime() - admissao.getTime();
      const monthsWorked = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44)));
      const salario = Number(emp.salario_mensal);

      // Meses restantes no ano
      const monthInYear = desligamento.getMonth() + 1;

      // Saldo de salário (proporcional ao mês)
      const dayInMonth = desligamento.getDate();
      const daysInMonth = new Date(desligamento.getFullYear(), desligamento.getMonth() + 1, 0).getDate();
      const salaryBalance = (salario / daysInMonth) * dayInMonth;

      // 13º proporcional
      const thirteenthProp = (salario / 12) * monthInYear;

      // Férias proporcionais + 1/3
      const vacationMonths = monthsWorked % 12;
      const vacationProp = (salario / 12) * vacationMonths;
      const vacationBonus = vacationProp / 3;

      // FGTS (8% sobre remuneração)
      const fgtsBalance = salario * 0.08 * monthsWorked;
      const fgtsFine40 = fgtsBalance * 0.4;

      return {
        salaryBalance: Math.round(salaryBalance * 100) / 100,
        thirteenthProportional: Math.round(thirteenthProp * 100) / 100,
        vacationProportional: Math.round(vacationProp * 100) / 100,
        vacationBonus: Math.round(vacationBonus * 100) / 100,
        fgtsBalance: Math.round(fgtsBalance * 100) / 100,
        fgtsFine40: Math.round(fgtsFine40 * 100) / 100,
        monthsWorked,
        totalEstimated: Math.round(
          (salaryBalance + thirteenthProp + vacationProp + vacationBonus + fgtsFine40) * 100
        ) / 100,
      };
    },
    enabled: !!employeeId && !!terminationDate,
    staleTime: 10 * 60 * 1000,
  });
};
