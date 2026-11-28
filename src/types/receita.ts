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
  RespostaCnpja,
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

/**
 * Os serviços da Origami com fit próprio (US-0014, 24/11/2026), pelas linhas de serviço:
 * Dev. de Software, Lei do Bem, Captação de recursos (FINEP, BNDES, FAPs) e Consultoria
 * Estratégica. Ventures fica sem fit (é investimento, não perfil de conta). Até 23/11/2026 eram
 * três frentes (software, financiamento, consultoria).
 */
export type FitFront = 'studio' | 'lei_do_bem' | 'captacao' | 'consultoria';

/**
 * O que a Base sabe da empresa e o fit usa (US-0014): na Base, da própria linha; no Pulse, do
 * retrato gravado na empresa, com o que o time informou valendo por cima. Nulo = não se sabe —
 * e "não sei" não soma nem tira (ADR-0042).
 */
export interface SinaisDoTamanho {
  funcionarios: number | null;
  /** Funcionários vieram do time (US-0020), não da RAIS. */
  funcionariosDoTime: boolean;
  /** A RAIS era improvável e vale a estimativa por empresas parecidas (US-0054). */
  funcionariosEstimados?: boolean;
  dividaAjuizada: number | null;
  distanciaKm: number | null;
  tipoConta: import('@/types/prospect').TipoDeConta | null;
  /** O tipo veio da faixa do faturamento, não da classificação do time. */
  tipoPeloFaturamento: boolean;
  uf: string | null;
  /**
   * Na Base o regime nunca foi consultado (24/11/2026): "não informado" não soma na Lei do Bem,
   * senão ela vira o maior fit de quase toda empresa pequena. No Pulse, a BrasilAPI responde.
   */
  regimeNaoConsultado?: boolean;
}

/** O que a linha da Base traz para o fit prévio (US-0014): a carga e a ficha usam o mesmo formato. */
export interface LinhaDaBaseParaFit {
  cnaePrincipal: string;
  secundarios: readonly string[];
  /** Data de abertura, AAAA-MM-DD. */
  abertura: string | null;
  uf: string | null;
  funcionarios: number | null;
  /** Funcionários confirmados pelo time (US-0020), na ficha. */
  funcionariosDoTime?: boolean;
  /** A RAIS era improvável e vale a estimativa (US-0054). */
  funcionariosEstimados?: boolean;
  dividaAjuizada: number | null;
  distanciaKm: number | null;
  /** O faturamento que vale (o do time, senão o estimado sem o piso); nulo sem nenhum. */
  faturamento: number | null;
}

export interface FitReason {
  pontos: number;
  texto: string;
}

/** Nota de 0 a 100 de uma frente, com o porquê de cada ponto. */
export interface CompanyFit {
  frente: FitFront;
  /** Serviço do catálogo que mostra esta nota (US-0047); ausente na nota crua da regra. */
  serviceId?: string;
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
