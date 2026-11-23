import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { mensagemParaUsuario } from '@/lib/errors/userMessage';
import { emTitulo } from '@/lib/prospecting/empresasReceita';
import { prospectCompanyService } from '@/services/prospectCompanyService';
import { prospectContactService } from '@/services/prospectContactService';
import { addOpportunityContact } from '@/services/prospectService';
import { updatePartner } from '@/services/receitaService';
import type { FaturamentoBase } from '@/types/prospect';
import type { ProspectCompanyPartnerDB } from '@/types/receita';

const ESTIMADO_PELO_TIME: FaturamentoBase = 'estimado';

function invalidarEstudo(qc: ReturnType<typeof useQueryClient>, companyId: string) {
  qc.invalidateQueries({ queryKey: ['company-partners', companyId] });
  qc.invalidateQueries({ queryKey: ['prospect-companies'] });
  qc.invalidateQueries({ queryKey: ['prospects'] });
  qc.invalidateQueries({ queryKey: ['prospect'] });
  qc.invalidateQueries({ queryKey: ['prospect-contacts'] });
  // Funcionários do time mudam a lista e a ficha da tela Empresas (US-0020).
  qc.invalidateQueries({ queryKey: ['receita-empresas'] });
  qc.invalidateQueries({ queryKey: ['receita-ficha'] });
}

/**
 * Sócio da Receita vira pessoa a abordar (US-0020, cenário 3): cria o contato, como o "Virar
 * contato" (ADR-0041, ADR-0045), e já o inclui nesta oportunidade, sem papel.
 */
export function useTrazerSocio(prospectId: string) {
  const qc = useQueryClient();
  const { employee } = useAuth();
  return useMutation({
    mutationFn: async (socio: ProspectCompanyPartnerDB) => {
      const contato = await prospectContactService.create(
        {
          company_id: socio.company_id,
          name: emTitulo(socio.nome) || socio.nome, // a Receita escreve em maiúsculas
          role: socio.qualificacao,
          phone: socio.telefone,
          linkedin_url: socio.linkedin_url,
          instagram_url: socio.instagram_url,
        },
        employee!.tenant_id,
        employee!.id,
      );
      await updatePartner(socio.id, { contact_id: contato.id });
      await addOpportunityContact({ prospect_id: prospectId, contact_id: contato.id, role: null, created_by: employee?.id ?? null });
      return contato;
    },
    onSuccess: (contato, socio) => {
      invalidarEstudo(qc, socio.company_id);
      toast({ title: `${contato.name} está na oportunidade`, description: 'Escolha o papel dela na decisão.' });
    },
    onError: (erro) => toast({ title: 'Não deu para trazer o sócio', description: mensagemParaUsuario(erro), variant: 'destructive' }),
  });
}

/** Funcionários confirmados pelo time (US-0020, cenário 4); nulo volta a valer a RAIS. */
export function useFuncionariosDoTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, funcionarios }: { companyId: string; funcionarios: number | null }) =>
      prospectCompanyService.setFuncionarios(companyId, funcionarios),
    onSuccess: (_, { companyId, funcionarios }) => {
      invalidarEstudo(qc, companyId);
      toast({ title: funcionarios == null ? 'Volta a valer a RAIS' : 'Funcionários confirmados' });
    },
    onError: (erro) => toast({ title: 'Não deu para salvar os funcionários', description: mensagemParaUsuario(erro), variant: 'destructive' }),
  });
}

/**
 * Faturamento que o time sabe (US-0020, decisão de 18/11/2026: preenchido no estudo, não ao
 * mover). Entra como "Estimado" (pelo time) e prevalece sobre o calculado pela base.
 */
export function useFaturamentoDoTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, valor }: { companyId: string; valor: number }) =>
      prospectCompanyService.setFaturamento(companyId, valor, ESTIMADO_PELO_TIME),
    onSuccess: (_, { companyId }) => {
      invalidarEstudo(qc, companyId);
      toast({ title: 'Faturamento salvo' });
    },
    onError: (erro) => toast({ title: 'Não deu para salvar o faturamento', description: mensagemParaUsuario(erro), variant: 'destructive' }),
  });
}
