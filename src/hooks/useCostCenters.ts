import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { costCenterService } from '@/services/costCenterService';
import type { CostCenterFormData } from '@/types/costCenter';

export const COST_CENTERS_QUERY_KEY = ['cost-centers'] as const;

export function useCostCenters() {
  return useQuery({ queryKey: COST_CENTERS_QUERY_KEY, queryFn: costCenterService.getAll });
}

function useInvalidateCostCenters() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: COST_CENTERS_QUERY_KEY });
}

export function useCreateCostCenter() {
  const invalidate = useInvalidateCostCenters();
  const { toast } = useToast();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (form: CostCenterFormData) => {
      if (!employee?.tenant_id) throw new Error('Empresa não identificada na sessão.');
      return costCenterService.create(employee.tenant_id, form);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Centro de custo criado' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível criar o centro', description: error.message, variant: 'destructive' }),
  });
}

export function useUpdateCostCenter() {
  const invalidate = useInvalidateCostCenters();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (input: CostCenterFormData & { id: string }) => costCenterService.update(input.id, input),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Centro de custo atualizado' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível atualizar o centro', description: error.message, variant: 'destructive' }),
  });
}

export function useSetCostCenterActive() {
  const invalidate = useInvalidateCostCenters();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (input: { id: string; isActive: boolean }) => costCenterService.setActive(input.id, input.isActive),
    onSuccess: (_data, input) => {
      invalidate();
      toast({ title: input.isActive ? 'Centro de custo reativado' : 'Centro de custo inativado' });
    },
    onError: (error: Error) => toast({ title: 'Não foi possível alterar o centro', description: error.message, variant: 'destructive' }),
  });
}
