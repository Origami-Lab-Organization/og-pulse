import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { budgetService } from '@/services/budgetService';
import { projectService } from '@/services/projectService';
import { BudgetWithDetails } from '@/types/budget';
import { supabase } from '@/integrations/supabase/client';
import { leadActivityService } from '@/services/leadActivityService';
import { calculateCloseBusinessTotal, CloseBusinessInstallment } from '@/lib/closeBusinessFinancials';
import { ProjectType } from '@/types/project';

interface CloseBusinessInput {
  leadId: string;
  budget: BudgetWithDetails | null;
  managerId: string;
  paymentMethod: string;
  installmentsCount: number;
  dueDay: number;
  firstInvoiceDate?: string;
  startDate: string;
  endDate: string;
  serviceLine?: string;
  projectType?: string;
  renewalDate?: string;
  successFeePercent?: number;
  monthlyValue?: number;
  customInstallments?: CloseBusinessInstallment[];
  // No-budget mode fields
  projectName?: string;
  clientId?: string;
  totalValue?: number;
}

export function useCloseBusinessDeal() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async (input: CloseBusinessInput) => {
      if (!tenantId) throw new Error('Tenant não encontrado');

      const { budget, managerId, paymentMethod, installmentsCount, dueDay, firstInvoiceDate, startDate, endDate, serviceLine } = input;

      // --- No-budget mode (e.g. Financiamento da Inovação) ---
      if (!budget) {
        const projectName = input.projectName;
        const clientId = input.clientId;
        const totalValue = calculateCloseBusinessTotal({
          projectType: (input.projectType || 'fixed_scope') as ProjectType,
          installments: input.customInstallments,
          totalValue: input.totalValue || 0,
          monthlyValue: input.monthlyValue,
          successFeePercent: input.successFeePercent,
        });

        if (!projectName || !clientId) {
          throw new Error('Nome do projeto e cliente são obrigatórios');
        }

        const project = await projectService.create(
          {
            name: projectName,
            clientId,
            managerId,
            budgetId: undefined,
            startDate,
            endDate,
            isContinuous: input.projectType === 'continuous',
            totalValue,
            paymentMethod,
            installmentsCount,
            dueDay,
            firstInvoiceDate: input.projectType === 'continuous' ? firstInvoiceDate : undefined,
            status: 'planning',
            durationMonths: 1,
            renewalDate: input.renewalDate || undefined,
            successFeePercent: input.successFeePercent,
            serviceLine: serviceLine || undefined,
            leadId: input.leadId,
            customInstallments: input.customInstallments,
          },
          tenantId
        );

        return project;
      }

      // --- Standard mode (with budget) ---

      // 1. Update budget status to 'active'
      await budgetService.updateStatus(budget.id, 'active');

      // 2. Create project linked to budget
      const resolvedClientId = budget.client_id || input.clientId;
      if (!resolvedClientId) {
        throw new Error('Cliente é obrigatório para criar o projeto');
      }

      const projectTotalValue = calculateCloseBusinessTotal({
        projectType: (input.projectType || 'fixed_scope') as ProjectType,
        installments: input.customInstallments,
        totalValue: budget.final_total,
        monthlyValue: input.monthlyValue,
        successFeePercent: input.successFeePercent,
      });

      const project = await projectService.create(
        {
          name: budget.title,
          clientId: resolvedClientId,
          managerId,
          budgetId: budget.id,
          startDate,
          endDate,
          isContinuous: input.projectType === 'continuous',
          totalValue: projectTotalValue,
          paymentMethod,
          installmentsCount,
          dueDay,
          firstInvoiceDate: firstInvoiceDate || undefined,
          status: 'planning',
          durationMonths: budget.duration_months,
          renewalDate: input.renewalDate || undefined,
          successFeePercent: input.successFeePercent,
          serviceLine: serviceLine || undefined,
          leadId: input.leadId,
          customInstallments: input.customInstallments,
        },
        tenantId
      );

      // 4. Copy suppliers from budget to project_costs (recorrente) — J9-02
      for (const supplier of budget.suppliers || []) {
        const plannedTotal = Number(supplier.monthly_value) * budget.duration_months;
        const { data: projectCost, error: supplierError } = await supabase
          .from('project_costs')
          .insert({
            project_id: project.id,
            category: 'supplier',
            is_recurring: true,
            description: supplier.name,
            notes: supplier.description,
            monthly_amount: supplier.monthly_value,
            monthly_amount_brl: supplier.monthly_value,
            start_month: 1,
            end_month: budget.duration_months,
            original_currency: 'BRL',
            exchange_rate: 1,
            planned_amount: plannedTotal,
            planned_amount_brl: plannedTotal,
          })
          .select()
          .single();

        if (supplierError) {
          console.error('Error copying supplier:', supplierError);
          continue;
        }

        const monthInserts = [];
        for (let month = 1; month <= budget.duration_months; month++) {
          monthInserts.push({
            cost_id: projectCost.id,
            month_number: month,
            planned_value: supplier.monthly_value,
          });
        }

        if (monthInserts.length > 0) {
          const { error: monthsError } = await supabase
            .from('project_cost_months')
            .insert(monthInserts);

          if (monthsError) {
            console.error('Error creating supplier cost months:', monthsError);
          }
        }
      }

      // 5. Copy materials from budget to project_costs (avulso) — J9-02
      for (const material of budget.materials || []) {
        const { error: materialError } = await supabase
          .from('project_costs')
          .insert({
            project_id: project.id,
            category: 'material',
            is_recurring: false,
            description: material.description,
            planned_amount: material.value,
            planned_amount_brl: material.value,
            month_number: 1,
            original_currency: 'BRL',
            exchange_rate: 1,
          });

        if (materialError) {
          console.error('Error copying material:', materialError);
        }
      }

      // 6. Copy roles from budget to project_members
      for (const role of budget.roles || []) {
        const { data: projectMember, error: memberError } = await supabase
          .from('project_members')
          .insert({
            project_id: project.id,
            employee_id: null,
            role: role.role_name,
            seniority: role.seniority,
            hourly_rate: role.hourly_rate,
            hours_per_month: 0,
            budget_role_id: role.id,
          })
          .select()
          .single();

        if (memberError) {
          console.error('Error copying role:', memberError);
          continue;
        }

        const monthlyHoursInserts = (role.months || []).map((month) => ({
          project_member_id: projectMember.id,
          month_number: month.month_number,
          hours: month.hours,
        }));

        if (monthlyHoursInserts.length > 0) {
          const { error: hoursError } = await supabase
            .from('project_member_months')
            .insert(monthlyHoursInserts);

          if (hoursError) {
            console.error('Error creating member months:', hoursError);
          }
        }
      }

      return project;
    },
    onSuccess: (project, input) => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-activities', input.leadId] });

      toast({
        title: 'Negócio fechado com sucesso!',
        description: `O projeto "${project.name}" foi criado automaticamente.`,
      });

      // Log deal closed activity (fire-and-forget)
      if (employee && tenantId) {
        const finalValue = calculateCloseBusinessTotal({
          projectType: (input.projectType || 'fixed_scope') as ProjectType,
          installments: input.customInstallments,
          totalValue: input.budget?.final_total ?? input.totalValue ?? 0,
          monthlyValue: input.monthlyValue,
          successFeePercent: input.successFeePercent,
        });
        leadActivityService.logDealClosed(
          tenantId,
          input.leadId,
          project.id,
          input.projectType || 'fixed_scope',
          finalValue,
          employee.id
        ).catch(console.warn);
      }
    },
    onError: (error: Error) => {
      console.error('Error closing business deal:', error);
      toast({
        title: 'Erro ao fechar negócio',
        description: 'Não foi possível criar o projeto. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}
