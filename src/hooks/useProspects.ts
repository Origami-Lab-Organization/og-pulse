import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import {
  addOpportunityContact,
  createProspect,
  deleteProspect,
  discardProspect,
  fetchProspectById,
  fetchProspects,
  markProspectWon,
  removeOpportunityContact,
  reopenProspect,
  updateOpportunityContactRole,
  updateProspect,
  updateProspectStage,
  type CreateProspectInput,
  type UpdateProspectInput,
} from '@/services/prospectService';
import {
  getProspectStageLabel,
  opportunityName,
  type ProspectContactRole,
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
 * entram porque card novo pode criar a pessoa no banco (ADR-0045) e a tela Contatos mostra as
 * oportunidades de cada um.
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
      toast({ title: 'Oportunidade criada', description: `${opportunityName(prospect)} entrou em "A abordar".` });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao criar a oportunidade', description: mensagemParaUsuario(err), variant: 'destructive' });
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
      toast({ title: 'Oportunidade atualizada' });
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
      toast({ title: 'Oportunidade movida', description: `Agora em ${getProspectStageLabel(variables.stage)}.` });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao mover a oportunidade', description: mensagemParaUsuario(err), variant: 'destructive' });
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
      toast({ title: 'Oportunidade reaberta', description: 'Voltou para "A abordar".' });
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
      toast({ title: 'Oportunidade excluída' });
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

// --------------------------------------------------------------------------
// Contatos da oportunidade (09/10/2026)
// --------------------------------------------------------------------------

export function useAddOpportunityContact() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: { prospectId: string; contactId: string; role?: ProspectContactRole | null }) =>
      addOpportunityContact({
        prospect_id: input.prospectId,
        contact_id: input.contactId,
        role: input.role ?? null,
        created_by: employee?.id ?? null,
      }),
    onSuccess: () => invalidarProspeccao(qc),
    onError: (err: unknown) => {
      toast({ title: 'Erro ao incluir o contato', description: mensagemDeVinculo(err), variant: 'destructive' });
    },
  });
}

export function useUpdateOpportunityContactRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { prospectId: string; contactId: string; role: ProspectContactRole | null }) =>
      updateOpportunityContactRole(input.prospectId, input.contactId, input.role),
    onSuccess: () => invalidarProspeccao(qc),
    onError: (err: unknown) => {
      toast({ title: 'Erro ao salvar o papel', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}

export function useRemoveOpportunityContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { prospectId: string; contactId: string }) =>
      removeOpportunityContact(input.prospectId, input.contactId),
    onSuccess: () => {
      invalidarProspeccao(qc);
      toast({ title: 'Contato retirado da oportunidade', description: 'Ele continua em Contatos.' });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao retirar o contato', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}

/** A chave primária é (oportunidade, pessoa): repetir a pessoa cai nela. */
function mensagemDeVinculo(err: unknown): string {
  const texto = err instanceof Error ? err.message : String((err as { message?: string })?.message ?? '');
  if (texto.includes('prospect_opportunity_contacts_pkey')) return 'Este contato já está nesta oportunidade.';
  return mensagemParaUsuario(err);
}
