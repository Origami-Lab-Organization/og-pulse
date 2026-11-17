/**
 * Filtros da base da Receita (US-0003). O mesmo formato vai no corpo da Edge Function
 * `empresas-receita`, que aceita só os valores destas listas fechadas.
 */

export type FaixaDeIdade = 'ate3' | '3a10' | '10a20' | '20a40' | 'mais40';

export type FaixaDeFuncionarios = 'ate19' | '20a49' | '50a99' | '100a249' | '250a499' | '500mais' | 'sem';

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
  /** Capital social mínimo, em reais; 0 = qualquer. */
  capitalMinimo: number;
  naturezas: GrupoDeNatureza[];
  divida: FiltroDeDivida;
  comEmail: boolean;
  comTelefone: boolean;
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
