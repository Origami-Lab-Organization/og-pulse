import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import {
  prospectCompanyService,
  type ProspectCompanyInput,
} from '@/services/prospectCompanyService';
import type { ProspectCompanyDB } from '@/types/prospect';

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

export function useCreateProspectCompany() {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: (input: ProspectCompanyInput) =>
      prospectCompanyService.create(input, employee!.tenant_id, employee!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prospect-companies'] });
      qc.invalidateQueries({ queryKey: ['prospect-companies-search'] });
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
