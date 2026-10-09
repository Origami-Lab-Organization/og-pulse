import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import {
  prospectContactService,
  type ProspectContactInput,
  type ProspectContactUpdate,
} from '@/services/prospectContactService';
import type { ProspectContactWithCompany } from '@/types/prospect';

const ESPERA_DA_DIGITACAO_MS = 300;

export function useProspectContacts() {
  const { employee } = useAuth();
  return useQuery<ProspectContactWithCompany[]>({
    queryKey: ['prospect-contacts', employee?.tenant_id],
    queryFn: () => prospectContactService.getAll(employee!.tenant_id),
    enabled: !!employee?.tenant_id,
  });
}

export function useSearchProspectContacts(query: string) {
  const { employee } = useAuth();
  const termo = useDebouncedValue(query.trim(), ESPERA_DA_DIGITACAO_MS);
  return useQuery<ProspectContactWithCompany[]>({
    queryKey: ['prospect-contacts-search', employee?.tenant_id, termo],
    queryFn: () => prospectContactService.search(termo, employee!.tenant_id),
    enabled: !!employee?.tenant_id && termo.length >= 2,
  });
}

/**
 * Quem já usa o e-mail ou o LinkedIn que está sendo digitado — o aviso aparece antes de o
 * banco recusar, com o atalho para usar o contato existente.
 */
export function useProspectContactDuplicate(email: string, linkedin: string, ignorarId?: string) {
  const { employee } = useAuth();
  // Um debounce por texto: objeto novo a cada render reiniciaria o atraso para sempre.
  const emailDigitado = useDebouncedValue(email.trim(), ESPERA_DA_DIGITACAO_MS);
  const linkedinDigitado = useDebouncedValue(linkedin.trim(), ESPERA_DA_DIGITACAO_MS);
  const emailCompleto = emailDigitado.includes('@') ? emailDigitado : null;
  const linkedinCompleto = linkedinDigitado.length >= 8 ? linkedinDigitado : null;
  return useQuery<ProspectContactWithCompany | null>({
    queryKey: ['prospect-contact-duplicate', employee?.tenant_id, emailCompleto, linkedinCompleto, ignorarId],
    queryFn: () =>
      prospectContactService.findDuplicate(
        employee!.tenant_id,
        { email: emailCompleto, linkedin_url: linkedinCompleto },
        ignorarId,
      ),
    enabled: !!employee?.tenant_id && (!!emailCompleto || !!linkedinCompleto),
  });
}

/** O contato aparece nas oportunidades: mexer nele invalida também o quadro. */
export function invalidarContatos(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['prospect-contacts'] });
  qc.invalidateQueries({ queryKey: ['prospect-contacts-search'] });
  qc.invalidateQueries({ queryKey: ['prospect-contact-duplicate'] });
  qc.invalidateQueries({ queryKey: ['prospects'] });
  qc.invalidateQueries({ queryKey: ['prospect'] });
}

export function useCreateProspectContact() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: ProspectContactInput) =>
      prospectContactService.create(input, employee!.tenant_id, employee!.id),
    onSuccess: () => invalidarContatos(qc),
    onError: (err: Error) => {
      toast({ title: 'Erro ao salvar o contato', description: mensagemDeContato(err), variant: 'destructive' });
    },
  });
}

export function useUpdateProspectContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProspectContactUpdate }) =>
      prospectContactService.update(id, input),
    onSuccess: () => {
      invalidarContatos(qc);
      toast({ title: 'Contato atualizado' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao salvar o contato', description: mensagemDeContato(err), variant: 'destructive' });
    },
  });
}

export function useDeleteProspectContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => prospectContactService.remove(id),
    onSuccess: () => {
      invalidarContatos(qc);
      toast({ title: 'Contato excluído' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao excluir o contato', description: mensagemDeContato(err), variant: 'destructive' });
    },
  });
}

/**
 * Os índices únicos de e-mail e LinkedIn são a deduplicação. Quando o banco recusa, a pessoa
 * precisa saber QUAL campo repetiu — o texto cru do Postgres só diria o nome do índice.
 */
export function mensagemDeContato(err: Error): string {
  const texto = err.message ?? '';
  if (texto.includes('prospect_contacts_tenant_email_key')) {
    return 'Já existe um contato com este e-mail. Selecione-o na busca em vez de cadastrar de novo.';
  }
  if (texto.includes('prospect_contacts_tenant_linkedin_key')) {
    return 'Já existe um contato com este LinkedIn. Selecione-o na busca em vez de cadastrar de novo.';
  }
  if (texto.includes('prospects_contact_id_fkey') || texto.includes('prospect_opportunity_contacts_contact_id_fkey')) {
    return 'Este contato está em oportunidades e não pode ser excluído.';
  }
  return mensagemParaUsuario(err);
}
