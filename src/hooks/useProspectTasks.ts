import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import {
  createTask,
  deleteTask,
  fetchPendingTasks,
  fetchProspectTasks,
  updateTask,
  type CreateTaskInput,
  type UpdateTaskInput,
} from '@/services/prospectService';
import { nextTaskByProspect, type ProspectTaskDB } from '@/types/prospect';

const chave = (prospectId: string | null) => ['prospect-tasks', prospectId];
/** As pendentes da organização inteira — toda escrita de tarefa precisa invalidar também. */
const CHAVE_PENDENTES = ['prospect-tasks-pendentes'];

/** Próxima tarefa pendente de cada contato: o único aviso de vencimento do módulo. */
export function usePendingProspectTasks() {
  const { employee } = useAuth();
  const consulta = useQuery({
    queryKey: [...CHAVE_PENDENTES, employee?.tenant_id],
    queryFn: () => fetchPendingTasks(employee!.tenant_id),
    enabled: !!employee?.tenant_id,
  });
  const porContato = useMemo(() => nextTaskByProspect(consulta.data ?? []), [consulta.data]);
  return { ...consulta, porContato };
}

export function useProspectTasks(prospectId: string | null) {
  const { employee } = useAuth();
  return useQuery<ProspectTaskDB[]>({
    queryKey: chave(prospectId),
    queryFn: () => fetchProspectTasks(prospectId!),
    enabled: !!prospectId && !!employee?.tenant_id,
  });
}

export function useCreateProspectTask() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: Omit<CreateTaskInput, 'created_by'>) =>
      createTask({ ...input, created_by: employee!.id }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: chave(variables.prospect_id) });
      qc.invalidateQueries({ queryKey: CHAVE_PENDENTES });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao criar a tarefa', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}

export function useUpdateProspectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input }: { input: UpdateTaskInput; prospect_id: string }) => updateTask(input),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: chave(variables.prospect_id) });
      qc.invalidateQueries({ queryKey: CHAVE_PENDENTES });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao salvar a tarefa', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}

export function useDeleteProspectTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; prospect_id: string }) => deleteTask(id),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: chave(variables.prospect_id) });
      qc.invalidateQueries({ queryKey: CHAVE_PENDENTES });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao excluir a tarefa', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}
