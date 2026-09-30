import type { ReceitaSnapshot } from '@/types/receita';

/** O que o cadastro de empresa nova recebe pronto: da busca digitada, de um cliente ou da Receita. */
export interface CompanyPrefill {
  name: string;
  cnpj?: string | null;
  segment?: string | null;
  /** Empresa que já é cliente: `prospect_companies.client_id`. */
  client_id?: string | null;
  /** Retrato da Receita, quando a empresa veio de consulta de CNPJ — é gravado junto. */
  receita?: ReceitaSnapshot | null;
}

/** Cliente da carteira oferecido no seletor de empresa. */
export interface ClientOption {
  id: string;
  company_name: string;
  trading_name: string | null;
  cnpj: string | null;
}
