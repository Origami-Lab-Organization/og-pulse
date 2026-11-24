import type { EmpresaReceita } from '@/lib/prospecting/empresasReceita';
import type { Relacao } from '@/types/relacao';

/**
 * Filtros da base da Receita (US-0003). O mesmo formato vai no corpo da Edge Function
 * `empresas-receita`, que aceita só os valores destas listas fechadas.
 */

export type FaixaDeIdade = 'ate3' | '3a10' | '10a20' | '20a40' | 'mais40';

export type FaixaDeFuncionarios = 'ate19' | '20a49' | '50a99' | '100a249' | '250a499' | '500mais' | 'sem';

/**
 * De onde vem o faturamento estimado (US-0006): funcionários da RAIS × receita por pessoa do
 * ramo; sem RAIS, o capital social a partir de R$ 10 mi (US-0018); o modelo de empresas
 * parecidas, quando passa do piso; ou só o piso de R$ 4,8 mi que a Receita garante para quem
 * não é ME nem EPP.
 */
export type BaseDoFaturamento = 'rais' | 'capital' | 'modelo' | 'piso';

/** Calibração de um ramo ou setor pelos casos do time (US-0018). */
export interface SetorCalibrado {
  /** Multiplica a estimativa pela RAIS. */
  fator: number;
  casos: number;
  /** Erro mediano em vezes, para mais ou para menos, sem e com o fator (cada caso fora do ajuste). */
  erro_mediano_antes: number;
  erro_mediano_depois: number;
}

export interface CalibracaoDoSetor extends SetorCalibrado {
  /** "ramo 10 (Alimentos)" ou "setor C". */
  nome: string;
}

/** Uma mudança do faturamento informado na empresa da Prospecção (US-0018). */
export interface RegistroDoFaturamento {
  /** Nulo = o faturamento foi apagado. */
  valor: number | null;
  base: 'estimado' | 'apurado' | 'calculado' | null;
  /** Employee que mudou; nulo sem sessão (script). */
  informado_por: string | null;
  informado_em: string;
}

/** Selo de confiança do faturamento estimado (US-0018). */
export type NivelDeConfianca = 'alta' | 'media' | 'baixa';

export interface ConfiancaDoFaturamento {
  nivel: NivelDeConfianca;
  /** "confiança média". */
  rotulo: string;
  /** O porquê, para o tooltip e a ficha. */
  motivo: string;
}

/** O selo do faturamento que está na empresa da Prospecção (US-0018). */
export interface SeloDoInformado {
  /** Nulo no "calculado" sem a estimativa da base para dar o selo. */
  confianca: ConfiancaDoFaturamento | null;
  /** Quem informou e quando, à parte quando o selo não é o do time ("calculado"). */
  autoria: string | null;
}

/** Faturamento estimado de uma empresa, em reais, e de onde ele veio. */
export interface Faturamento {
  valor: number;
  base: BaseDoFaturamento;
}

/** Receita por pessoa usada numa estimativa, e de onde ela veio (US-0006). */
export interface ReceitaPorPessoa {
  /** Mil reais por pessoa ocupada, truncado. */
  mil: number;
  /** Pesquisa do IBGE e ano. */
  fonte: string;
  /** "classe 1091", "grupo 421", "divisão 62". */
  nivel: string;
  /** "100 a 249 pessoas", ou nulo quando o IBGE não separa por porte. */
  porte: string | null;
}

/** O que o modelo de empresas parecidas lê de cada empresa (sem a RAIS). */
export interface EmpresaParaModelo {
  /** Razão social: separa as SPEs, que ficam fora do capital social (US-0018). */
  nome?: string | null;
  secao: string | null;
  natureza: string | null;
  capital: number | null;
  /** Data de abertura, AAAA-MM-DD. */
  abertura: string | null;
  filiais: number;
  socios: number;
  uf: string | null;
  divida: number | null;
  email: boolean;
  telefone: boolean;
}

/** Faixas do faturamento estimado, as mesmas do tipo de conta (US-0006, US-0016). */
export type FaixaDeFaturamento = 'ate10' | 'satelite' | 'ponte' | 'ancora';

export type GrupoDeNatureza = 'limitada' | 'sa_fechada' | 'sa_aberta' | 'outras_empresas' | 'associacoes' | 'pessoa_fisica';

export type FiltroDeDivida = 'qualquer' | 'sem' | 'sem_ajuizada' | 'com';

export interface FiltrosReceita {
  /** Seções da CNAE (letras). */
  setores: string[];
  /** Divisões da CNAE (dois dígitos), sempre dos setores marcados. */
  ramos: string[];
  /** Códigos ou começos de código da CNAE, só dígitos (2 a 7). */
  cnaes: string[];
  /** Setor, ramo e CNAE valem também para os CNAEs secundários. */
  secundaria: boolean;
  idades: FaixaDeIdade[];
  ufs: string[];
  funcionarios: FaixaDeFuncionarios[];
  /** Pelo valor do meio da estimativa; empresa sem estimativa não entra em nenhuma. */
  faturamentos: FaixaDeFaturamento[];
  /** Capital social mínimo, em reais; 0 = qualquer. */
  capitalMinimo: number;
  /** Distância máxima de Formiga, em km (US-0015); 0 = qualquer. */
  distanciaMaxima: number;
  naturezas: GrupoDeNatureza[];
  divida: FiltroDeDivida;
  comEmail: boolean;
  comTelefone: boolean;
  /** Relação com a Origami (US-0019). */
  relacoes: Relacao[];
  /** O serviço cujo fit a lista mostra, ordena e filtra (US-0014); nulo = a maior nota. */
  servicoDoFit: import('@/types/receita').FitFront | null;
  /** Nota mínima de fit nesse serviço (ou na maior); 0 = qualquer. */
  fitMinimo: number;
}

/** Um CNAE achado pelo código ou pela descrição, para o campo de CNAE. */
export interface CnaeEncontrado {
  codigo: string;
  descricao: string;
}

/** Uma opção de filtro: o valor que vai no pedido e o rótulo da tela. */
export interface Opcao<T extends string | number> {
  valor: T;
  rotulo: string;
}

/**
 * O que a caixa de busca da base da Receita pede (US-0005): nada, texto curto demais (com o
 * aviso do que falta), o começo de um CNPJ (5 a 14 números) ou um texto de nome ou cidade.
 */
export type BuscaReceita =
  | { tipo: 'vazia' }
  | { tipo: 'curta'; aviso: string }
  | { tipo: 'cnpj'; digitos: string }
  | { tipo: 'texto'; termo: string };

/** Seleção da lista para mover para abordar (US-0008): vale entre páginas e filtros. */
export interface SelecaoDaLista {
  marcadas: ReadonlySet<string>;
  /** Marca ou desmarca estas empresas (uma linha, ou a página inteira). */
  onMarcar: (empresas: EmpresaReceita[], marcar: boolean) => void;
}
