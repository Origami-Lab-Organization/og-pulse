import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import {
  convertProspectToLead,
  createProspect,
  deleteProspect,
  discardProspect,
  fetchProspectById,
  fetchProspects,
  reopenProspect,
  updateProspect,
  updateProspectStage,
  type ConvertProspectInput,
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

/** Toda mutação do módulo mexe nas mesmas três listas; invalidar por prefixo pega o tenant. */
function invalidarProspeccao(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['prospects'] });
  qc.invalidateQueries({ queryKey: ['prospect'] });
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
    mutationFn: ({ id, stage }: { id: string; stage: ProspectStage }) => updateProspectStage(id, stage),
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
      toast({ title: 'Contato descartado' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao descartar', description: mensagemParaUsuario(err), variant: 'destructive' });
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

export function useConvertProspect() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: Omit<ConvertProspectInput, 'tenantId' | 'createdBy'>) =>
      convertProspectToLead({ ...input, tenantId: employee!.tenant_id, createdBy: employee!.id }),
    onSuccess: () => {
      invalidarProspeccao(qc);
      // A oportunidade nasce no Pipeline: a lista de lá também precisa saber.
      qc.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Oportunidade criada',
        description: 'O contato foi encerrado como Convertido e agora é somente leitura.',
      });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao converter', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}
