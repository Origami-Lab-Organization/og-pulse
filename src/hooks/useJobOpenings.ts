import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { jobOpeningService } from '@/services/jobOpeningService';
import { CreateJobOpeningInput, UpdateJobOpeningInput } from '@/types/jobOpening';

export const useJobOpenings = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  return useQuery({
    queryKey: ['job_openings', tenantId],
    queryFn: () => {
      if (!tenantId) return [];
      return jobOpeningService.getAll(tenantId);
    },
    enabled: !!tenantId,
  });
};

export const useCreateJobOpening = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (input: CreateJobOpeningInput) =>
      jobOpeningService.create(input, employee!.tenant_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_openings'] });
      toast({ title: 'Vaga criada com sucesso' });
    },
    onError: () => {
      toast({ title: 'Erro ao criar vaga', variant: 'destructive' });
    },
  });
};

export const useUpdateJobOpening = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateJobOpeningInput }) =>
      jobOpeningService.update(id, updates, employee?.tenant_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_openings'] });
      toast({ title: 'Vaga atualizada' });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar vaga', variant: 'destructive' });
    },
  });
};

export const useDeleteJobOpening = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => jobOpeningService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_openings'] });
      toast({ title: 'Vaga removida' });
    },
    onError: () => {
      toast({ title: 'Erro ao remover vaga', variant: 'destructive' });
    },
  });
};
