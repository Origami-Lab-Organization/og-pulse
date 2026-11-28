import type { FaturamentoBase, ProspectStage } from '@/types/prospect';

/** US-0053: a fase da empresa decide o resumo e a ação principal da página dela. */
export const FASE_DA_EMPRESA = {
  BASE: 'base',
  CADASTRADA: 'cadastrada',
  QUALIFICACAO: 'qualificacao',
  ANDAMENTO: 'andamento',
  CLIENTE: 'cliente',
} as const;
export type FaseDaEmpresa = (typeof FASE_DA_EMPRESA)[keyof typeof FASE_DA_EMPRESA];

export const ETAPA_QUALIFICACAO: ProspectStage = 'qualificacao';
export const ETAPA_A_ABORDAR: ProspectStage = 'a_abordar';
export const ETAPAS_ENCERRADAS: readonly ProspectStage[] = ['ganho', 'descartado'];

/** Página da empresa: `/comercial/empresas/:cnpj`. */
export const rotaDaEmpresa = (cnpj: string) => `/comercial/empresas/${cnpj.replace(/\D/g, '')}`;

/** Status de projeto que contam como "ativo" no resumo do cliente. */
export const STATUS_DE_PROJETO_ATIVO: readonly string[] = ['planning', 'active', 'paused'];
export const NOTA_PARA_QUALIFICAR = 75;

/** Etapas que encerram a Oportunidade, uma a uma (histórico da página da empresa). */
export const ETAPA_GANHO: ProspectStage = 'ganho';
export const ETAPA_PERDA: ProspectStage = 'descartado';

/** Seções da página da empresa, na ordem do índice lateral (US-0053, desenho de 25/11/2026). */
export const SECAO_DA_EMPRESA = {
  QUALIFICACAO: 's-qualificacao',
  PESSOAS: 's-pessoas',
  CANAIS: 's-canais',
  RISCOS: 's-riscos',
  HISTORICO: 's-historico',
  ESTUDO: 's-estudo',
} as const;
export type SecaoDaEmpresa = (typeof SECAO_DA_EMPRESA)[keyof typeof SECAO_DA_EMPRESA];

/** Dados que se editam no lugar, na página da empresa e pelo "Preencher" do widget. */
export const CAMPO_DA_EMPRESA = {
  SITE: 'site',
  LINKEDIN: 'linkedin',
  INSTAGRAM: 'instagram',
  FATURAMENTO: 'faturamento',
  FUNCIONARIOS: 'funcionarios',
  SINTESE: 'sintese',
} as const;
export type CampoDaEmpresa = (typeof CAMPO_DA_EMPRESA)[keyof typeof CAMPO_DA_EMPRESA];

/** Passos da qualificação no widget (US-0053). */
export const PASSO_DA_QUALIFICACAO = {
  SITE: 'site',
  LINKEDIN: 'linkedin',
  DECISOR: 'decisor',
  FATURAMENTO: 'faturamento',
  TIPO: 'tipo',
  SINTESE: 'sintese',
} as const;
export type PassoDaQualificacao = (typeof PASSO_DA_QUALIFICACAO)[keyof typeof PASSO_DA_QUALIFICACAO];

/** A síntese conta como escrita a partir deste tamanho: uma frase de verdade, não um rascunho. */
export const TAMANHO_MINIMO_DA_SINTESE = 40;

/** O "Pronto · passo" fica no widget por este tempo. */
export const TEMPO_DO_PRONTO_MS = 2200;

/** Tipos de evento da linha do tempo do histórico com a Origami. */
export const TIPO_DE_EVENTO = {
  GANHO: 'ganho',
  PERDA: 'perda',
  ANDAMENTO: 'andamento',
  PROJETO: 'projeto',
} as const;
export type TipoDeEvento = (typeof TIPO_DE_EVENTO)[keyof typeof TIPO_DE_EVENTO];

/** De onde veio a pessoa da empresa: do quadro de sócios da Receita ou do cadastro do time. */
export const ORIGEM_DA_PESSOA = {
  RECEITA: 'Receita Federal',
  CADASTRADA: 'Cadastrado',
} as const;
export type OrigemDaPessoa = (typeof ORIGEM_DA_PESSOA)[keyof typeof ORIGEM_DA_PESSOA];

/** Cargo de quem está no quadro de sócios: sócio, administrador ou os dois. */
export const CARGO_NA_EMPRESA = {
  SOCIO: 'Sócio',
  ADMINISTRADOR: 'Administrador',
  OS_DOIS: 'Sócio e administrador',
} as const;

/** Itens do Estudo da conta (US-0053): o arquivo mora no OneDrive do Comercial. */
export const TIPO_DE_ITEM_DO_ESTUDO = {
  LINK: 'link',
  NOTA: 'nota',
  ARQUIVO: 'arquivo',
} as const;
export type TipoDeItemDoEstudo = (typeof TIPO_DE_ITEM_DO_ESTUDO)[keyof typeof TIPO_DE_ITEM_DO_ESTUDO];

/** O mesmo teto do contrato no Ganho. */
export const TAMANHO_MAXIMO_DO_ARQUIVO = 100 * 1024 * 1024;

/** Em que aba mora cada campo: editar pelo widget abre a aba antes (26/11/2026). */
export const SECAO_DO_CAMPO: Partial<Record<CampoDaEmpresa, SecaoDaEmpresa>> = {
  [CAMPO_DA_EMPRESA.SITE]: SECAO_DA_EMPRESA.CANAIS,
  [CAMPO_DA_EMPRESA.LINKEDIN]: SECAO_DA_EMPRESA.CANAIS,
  [CAMPO_DA_EMPRESA.INSTAGRAM]: SECAO_DA_EMPRESA.CANAIS,
  [CAMPO_DA_EMPRESA.SINTESE]: SECAO_DA_EMPRESA.ESTUDO,
};

/** Faturamento que a Base calculou e o Pulse guardou ao mover: não é informação do time. */
export const FATURAMENTO_DA_BASE: FaturamentoBase = 'calculado';
