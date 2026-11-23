import { useMemo } from 'react';
import { useProspectCompanies } from '@/hooks/useProspectCompanies';
import { useProspectContacts } from '@/hooks/useProspectContacts';
import { usePendingProspectTasks } from '@/hooks/useProspectTasks';
import { useProspects } from '@/hooks/useProspects';
import { buildCompanyRows, type CompanyRow } from '@/lib/prospecting/companyStatus';

/**
 * A empresa com as oportunidades, os contatos e a próxima tarefa dela, para a ficha completa
 * aberta de dentro da oportunidade (18/11/2026: a lista de contas saiu da tela Empresas).
 * Lê a versão atual: editar a empresa atualiza a ficha aberta.
 */
export function useLinhaDaEmpresa(companyId: string | null): CompanyRow | null {
  const { data: empresas = [] } = useProspectCompanies();
  const { data: oportunidades = [] } = useProspects();
  const { data: pessoas = [] } = useProspectContacts();
  const { porContato: proximaTarefa } = usePendingProspectTasks();
  return useMemo(() => {
    const empresa = companyId ? empresas.find((e) => e.id === companyId) : undefined;
    if (!empresa) return null;
    const daEmpresa = oportunidades.filter((o) => o.company_id === companyId);
    return buildCompanyRows([empresa], daEmpresa, proximaTarefa, pessoas)[0] ?? null;
  }, [companyId, empresas, oportunidades, pessoas, proximaTarefa]);
}
