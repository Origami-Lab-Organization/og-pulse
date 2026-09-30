import type { ProspectWithCompany } from '@/types/prospect';

export interface ProspectCompanyGroup {
  companyId: string;
  nome: string;
  contatos: ProspectWithCompany[];
}
