import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { budgetService } from '@/services/budgetService';
import { projectService } from '@/services/projectService';
import { BudgetWithDetails } from '@/types/budget';
import { addMonths } from 'date-fns';

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

      // 3. Create project linked to budget
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
          status: 'planning', // Always start as planning
        },
        tenantId
      );

      return project;
    },
    onSuccess: (project) => {
      // Invalidate both budgets and projects queries
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });

      toast({
        title: 'Negócio fechado com sucesso!',
        description: `O projeto "${project.name}" foi criado automaticamente.`,
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
