import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { budgetService } from '@/services/budgetService';
import { projectService } from '@/services/projectService';
import { BudgetWithDetails } from '@/types/budget';
import { supabase } from '@/integrations/supabase/client';

interface CloseBusinessInput {
  budget: BudgetWithDetails;
  managerId: string;
  paymentMethod: string;
  installmentsCount: number;
  dueDay: number;
  firstInvoiceDate: string;
  startDate: string;
  endDate: string;
  serviceLine?: string;
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

      // 1. Update budget status to 'active'
      await budgetService.updateStatus(budget.id, 'active');

      // 2. Create project linked to budget with dates from form
      const project = await projectService.create(
        {
          name: budget.title,
          clientId: budget.client_id || '',
          managerId,
          budgetId: budget.id,
          startDate,
          endDate,
          isContinuous: false,
          totalValue: budget.final_total,
          paymentMethod,
          installmentsCount,
          dueDay,
          firstInvoiceDate,
          status: 'planning',
          durationMonths: budget.duration_months,
          serviceLine: serviceLine || undefined,
        },
        tenantId
      );

      // 4. Copy suppliers from budget to project
      for (const supplier of budget.suppliers || []) {
        const { data: projectSupplier, error: supplierError } = await supabase
          .from('project_suppliers')
          .insert({
            project_id: project.id,
            name: supplier.name,
            description: supplier.description,
            monthly_value: supplier.monthly_value,
            start_month: 1,
            end_month: budget.duration_months,
          })
          .select()
          .single();

        if (supplierError) {
          console.error('Error copying supplier:', supplierError);
          continue;
        }

        // Create monthly values for each month
        const monthInserts = [];
        for (let month = 1; month <= budget.duration_months; month++) {
          monthInserts.push({
            project_supplier_id: projectSupplier.id,
            month_number: month,
            value: supplier.monthly_value,
          });
        }

        if (monthInserts.length > 0) {
          const { error: monthsError } = await supabase
            .from('project_supplier_months')
            .insert(monthInserts);

          if (monthsError) {
            console.error('Error creating supplier months:', monthsError);
          }
        }
      }

      // 5. Copy materials from budget to project
      for (const material of budget.materials || []) {
        const { error: materialError } = await supabase
          .from('project_materials')
          .insert({
            project_id: project.id,
            description: material.description,
            value: material.value,
            month_number: 1,
            is_realized: false,
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
            employee_id: null, // Sem funcionário inicialmente
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

        // Copy monthly hours distribution
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
    onSuccess: (project) => {
      // Invalidate both budgets and projects queries
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });

      toast({
        title: 'Negócio fechado com sucesso!',
        description: `O projeto "${project.name}" foi criado automaticamente com custos do orçamento.`,
      });
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
