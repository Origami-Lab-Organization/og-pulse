import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '@/services/subscriptionService';
import { dbToSubscription, CreateSubscriptionInput, UpdateSubscriptionInput } from '@/types/subscription';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useSubscriptions = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['subscriptions', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const data = await subscriptionService.getAll(tenantId);
      return data.map(dbToSubscription);
    },
    enabled: !!tenantId,
  });
};

export const useActiveSubscriptions = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['subscriptions', 'active', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const data = await subscriptionService.getActive(tenantId);
      return data.map(dbToSubscription);
    },
    enabled: !!tenantId,
  });
};

export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  const tenantId = employee?.tenant_id;

  return useMutation({
    mutationFn: async (input: CreateSubscriptionInput) => {
      if (!tenantId) throw new Error('No tenant ID');
      return subscriptionService.create(input, tenantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ title: 'Assinatura cadastrada', description: 'A assinatura foi cadastrada com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao cadastrar assinatura', description: error.message || undefined, variant: 'destructive' });
    },
  });
};

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateSubscriptionInput }) => {
      return subscriptionService.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ title: 'Assinatura atualizada', description: 'A assinatura foi atualizada com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar assinatura', description: error.message || undefined, variant: 'destructive' });
    },
  });
};

export const useToggleSubscriptionActive = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return subscriptionService.toggleActive(id, isActive);
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ title: isActive ? 'Assinatura ativada' : 'Assinatura desativada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
};

export const useDeleteSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await subscriptionService.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast({ title: 'Assinatura excluída', description: 'A assinatura foi excluída com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir assinatura', description: error.message || undefined, variant: 'destructive' });
    },
  });
};
