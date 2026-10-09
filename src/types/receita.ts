export type {
  PartnerKind,
  ReceitaPartner,
  ReceitaRegimeYear,
  ReceitaCnae,
  ReceitaDetails,
  ReceitaSnapshot,
  IndustrySignal,
  LeiDoBemSignal,
  RespostaBrasilApi,
} from '../../supabase/functions/_shared/receita';
import type { PartnerKind, ReceitaDetails } from '../../supabase/functions/_shared/receita';

/**
 * Dados públicos da Receita Federal de uma empresa, no formato do cadastro da Prospecção
 * (29/09/2026). Vêm da BrasilAPI (`.harness/integrations/brasilapi-cnpj.md`).
 *
 * Minimização (ADR-0041): do sócio pessoa física guardamos nome, qualificação e data de
 * entrada — nunca faixa etária nem o CPF (que a Receita já entrega mascarado).
 */


/** Sócio guardado na empresa (`prospect_company_partners`). */
export interface ProspectCompanyPartnerDB {
  id: string;
  tenant_id: string;
  company_id: string;
  nome: string;
  qualificacao: string | null;
  data_entrada: string | null;
  tipo: PartnerKind;
  cnpj: string | null;
  representante_nome: string | null;
  representante_qualificacao: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  telefone: string | null;
  /** Card criado pelo "Virar contato" antes de 09/10/2026 — histórico. */
  prospect_id: string | null;
  /** A pessoa criada pelo "Virar contato" (desde 09/10/2026). */
  contact_id?: string | null;
  ativo: boolean;
  fonte: string;
  created_at: string;
  updated_at: string;
}



/** O que o site oficial da empresa publica (`prospect_companies.site_scan`). */
export interface SiteScan {
  url: string;
  redes: { linkedin: string | null; instagram: string | null; facebook: string | null; youtube: string | null };
  whatsapp: string[];
  telefones: string[];
  emails: string[];
  /** ERPs e sistemas citados no site (TOTVS, SAP...): gancho de integração. */
  sistemas: string[];
  /** MES, Indústria 4.0, P&D, vagas de TI, ISO, exportação... */
  sinais: string[];
  paginas: string[];
}

/** As frentes que a Origami vende hoje (set/2026): sem Sprint 0. */
export type FitFront = 'software' | 'financiamento' | 'consultoria';

export interface FitReason {
  pontos: number;
  texto: string;
}

/** Nota de 0 a 100 de uma frente, com o porquê de cada ponto. */
export interface CompanyFit {
  frente: FitFront;
  rotulo: string;
  nota: number;
  motivos: FitReason[];
}

export type FundingSource = 'FINEP' | 'BNDES';

export interface FundingOperation {
  fonte: FundingSource;
  ano: number | null;
  valor: number | null;
  instrumento: string | null;
  descricao: string | null;
}

/**
 * Cruzamento de fomento público da empresa (`prospect_companies.fomento`, 29/09/2026):
 * Lei do Bem pela lista do MCTI, captações FINEP/BNDES e contratos com o governo federal.
 */
export interface FundingSignals {
  /** `desconhecido` = a lista do MCTI ainda não foi importada; não é "nunca usou". */
  leiDoBem: 'ja_usa' | 'nunca_usou' | 'desconhecido';
  /** Ano-base mais recente em que apareceu na lista do MCTI. */
  leiDoBemAno: number | null;
  captouFomento: boolean;
  fomentos: FundingOperation[];
  /** null = chave do Portal da Transparência não configurada. */
  governo: { contratos: number; valorTotal: number | null } | null;
}
