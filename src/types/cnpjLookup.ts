/** Dados públicos de uma empresa pelo CNPJ, já no formato do cadastro da Prospecção. */
export interface CnpjLookupResult {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  /** Atividade econômica principal (CNAE) — vira o Segmento da empresa. */
  segmento: string | null;
  cidade: string | null;
  uf: string | null;
}

/** O que o cadastro de empresa nova recebe pronto: da busca digitada, de um cliente ou da Receita. */
export interface CompanyPrefill {
  name: string;
  cnpj?: string | null;
  segment?: string | null;
  /** Empresa que já é cliente: `prospect_companies.client_id`. */
  client_id?: string | null;
}

/** Cliente da carteira oferecido no seletor de empresa. */
export interface ClientOption {
  id: string;
  company_name: string;
  trading_name: string | null;
  cnpj: string | null;
}
