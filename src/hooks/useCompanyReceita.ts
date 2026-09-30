import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { CnpjLookupError, lookupCnpj } from '@/services/cnpjLookupService';
import { createProspect } from '@/services/prospectService';
import {
  fetchCompanyPartners,
  scanCompanySite,
  SiteScanError,
  saveCompanyReceita,
  updatePartner,
  type PartnerContactFields,
} from '@/services/receitaService';
import type { ProspectCompanyDB } from '@/types/prospect';
import type { ProspectCompanyPartnerDB, ReceitaSnapshot } from '@/types/receita';

function invalidarEmpresa(qc: ReturnType<typeof useQueryClient>, companyId: string) {
  qc.invalidateQueries({ queryKey: ['company-partners', companyId] });
  qc.invalidateQueries({ queryKey: ['prospect-companies'] });
  qc.invalidateQueries({ queryKey: ['prospects'] });
  qc.invalidateQueries({ queryKey: ['prospect'] });
}

export function useCompanyPartners(companyId: string | null) {
  return useQuery({
    queryKey: ['company-partners', companyId],
    queryFn: () => fetchCompanyPartners(companyId!),
    enabled: !!companyId,
  });
}

/** Grava um retrato já consultado — usado logo depois de cadastrar a empresa. */
export function useSaveCompanyReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, receita }: { companyId: string; receita: ReceitaSnapshot }) =>
      saveCompanyReceita(companyId, receita),
    onSuccess: (_, { companyId }) => invalidarEmpresa(qc, companyId),
    onError: (err: unknown) => {
      toast({
        title: 'Empresa salva sem os dados da Receita',
        description: `${mensagemParaUsuario(err)} Use "Atualizar da Receita" na ficha da empresa.`,
        variant: 'destructive',
      });
    },
  });
}

/** Consulta o CNPJ da empresa de novo e grava — o botão "Atualizar da Receita". */
export function useRefreshCompanyReceita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (empresa: ProspectCompanyDB) => {
      if (!empresa.cnpj) throw new CnpjLookupError('Cadastre o CNPJ da empresa para consultar a Receita.');
      await saveCompanyReceita(empresa.id, await lookupCnpj(empresa.cnpj));
    },
    onSuccess: (_, empresa) => {
      invalidarEmpresa(qc, empresa.id);
      toast({ title: 'Dados da Receita atualizados', description: empresa.name });
    },
    onError: (err: unknown) => {
      const descricao = err instanceof CnpjLookupError ? err.message : mensagemParaUsuario(err);
      toast({ title: 'Não foi possível consultar a Receita', description: descricao, variant: 'destructive' });
    },
  });
}

/** "Ler site": redes, contatos e pistas de sistema publicados pela própria empresa. */
export function useScanCompanySite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (empresa: ProspectCompanyDB) => scanCompanySite(empresa.id),
    onSuccess: (_, empresa) => {
      invalidarEmpresa(qc, empresa.id);
      toast({ title: 'Site lido', description: empresa.name });
    },
    onError: (err: unknown) => {
      const descricao = err instanceof SiteScanError ? err.message : mensagemParaUsuario(err);
      toast({ title: 'Não foi possível ler o site', description: descricao, variant: 'destructive' });
    },
  });
}

export function useUpdatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ partner, campos }: { partner: ProspectCompanyPartnerDB; campos: PartnerContactFields }) =>
      updatePartner(partner.id, campos),
    onSuccess: (_, { partner }) => invalidarEmpresa(qc, partner.company_id),
    onError: (err: unknown) => {
      toast({ title: 'Erro ao salvar o sócio', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}

/**
 * "Virar contato": o sócio entra na Prospecção em "A abordar", com cargo e redes que já
 * foram colados, e fica ligado ao contato (`prospect_id`) — a ficha mostra que já está.
 */
export function usePromotePartner() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: async (partner: ProspectCompanyPartnerDB) => {
      const contato = await createProspect({
        tenant_id: employee!.tenant_id,
        created_by: employee!.id,
        owner_id: employee!.id,
        company_id: partner.company_id,
        contact_name: nomeProprio(partner.nome),
        contact_role: partner.qualificacao,
        contact_phone: partner.telefone,
        linkedin_url: partner.linkedin_url,
        instagram_url: partner.instagram_url,
        primary_channel: partner.linkedin_url ? 'linkedin' : partner.telefone ? 'whatsapp' : 'email',
      });
      await updatePartner(partner.id, { prospect_id: contato.id });
      return contato;
    },
    onSuccess: (contato, partner) => {
      invalidarEmpresa(qc, partner.company_id);
      toast({ title: 'Contato criado', description: `${contato.contact_name} entrou em "A abordar".` });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao criar o contato', description: mensagemParaUsuario(err), variant: 'destructive' });
    },
  });
}

/** A Receita escreve em maiúsculas; o contato fica como gente escreve o nome. */
function nomeProprio(nome: string): string {
  const minusculas = new Set(['da', 'de', 'do', 'das', 'dos', 'e']);
  return nome
    .toLowerCase()
    .split(/\s+/)
    .map((parte, i) => (i > 0 && minusculas.has(parte) ? parte : parte.charAt(0).toUpperCase() + parte.slice(1)))
    .join(' ');
}
