import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { mensagemDeContato } from '@/hooks/useProspectContacts';
import { CnpjLookupError, lookupCnpj } from '@/services/cnpjLookupService';
import { prospectContactService } from '@/services/prospectContactService';
import {
  fetchCompanyPartners,
  scanCompanySite,
  checkCompanyFunding,
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
  // "Virar contato" cria a pessoa (ADR-0045; desde 09/10/2026, só a pessoa).
  qc.invalidateQueries({ queryKey: ['prospect-contacts'] });
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

/** "Consultar fomento": Lei do Bem, FINEP, BNDES e contratos com o governo, pelo CNPJ. */
export function useCheckCompanyFunding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (empresa: ProspectCompanyDB) => checkCompanyFunding(empresa.id),
    onSuccess: ({ indisponiveis }, empresa) => {
      invalidarEmpresa(qc, empresa.id);
      toast({
        title: 'Fomento consultado',
        description: indisponiveis.length
          ? `${empresa.name} — sem resposta de: ${indisponiveis.join(', ')}. O resto foi gravado.`
          : empresa.name,
      });
    },
    onError: (err: unknown) => {
      const descricao = err instanceof SiteScanError ? err.message : mensagemParaUsuario(err);
      toast({ title: 'Não foi possível consultar o fomento', description: descricao, variant: 'destructive' });
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
 * "Virar contato": o sócio vira uma pessoa em Contatos, com cargo e redes que já foram
 * colados, e fica ligado a ela (`contact_id`) — a ficha mostra que já está. Desde 09/10/2026
 * não abre card: a oportunidade é da empresa, e a pessoa entra nela pela ficha da oportunidade.
 */
export function usePromotePartner() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: async (partner: ProspectCompanyPartnerDB) => {
      const contato = await prospectContactService.create(
        {
          company_id: partner.company_id,
          name: nomeProprio(partner.nome),
          role: partner.qualificacao,
          phone: partner.telefone,
          linkedin_url: partner.linkedin_url,
          instagram_url: partner.instagram_url,
        },
        employee!.tenant_id,
        employee!.id,
      );
      await updatePartner(partner.id, { contact_id: contato.id });
      return contato;
    },
    onSuccess: (contato, partner) => {
      invalidarEmpresa(qc, partner.company_id);
      toast({
        title: 'Contato criado',
        description: `${contato.name} está em Contatos. Inclua numa oportunidade pela ficha dela.`,
      });
    },
    onError: (err: unknown) => {
      toast({ title: 'Erro ao criar o contato', description: mensagemDeContato(err as Error), variant: 'destructive' });
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
