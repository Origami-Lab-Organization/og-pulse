import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  leadActivityService,
  LeadActivityWithCreator,
  CreateLeadActivityInput,
} from '@/services/leadActivityService';

export function useLeadActivities(leadId: string | null) {
  return useQuery<LeadActivityWithCreator[], Error>({
    queryKey: ['lead-activities', leadId],
    queryFn: () => leadActivityService.getByLeadId(leadId!),
    enabled: !!leadId,
  });
}

export function useLogLeadActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLeadActivityInput) => leadActivityService.log(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', variables.leadId] });
    },
  });
}
