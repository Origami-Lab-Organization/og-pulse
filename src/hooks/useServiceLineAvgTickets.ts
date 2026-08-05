import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceLineAvgTicketService } from '@/services/serviceLineAvgTicketService';
import { dbToServiceLineAvgTicket } from '@/types/serviceLineAvgTicket';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['service-line-avg-tickets'] });
  queryClient.invalidateQueries({ queryKey: ['service-line-avg-tickets-map'] });
}

export const useServiceLineAvgTicketsAdmin = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['service-line-avg-tickets', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const data = await serviceLineAvgTicketService.getAll(tenantId);
      return data.map(dbToServiceLineAvgTicket);
    },
    enabled: !!tenantId,
  });
};

export const useUpdateServiceLineAvgTicket = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, avgTicketValue }: { id: string; avgTicketValue: number }) => {
      if (!employee?.id) throw new Error('Usuário não autenticado');
      return serviceLineAvgTicketService.update(id, {
        avgTicketValue,
        isManualOverride: true,
        updatedBy: employee.id,
      });
    },
    onSuccess: () => {
      invalidateAll(queryClient);
      toast({ title: 'Ticket médio atualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar ticket médio', description: error.message, variant: 'destructive' });
    },
  });
};

export const useResetServiceLineAvgTicket = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, computedValue }: { id: string; computedValue: number }) => {
      if (!employee?.id) throw new Error('Usuário não autenticado');
      return serviceLineAvgTicketService.resetToComputed(id, computedValue, employee.id);
    },
    onSuccess: () => {
      invalidateAll(queryClient);
      toast({ title: 'Valor calculado restaurado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao restaurar valor calculado', description: error.message, variant: 'destructive' });
    },
  });
};

export const useRecalculateServiceLineAvgTicketsNow = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => serviceLineAvgTicketService.recalculateNow(),
    onSuccess: (rowsUpdated) => {
      invalidateAll(queryClient);
      toast({
        title: 'Ticket médio recalculado',
        description: `${rowsUpdated} linha(s) de serviço atualizada(s) com base nos negócios fechados dos últimos 12 meses.`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao recalcular', description: error.message, variant: 'destructive' });
    },
  });
};
