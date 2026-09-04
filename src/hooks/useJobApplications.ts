import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { jobApplicationService } from '@/services/jobApplicationService';
import { CreateJobApplicationInput, JobApplicationDB, JobApplicationStatus } from '@/types/jobApplication';
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

export const useHireCandidate = () => {
  const queryClient = useQueryClient();
  const { employee } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (candidate: JobApplicationDB) => {
      if (!employee?.tenant_id) throw new Error('tenant_id ausente');

      const today = new Date().toISOString().split('T')[0];

      // Insert directly — bypasses the edge function (workaround for deployed JWT bug).
      // auth_id is null: employee exists in the system but login is set up separately.
      const { error: insertError } = await (supabase as any)
        .from('employees')
        .insert({
          nome: candidate.nome,
          email: candidate.email,
          telefone: candidate.telefone ?? '',
          cargo: candidate.vaga_titulo || 'A definir',
          cpf: '',
          data_admissao: today,
          // system_role e is_gerente saem derivados de `user_roles` pelo banco (PUL-203);
          // candidato aprovado entra sem papel nenhum, então derivam para 'user'/false.
          status: 'aguardando_confirmacao',
          tipo_contratacao: 'CLT',
          jornada_mensal: 176,
          jornada_diaria: 8,
          salario_mensal: 0,
          salario_liquido: 0,
          beneficios: 0,
          encargos: 0,
          fgts: 0,
          inss_empresa: 0,
          decimo_terceiro: 0,
          ferias: 0,
          pro_labore: 0,
          bolsa_auxilio: 0,
          valor_contrato_pj: 0,
          dividendos: 0,
          provisao_13: 0,
          provisao_ferias: 0,
          provisao_recesso: 0,
          total_monthly_cost_estimated: 0,
          total_annual_cost_estimated: 0,
          breakdown_json: null,
          data_nascimento: null,
          foto_url: null,
          tenant_id: employee.tenant_id,
          auth_id: null,
          must_change_password: true,
        });

      if (insertError) throw new Error(insertError.message);

      await jobApplicationService.updateStatus(candidate.id, 'contratado');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job_applications', employee?.tenant_id] });
      queryClient.invalidateQueries({ queryKey: ['employees', employee?.tenant_id] });
      toast({ title: 'Candidato contratado com sucesso!' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao contratar candidato', description: err.message, variant: 'destructive' });
    },
  });
};