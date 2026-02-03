import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { budgetService } from '@/services/budgetService';
import { projectService } from '@/services/projectService';
import { BudgetWithDetails } from '@/types/budget';
import { addMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface CloseBusinessInput {
  budget: BudgetWithDetails;
  managerId: string;
  paymentMethod: string;
  installmentsCount: number;
  dueDay: number;
  firstInvoiceDate: string;
}

export function useCloseBusinessDeal() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async (input: CloseBusinessInput) => {
      if (!tenantId) throw new Error('Tenant não encontrado');

      const { budget, managerId, paymentMethod, installmentsCount, dueDay, firstInvoiceDate } = input;

      // 1. Update budget status to 'active'
      await budgetService.updateStatus(budget.id, 'active');

      // 2. Calculate project dates
      const startDate = budget.start_date;
      const endDate = addMonths(new Date(startDate), budget.duration_months)
        .toISOString()
        .split('T')[0];

      // 3. Create project linked to budget with duration_months from budget
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
