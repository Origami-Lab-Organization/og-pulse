import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { jobApplicationService } from '@/services/jobApplicationService';
import { CreateJobApplicationInput, JobApplicationStatus } from '@/types/jobApplication';
import { supabase } from '@/integrations/supabase/client';

export const useJobApplications = () => {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['job_applications', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      return jobApplicationService.getAll(tenantId);
    },
    enabled: !!tenantId,
  });
};

export const useCreateJobApplication = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: CreateJobApplicationInput) =>
      jobApplicationService.create(input, employee!.tenant_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_applications', employee?.tenant_id] });
      toast({ title: 'Candidato adicionado com sucesso.' });
    },
    onError: () => {
      toast({ title: 'Erro ao adicionar candidato', variant: 'destructive' });
    },
  });
};

export const useUpdateJobApplicationStatus = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobApplicationStatus }) =>
      jobApplicationService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_applications', employee?.tenant_id] });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' });
    },
  });
};

export const useManagers = () => {
  const { employee } = useAuth();
  return useQuery({
    queryKey: ['managers', employee?.tenant_id],
    queryFn: async () => {
      if (!employee?.tenant_id) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('employees')
        .select('id, nome')
        .eq('tenant_id', employee.tenant_id)
        .eq('status', 'ativo')
        .or('is_gerente.eq.true,system_role.eq.admin')
        .order('nome');
      if (error) throw error;
      return (data || []) as { id: string; nome: string }[];
    },
    enabled: !!employee?.tenant_id,
  });
};

export const useUpdateJobApplicationResponsavel = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, responsavelId }: { id: string; responsavelId: string | null }) =>
      jobApplicationService.updateResponsavel(id, responsavelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_applications', employee?.tenant_id] });
    },
    onError: () => {
      toast({ title: 'Erro ao atualizar responsável', variant: 'destructive' });
    },
  });
};

export const useArchiveJobApplication = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      status,
      justificativa,
    }: {
      id: string;
      status: 'descartado' | 'banco_de_talentos';
      justificativa: string;
    }) => jobApplicationService.archive(id, status, justificativa),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_applications', employee?.tenant_id] });
      toast({ title: 'Candidato movido com sucesso.' });
    },
    onError: () => {
      toast({ title: 'Erro ao mover candidato', variant: 'destructive' });
    },
  });
};