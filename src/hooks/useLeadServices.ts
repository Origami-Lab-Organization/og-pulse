import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadServicesService, LeadServiceRow, UpsertLeadServicesInput } from '@/services/leadServicesService';
import { useToast } from '@/hooks/use-toast';

// All lead_services for the current tenant — used in kanban for batch display
export function useAllLeadServices() {
  return useQuery({
    queryKey: ['lead-services-all'],
    queryFn: () => leadServicesService.getAll(),
    staleTime: 30_000,
  });
}

// Build a lookup map from all lead_services: leadId → LeadServiceRow[]
export function useLeadServicesMap(): Record<string, LeadServiceRow[]> {
  const { data = [] } = useAllLeadServices();
  return data.reduce<Record<string, LeadServiceRow[]>>((acc, row) => {
    (acc[row.lead_id] ??= []).push(row);
    return acc;
  }, {});
}

export function useLeadServices(leadId?: string | null) {
  return useQuery({
    queryKey: ['lead-services', leadId],
    queryFn: () => leadServicesService.getByLead(leadId!),
    enabled: !!leadId,
  });
}

export function useSaveLeadServices() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: UpsertLeadServicesInput) => leadServicesService.upsert(input),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lead-services', vars.leadId] });
    },
    onError: (err: Error) => {
      toast({
        title: 'Erro ao salvar serviços do lead',
        description: err.message,
        variant: 'destructive',
      });
    },
  });
}
