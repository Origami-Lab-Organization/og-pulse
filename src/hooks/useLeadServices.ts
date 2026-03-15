import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { leadServicesService, UpsertLeadServicesInput } from '@/services/leadServicesService';
import { useToast } from '@/hooks/use-toast';

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
