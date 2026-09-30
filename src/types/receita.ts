/**
 * Dados públicos da Receita Federal de uma empresa, no formato do cadastro da Prospecção
 * (29/09/2026). Vêm da BrasilAPI (`.harness/integrations/brasilapi-cnpj.md`).
 *
 * Minimização (ADR-0041): do sócio pessoa física guardamos nome, qualificação e data de
 * entrada — nunca faixa etária nem o CPF (que a Receita já entrega mascarado).
 */

export type PartnerKind = 'pessoa' | 'empresa' | 'estrangeiro';

export interface ReceitaPartner {
  nome: string;
  qualificacao: string | null;
  dataEntrada: string | null;
  tipo: PartnerKind;
  /** Só quando o sócio é outra empresa (holding): CNPJ é dado de empresa, não de pessoa. */
  cnpj: string | null;
  representanteNome: string | null;
  representanteQualificacao: string | null;
}

export interface ReceitaRegimeYear {
  ano: number;
  forma: string;
}

export interface ReceitaCnae {
  codigo: string;
  descricao: string;
}

/** O que fica em `prospect_companies.receita` (jsonb): o que não vira filtro nem selo. */
export interface ReceitaDetails {
  naturezaJuridica: string | null;
  matrizOuFilial: string | null;
  cnaePrincipal: ReceitaCnae | null;
  cnaesSecundarios: ReceitaCnae[];
  regimes: ReceitaRegimeYear[];
  simples: boolean | null;
  mei: boolean | null;
  endereco: {
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    municipio: string | null;
    uf: string | null;
    cep: string | null;
  };
  telefones: string[];
  email: string | null;
}

export interface ReceitaSnapshot {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  /** MICRO EMPRESA | EMPRESA DE PEQUENO PORTE | DEMAIS — como a Receita escreve. */
  porte: string | null;
  capitalSocial: number | null;
  dataAbertura: string | null;
  situacaoCadastral: string | null;
  /** Forma de tributação do ano mais recente informado; null quando a Receita não informa. */
  regimeTributario: string | null;
  regimeTributarioAno: number | null;
  segmento: string | null;
  detalhes: ReceitaDetails;
  socios: ReceitaPartner[];
}

/** Indústria pelo CNAE (divisões 05–33). `fonte` diz se veio do CNAE principal ou de um secundário. */
export interface IndustrySignal {
  industrial: boolean;
  ramo: string | null;
  tipo: 'extrativa' | 'transformacao' | null;
  fonte: 'principal' | 'secundaria' | null;
}

/** Sinal de elegibilidade à Lei do Bem, lido do regime tributário. */
export type LeiDoBemSignal = 'elegivel' | 'nao_elegivel' | 'sem_regime';

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
  prospect_id: string | null;
  ativo: boolean;
  fonte: string;
  created_at: string;
  updated_at: string;
}

/** Resposta crua da BrasilAPI (`/api/cnpj/v1`) — só os campos que usamos. */
export interface RespostaBrasilApi {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  porte?: string | null;
  capital_social?: number | null;
  natureza_juridica?: string | null;
  data_inicio_atividade?: string | null;
  descricao_situacao_cadastral?: string | null;
  descricao_identificador_matriz_filial?: string | null;
  cnae_fiscal?: number | null;
  cnae_fiscal_descricao?: string | null;
  cnaes_secundarios?: Array<{ codigo: number; descricao: string }> | null;
  regime_tributario?: Array<{ ano: number; forma_de_tributacao: string }> | null;
  opcao_pelo_simples?: boolean | null;
  opcao_pelo_mei?: boolean | null;
  logradouro?: string | null;
  descricao_tipo_de_logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
  ddd_telefone_1?: string | null;
  ddd_telefone_2?: string | null;
  email?: string | null;
  qsa?: Array<{
    nome_socio: string;
    qualificacao_socio?: string | null;
    data_entrada_sociedade?: string | null;
    identificador_de_socio?: number | null;
    cnpj_cpf_do_socio?: string | null;
    nome_representante_legal?: string | null;
    qualificacao_representante_legal?: string | null;
  }> | null;
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

/** Sinais de fomento público cruzados por CNPJ (MCTI/FINEP/BNDES) — null enquanto não importados. */
export interface FundingSignals {
  leiDoBem: 'ja_usa' | 'nunca_usou' | 'desconhecido';
  /** Ano-base mais recente em que declarou a Lei do Bem. */
  leiDoBemAno: number | null;
  captouFomento: boolean;
  fomentos: Array<{ fonte: 'FINEP' | 'BNDES'; ano: number | null; valor: number | null; descricao: string | null }>;
}
