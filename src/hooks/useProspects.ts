import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import {
  createProspect,
  deleteProspect,
  discardProspect,
  fetchProspectById,
  fetchProspects,
  markProspectWon,
  reopenProspect,
  updateProspect,
  updateProspectStage,
  type CreateProspectInput,
  type UpdateProspectInput,
} from '@/services/prospectService';
import {
  getProspectStageLabel,
  type ProspectStage,
  type ProspectWithCompany,
} from '@/types/prospect';

export function useProspects() {
  const { employee } = useAuth();
  return useQuery<ProspectWithCompany[]>({
    queryKey: ['prospects', employee?.tenant_id],
    queryFn: () => fetchProspects(employee!.tenant_id),
    enabled: !!employee?.tenant_id,
  });
}

export function useProspect(id: string | null) {
  const { employee } = useAuth();
  return useQuery<ProspectWithCompany | null>({
    queryKey: ['prospect', id],
    queryFn: () => fetchProspectById(id!),
    enabled: !!id && !!employee?.tenant_id,
  });
}

/**
 * Toda mutação do módulo mexe nas mesmas listas; invalidar por prefixo pega o tenant. Contatos
 * entram porque card novo pode criar a pessoa no banco (ADR-0045) e a tela Contatos mostra a
 * etapa de cada um.
 */
function invalidarProspeccao(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['prospects'] });
  qc.invalidateQueries({ queryKey: ['prospect'] });
  qc.invalidateQueries({ queryKey: ['prospect-contacts'] });
}

export function useCreateProspect() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: Omit<CreateProspectInput, 'tenant_id' | 'created_by'>) =>
      createProspect({ ...input, tenant_id: employee!.tenant_id, created_by: employee!.id }),
    onSuccess: (prospect) => {
      invalidarProspeccao(qc);
      toast({ title: 'Contato criado', description: `"${prospect.contact_name}" já está na lista de hoje.` });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao criar contato', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}

export function useUpdateProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateProspectInput }) =>
      updateProspect(id, updates),
    onSuccess: () => {
      invalidarProspeccao(qc);
      toast({ title: 'Contato atualizado' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao salvar', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}

export function useUpdateProspectStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, occurredOn }: { id: string; stage: ProspectStage; occurredOn?: string }) =>
      updateProspectStage(id, stage, occurredOn),
    onSuccess: (_data, variables) => {
      invalidarProspeccao(qc);
      toast({ title: 'Contato movido', description: `Agora em ${getProspectStageLabel(variables.stage)}.` });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao mover o contato', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}

export function useDiscardProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => discardProspect(id, reason),
    onSuccess: () => {
      invalidarProspeccao(qc);
      toast({ title: 'Perda registrada' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao registrar a perda', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}

export function useReopenProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => reopenProspect(id),
    onSuccess: () => {
      invalidarProspeccao(qc);
      toast({ title: 'Contato reaberto', description: 'Voltou para "A abordar" e entra na lista de hoje.' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao reabrir', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}

export function useDeleteProspect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => deleteProspect(id),
    onSuccess: () => {
      invalidarProspeccao(qc);
      toast({ title: 'Contato excluído' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao excluir', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}

export function useMarkProspectWon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, wonOn, value }: { id: string; wonOn: string; value: number | null }) =>
      markProspectWon(id, wonOn, value),
    onSuccess: (_data, variables) => {
      invalidarProspeccao(qc);
      toast({
        title: 'Ganho registrado',
        description: variables.value === null ? 'Sem valor por enquanto — o card fica sinalizado até alguém preencher.' : undefined,
      });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao registrar o ganho', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}
