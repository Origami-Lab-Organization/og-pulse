import type { FaixaDeFaturamento, FiltroDeAtividade } from '@/types/filtrosReceita';
import type { ProspectWithCompany, TipoDeConta } from '@/types/prospect';
import type { CompanyFit, FitFront } from '@/types/receita';

/** Filtros da aba "Em qualificação" (US-0042). Tudo roda na tela, sobre a lista do tenant. */
export interface FiltrosDaQualificacao extends FiltroDeAtividade {
  ufs: string[];
  /** Chave "UF:cidade" (a mesma cidade existe em mais de um estado). */
  cidades: string[];
  /** Distância máxima de Formiga, em km (US-0040); 0 = qualquer. */
  distanciaMaxima: number;
  /** Tipos de conta; "sem" = sem tipo. */
  tiposDeConta: string[];
  faturamentos: FaixaDeFaturamento[];
  /** Linha de serviço do fit (US-0047, id da linha); nula = a maior nota. */
  linhaDoFit: string | null;
  fitMinimo: number;
  /** Nota mínima do BANT; 0 = qualquer. */
  bantMinimo: number;
  /** Só oportunidades com proposta de evidência da IA esperando a decisão. */
  comPropostas: boolean;
  /** Ids dos responsáveis; "sem" = sem responsável. */
  responsaveis: string[];
  /** Há mais de N dias na etapa; 0 = qualquer. */
  diasMinimos: number;
}

/** As colunas que ordenam a tabela. */
export enum ColunaDaQualificacao {
  Bant = 'bant',
  Studio = 'studio',
  LeiDoBem = 'lei_do_bem',
  Captacao = 'captacao',
  Consultoria = 'consultoria',
  Faturamento = 'faturamento',
  Distancia = 'distancia',
  Desde = 'desde',
}

/** Coluna fixa, ou a coluna de fit de uma linha de serviço ("linha:<id>", US-0047). */
export type ColunaOrdenavel = ColunaDaQualificacao | `linha:${string}`;

export interface OrdemDaQualificacao {
  coluna: ColunaOrdenavel;
  crescente: boolean;
}

/** `aria-sort` do cabeçalho. */
export type SentidoDaOrdem = 'ascending' | 'descending' | 'none';

/** Uma linha da aba, com tudo o que filtra, ordena e aparece, já calculado. */
export interface LinhaDaQualificacao {
  prospect: ProspectWithCompany;
  nome: string;
  cnpj: string | null;
  cnae: string | null;
  setor: string | null;
  ramo: string | null;
  uf: string | null;
  cidade: string | null;
  distanciaKm: number | null;
  tipoConta: TipoDeConta | null;
  /** O informado pelo time; sem ele, o estimado pelo retrato da Base (fora o piso). */
  faturamento: number | null;
  faturamentoEstimado: boolean;
  fits: CompanyFit[] | null;
  /** Nota de cada linha de serviço do fit, por id da linha (US-0047); preenchida pela tela. */
  notasPorLinha?: Record<string, number | null>;
  bant: number;
  propostas: number;
  responsavel: string | null;
  /** Data (AAAA-MM-DD) da última entrada na etapa; sem registro, a criação. */
  entrouEm: string;
}
