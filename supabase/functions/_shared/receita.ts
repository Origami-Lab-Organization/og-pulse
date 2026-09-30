// Tradução da BrasilAPI para o cadastro da Prospecção e os sinais que saem dela (ADR-0041).
// FONTE ÚNICA: a tela (src/lib/prospecting/receita.ts), o MCP da Prospecção e as Edge
// Functions importam este arquivo. Sem import nenhum, para rodar em Deno, Vite e Node.

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

/**
 * Tradução da resposta da BrasilAPI (`/api/cnpj/v1`) para o cadastro da Prospecção, e os
 * sinais comerciais que saem dela (29/09/2026, ADR-0041).
 *
 * Módulo puro, sem browser: o MCP da Prospecção importa o mesmo arquivo pelo alias `@/`,
 * para tela e chat lerem a empresa do mesmo jeito.
 */

const texto = (valor?: string | null) => (valor && valor.trim() ? valor.trim() : null);

/** Receita: 1 = pessoa jurídica, 2 = pessoa física, 3 = estrangeiro. */
const TIPO_DE_SOCIO: Record<number, PartnerKind> = { 1: 'empresa', 2: 'pessoa', 3: 'estrangeiro' };
const SOCIO_EMPRESA: PartnerKind = 'empresa';

function socioDe(bruto: NonNullable<RespostaBrasilApi['qsa']>[number]): ReceitaPartner {
  const tipo = TIPO_DE_SOCIO[bruto.identificador_de_socio ?? 2] ?? 'pessoa';
  const digitos = (bruto.cnpj_cpf_do_socio ?? '').replace(/\D/g, '');
  const representante = texto(bruto.nome_representante_legal);
  return {
    nome: bruto.nome_socio.trim(),
    qualificacao: texto(bruto.qualificacao_socio),
    dataEntrada: texto(bruto.data_entrada_sociedade),
    tipo,
    // CPF nunca: chega mascarado e é dado pessoal. CNPJ de sócio-empresa é público.
    cnpj: tipo === SOCIO_EMPRESA && digitos.length === 14 ? digitos : null,
    representanteNome: representante,
    representanteQualificacao: representante ? texto(bruto.qualificacao_representante_legal) : null,
  };
}

function cnae(codigo?: number | null, descricao?: string | null): ReceitaCnae | null {
  // A BrasilAPI manda número: 0510200 chega como 510200. O código tem sempre 7 dígitos.
  return codigo && descricao ? { codigo: String(codigo).padStart(7, '0'), descricao: descricao.trim() } : null;
}

function regimeMaisRecente(regimes: ReceitaDetails['regimes']) {
  return [...regimes].sort((a, b) => b.ano - a.ano)[0] ?? null;
}

export function receitaFromBrasilApi(dado: RespostaBrasilApi): ReceitaSnapshot {
  const detalhes = detalhesDe(dado);
  const recente = regimeMaisRecente(detalhes.regimes);
  return {
    cnpj: dado.cnpj.replace(/\D/g, ''),
    razaoSocial: dado.razao_social.trim(),
    nomeFantasia: texto(dado.nome_fantasia),
    porte: texto(dado.porte),
    capitalSocial: typeof dado.capital_social === 'number' ? dado.capital_social : null,
    dataAbertura: texto(dado.data_inicio_atividade),
    situacaoCadastral: texto(dado.descricao_situacao_cadastral),
    regimeTributario: recente?.forma ?? null,
    regimeTributarioAno: recente?.ano ?? null,
    segmento: texto(dado.cnae_fiscal_descricao),
    detalhes,
    socios: (dado.qsa ?? []).filter((s) => s.nome_socio?.trim()).map(socioDe),
  };
}

function detalhesDe(dado: RespostaBrasilApi): ReceitaDetails {
  return {
    naturezaJuridica: texto(dado.natureza_juridica),
    matrizOuFilial: texto(dado.descricao_identificador_matriz_filial),
    cnaePrincipal: cnae(dado.cnae_fiscal, dado.cnae_fiscal_descricao),
    cnaesSecundarios: (dado.cnaes_secundarios ?? [])
      .map((c) => cnae(c.codigo, c.descricao))
      .filter((c): c is ReceitaCnae => !!c),
    regimes: (dado.regime_tributario ?? []).map((r) => ({ ano: r.ano, forma: r.forma_de_tributacao.trim() })),
    simples: dado.opcao_pelo_simples ?? null,
    mei: dado.opcao_pelo_mei ?? null,
    endereco: enderecoDe(dado),
    telefones: [dado.ddd_telefone_1, dado.ddd_telefone_2].map(texto).filter((t): t is string => !!t),
    email: texto(dado.email)?.toLowerCase() ?? null,
  };
}

function enderecoDe(dado: RespostaBrasilApi): ReceitaDetails['endereco'] {
  const tipo = texto(dado.descricao_tipo_de_logradouro);
  const logradouro = texto(dado.logradouro);
  return {
    logradouro: tipo && logradouro ? `${tipo} ${logradouro}` : logradouro,
    numero: texto(dado.numero),
    complemento: texto(dado.complemento),
    bairro: texto(dado.bairro),
    municipio: texto(dado.municipio),
    uf: texto(dado.uf),
    cep: texto(dado.cep),
  };
}

/**
 * Lei do Bem (Lei 11.196/2005) só alcança empresa tributada pelo **Lucro Real**. É o
 * primeiro filtro do serviço — e a Receita informa a forma de tributação por ano.
 * Sem regime informado não é "não elegível": é "descobrir na conversa".
 */
export function leiDoBemSignal(regime: string | null | undefined): LeiDoBemSignal {
  if (!regime) return 'sem_regime';
  return /lucro\s+real/i.test(regime) ? 'elegivel' : 'nao_elegivel';
}

export const LEI_DO_BEM_LABEL: Record<LeiDoBemSignal, string> = {
  elegivel: 'Lucro Real — elegível à Lei do Bem',
  nao_elegivel: 'Fora do Lucro Real — Lei do Bem não se aplica',
  sem_regime: 'Regime não informado — confirmar na conversa',
};

/** Porte como a Receita escreve, em linguagem de comercial. */
export function porteLabel(porte: string | null | undefined): string | null {
  if (!porte) return null;
  if (/micro/i.test(porte)) return 'Microempresa (até R$ 360 mil/ano)';
  if (/pequeno/i.test(porte)) return 'Pequena empresa (até R$ 4,8 mi/ano)';
  return 'Média ou grande (acima de R$ 4,8 mi/ano)';
}

/** Empresa que não está ATIVA na Receita não deve ser abordada como se estivesse. */
export function isSituacaoAtiva(situacao: string | null | undefined): boolean {
  return !situacao || /^ativa$/i.test(situacao.trim());
}

/** Busca de pessoas no LinkedIn por nome e empresa — o link, nunca raspagem (ADR-0041). */
export function linkedinPeopleSearchUrl(nome: string, empresa?: string | null): string {
  const termo = [nome, empresa].filter(Boolean).join(' ');
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(termo)}`;
}
