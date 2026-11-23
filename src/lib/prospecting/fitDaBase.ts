import { companyFit } from '@/lib/prospecting/fit';
import type { CompanyFit } from '@/types/receita';
import type { ProspectCompanyDB } from '@/types/prospect';

/**
 * Fit de uma empresa da base da Receita, pela regra da Prospecção (ADR-0042), só com o que a
 * Receita informa: CNAE principal e secundários e a data de abertura. Regime tributário, site,
 * fomento e contratos com o governo ficam de fora até a empresa virar oportunidade. A carga
 * (fit prévio) e a ficha (US-0007) usam esta mesma função.
 */
export function fitDaBase(cnaePrincipal: string, secundarios: readonly string[], abertura: string | null, hoje: string): CompanyFit[] | null {
  const empresa = {
    receita_consultada_em: hoje,
    situacao_cadastral: 'Ativa',
    porte: 'DEMAIS',
    data_abertura: abertura,
    regime_tributario: null,
    site_scan: null,
    receita: {
      cnaePrincipal: { codigo: cnaePrincipal, descricao: '' },
      cnaesSecundarios: secundarios.map((codigo) => ({ codigo, descricao: '' })),
    },
  } as unknown as ProspectCompanyDB;
  return companyFit(empresa);
}
