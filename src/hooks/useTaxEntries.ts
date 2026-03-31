import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { taxEntryService } from '@/services/taxEntryService';
import type { CreateTaxEntryInput, UpdateTaxEntryInput } from '@/types/taxEntry';

export function useTaxEntries(year?: number) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['tax-entries', tenantId, year],
    queryFn: () => taxEntryService.getAll(tenantId!, year),
    enabled: !!tenantId,
  });
}

export function useTaxEntriesByRange(startDate: string, endDate: string, options?: { enabled?: boolean }) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['tax-entries', tenantId, startDate, endDate],
    queryFn: () => taxEntryService.getByDateRange(tenantId!, startDate, endDate),
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}

export function useTaxEntriesByPaymentRange(startDate: string, endDate: string, options?: { enabled?: boolean }) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['tax-entries-payment', tenantId, startDate, endDate],
    queryFn: () => taxEntryService.getByPaymentDateRange(tenantId!, startDate, endDate),
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}

export function useCreateTaxEntry() {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: CreateTaxEntryInput) =>
      taxEntryService.create(input, employee!.tenant_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-entries'] });
      toast({ title: 'DAE registrada com sucesso' });
    },
    onError: (err: any) => {
      const msg = err?.message?.includes('tax_entries_tenant_month_unique')
        ? 'Já existe um lançamento para este mês de referência'
        : 'Erro ao registrar DAE';
      toast({ title: msg, variant: 'destructive' });
    },
  });
}

export function useUpdateTaxEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaxEntryInput }) =>
      taxEntryService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-entries'] });
      toast({ title: 'DAE atualizada' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar DAE', variant: 'destructive' });
    },
  });
}

export function useDeleteTaxEntry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => taxEntryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-entries'] });
      toast({ title: 'DAE excluída' });
    },
    onError: () => {
      toast({ title: 'Erro ao excluir DAE', variant: 'destructive' });
    },
  });
}
