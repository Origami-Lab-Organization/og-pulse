import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { validateCNPJ } from '@/lib/masks';
import { completarEmpresa } from '@/lib/prospecting/companyGaps';
import {
  prospectCompanyService,
  type ProspectCompanyInput,
} from '@/services/prospectCompanyService';
import { moveProspectToCompany } from '@/services/prospectService';
import type { ProspectCompanyDB, ProspectWithCompany } from '@/types/prospect';

export function useProspectCompanies() {
  const { employee } = useAuth();
  return useQuery<ProspectCompanyDB[]>({
    queryKey: ['prospect-companies', employee?.tenant_id],
    queryFn: () => prospectCompanyService.getAll(employee!.tenant_id),
    enabled: !!employee?.tenant_id,
  });
}

export function useSearchProspectCompanies(query: string) {
  const { employee } = useAuth();
  const termo = query.trim();
  return useQuery<ProspectCompanyDB[]>({
    queryKey: ['prospect-companies-search', employee?.tenant_id, termo],
    queryFn: () => prospectCompanyService.search(termo, employee!.tenant_id),
    enabled: !!employee?.tenant_id && termo.length >= 2,
  });
}

/**
 * A empresa que já usa este CNPJ — o aviso aparece enquanto se digita, antes de o índice
 * único recusar no salvar. Só consulta com o CNPJ completo e válido.
 */
export function useProspectCompanyByCnpj(cnpj: string) {
  const { employee } = useAuth();
  const digitos = cnpj.replace(/\D/g, '');
  return useQuery<ProspectCompanyDB | null>({
    queryKey: ['prospect-company-by-cnpj', employee?.tenant_id, digitos],
    queryFn: async () => (await prospectCompanyService.findByCnpjs([digitos], employee!.tenant_id))[0] ?? null,
    enabled: !!employee?.tenant_id && validateCNPJ(digitos),
  });
}

/** Clientes da carteira que batem com a busca do seletor de empresa. */
export function useSearchClientsForProspect(query: string) {
  const { employee } = useAuth();
  const termo = query.trim();
  return useQuery({
    queryKey: ['prospect-client-search', employee?.tenant_id, termo],
    queryFn: () => prospectCompanyService.searchClients(termo, employee!.tenant_id),
    enabled: !!employee?.tenant_id && termo.length >= 2,
  });
}

export function useCreateProspectCompany() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: ProspectCompanyInput) =>
      prospectCompanyService.create(input, employee!.tenant_id, employee!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prospect-companies'] });
      qc.invalidateQueries({ queryKey: ['prospect-companies-search'] });
      qc.invalidateQueries({ queryKey: ['prospect-company-by-cnpj'] });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao salvar a empresa', description: mensagemDeEmpresa(err), variant: 'destructive' });
    },
  });
}

export function useUpdateProspectCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProspectCompanyInput }) =>
      prospectCompanyService.update(id, input),
    onSuccess: () => {
      // A empresa é compartilhada: editá-la muda o que todos os contatos dela exibem.
      qc.invalidateQueries({ queryKey: ['prospect-companies'] });
      qc.invalidateQueries({ queryKey: ['prospects'] });
      qc.invalidateQueries({ queryKey: ['prospect'] });
      toast({ title: 'Empresa atualizada' });
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao salvar a empresa', description: mensagemDeEmpresa(err), variant: 'destructive' });
    },
  });
}

type CardDaEmpresa = Pick<ProspectWithCompany, 'id' | 'contact_id' | 'company_id'>;

/** A empresa do tenant que já usa este CNPJ, quando não é a própria empresa do card. */
async function outraEmpresaComCnpj(cnpj: string | null | undefined, empresaDoCard: string, tenantId: string) {
  const digitos = cnpj?.replace(/\D/g, '') ?? '';
  if (!digitos) return null;
  const [achada] = await prospectCompanyService.findByCnpjs([digitos], tenantId);
  return achada && achada.id !== empresaDoCard ? achada : null;
}

/**
 * Salvar a empresa na ficha do card (07/10/2026). CNPJ de outra empresa já cadastrada não é
 * erro: é a mesma empresa. O card passa para ela, e a edição só completa o que faltava lá —
 * o cadastro existente vence. Devolve a empresa em que o card ficou.
 */
export function useSaveCardCompany() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: async ({ card, input }: { card: CardDaEmpresa; input: ProspectCompanyInput }) => {
      const existente = await outraEmpresaComCnpj(input.cnpj, card.company_id, employee!.tenant_id);
      if (!existente) return prospectCompanyService.update(card.company_id, input);
      await moveProspectToCompany(card, existente.id);
      const completa = completarEmpresa(existente, input);
      return completa ? prospectCompanyService.update(existente.id, completa) : existente;
    },
    onSuccess: (empresa, { card }) => {
      qc.invalidateQueries({ queryKey: ['prospect-companies'] });
      qc.invalidateQueries({ queryKey: ['prospect-company-by-cnpj'] });
      qc.invalidateQueries({ queryKey: ['prospects'] });
      qc.invalidateQueries({ queryKey: ['prospect'] });
      qc.invalidateQueries({ queryKey: ['prospect-contacts'] });
      toast(
        empresa.id === card.company_id
          ? { title: 'Empresa atualizada' }
          : { title: `Card ligado a ${empresa.name}`, description: 'Ela já estava cadastrada com este CNPJ.' },
      );
    },
    onError: (err: Error) => {
      toast({ title: 'Erro ao salvar a empresa', description: mensagemDeEmpresa(err), variant: 'destructive' });
    },
  });
}

/**
 * Os dois índices únicos parciais (CNPJ e LinkedIn por tenant) são a deduplicação. Quando
 * o banco recusa, a pessoa precisa saber QUAL campo repetiu — o texto cru do Postgres só
 * diria o nome do índice.
 */
function mensagemDeEmpresa(err: Error): string {
  const texto = err.message ?? '';
  if (texto.includes('prospect_companies_tenant_cnpj_key')) {
    return 'Já existe uma empresa com este CNPJ. Selecione-a na busca em vez de cadastrar de novo.';
  }
  if (texto.includes('prospect_companies_tenant_linkedin_key')) {
    return 'Já existe uma empresa com este LinkedIn. Selecione-a na busca em vez de cadastrar de novo.';
  }
  if (texto.includes('prospect_companies_cnpj_digits')) {
    return 'CNPJ inválido: informe os 14 dígitos.';
  }
  return mensagemParaUsuario(err);
}
