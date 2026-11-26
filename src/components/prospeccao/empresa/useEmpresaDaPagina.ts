import { useFichaReceita } from '@/hooks/useEmpresasReceita';
import { useLinhaDaEmpresa } from '@/hooks/useLinhaDaEmpresa';
import { useProspectCompanyByCnpj } from '@/hooks/useProspectCompanies';
import { faseDaEmpresa, oportunidadeAtiva } from '@/lib/prospecting/faseDaEmpresa';

/**
 * Tudo que a página da empresa (US-0053) lê: a ficha da Base (relação e histórico inclusos), a
 * empresa do Pulse com contatos e Oportunidades, e a fase que decide resumo e ação principal.
 */
export function useEmpresaDaPagina(cnpj: string) {
  const ficha = useFichaReceita(cnpj || null);
  const { data: empresaDoPulse = null } = useProspectCompanyByCnpj(cnpj);
  const linha = useLinhaDaEmpresa(empresaDoPulse?.id ?? null);
  const oportunidades = linha?.opportunities ?? [];
  const fase = faseDaEmpresa({ noPulse: !!empresaDoPulse, oportunidades, relacao: ficha.data?.relacao?.relacao ?? null });
  return { ficha, empresaDoPulse, linha, fase, ativa: oportunidadeAtiva(oportunidades) };
}

export type EmpresaDaPagina = ReturnType<typeof useEmpresaDaPagina>;
