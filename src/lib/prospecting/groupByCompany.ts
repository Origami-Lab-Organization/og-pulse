import type { ProspectCompanyGroup } from '@/types/prospectBoard';
import type { ProspectWithCompany } from '@/types/prospect';

/**
 * Contatos de uma coluna agrupados pela empresa (29/09/2026), em ordem alfabética da empresa
 * e mantendo, dentro de cada grupo, a ordem que a coluna já tinha.
 */
export function groupByCompany(prospects: ProspectWithCompany[]): ProspectCompanyGroup[] {
  const grupos = new Map<string, ProspectCompanyGroup>();
  for (const prospect of prospects) {
    const grupo = grupos.get(prospect.company_id) ?? {
      companyId: prospect.company_id,
      nome: prospect.company?.name ?? 'Empresa não informada',
      contatos: [],
    };
    grupo.contatos.push(prospect);
    grupos.set(prospect.company_id, grupo);
  }
  return [...grupos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
