import { valuesAreHidden } from '@/lib/hideValuesStore';
import { HIDDEN_VALUE_MASK } from '@/lib/formatters';
import { divisaoDoCnae, nomeDoRamo } from '@/lib/prospecting/cnae';
import type { FitFront } from '@/types/receita';
import type { BaseDoFaturamento } from '@/types/filtrosReceita';
import type { FaturamentoBase } from '@/types/prospect';

/**
 * Empresas da base da Receita (US-0002, ADR-0053) — o que a tela Empresas lista em
 * "A classificar". Vem da Edge Function `empresas-receita`; aqui só há regra de exibição.
 */

export type OrdemReceita = 'fit' | 'nome' | 'faturamento' | 'funcionarios' | 'idade';

export interface OrdenacaoReceita {
  ordem: OrdemReceita;
  crescente: boolean;
}

/** Ordem padrão: quem vale abordar primeiro. */
export const ORDENACAO_PADRAO: OrdenacaoReceita = { ordem: 'fit', crescente: false };

export interface EmpresaReceita {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnae_principal: string;
  cnae_descricao: string | null;
  municipio: string | null;
  uf: string | null;
  data_inicio_atividade: string | null;
  /** Capital social declarado na Receita, em reais; nulo ou zero quando não informado. */
  capital_social: number | null;
  funcionarios: number | null;
  divida_total: number | null;
  divida_ajuizada: number | null;
  fit_previo: number;
  fit_frente: FitFront;
  faturamento_estimado: number | null;
  /** De onde vem o faturamento estimado (US-0006). */
  faturamento_base: BaseDoFaturamento | null;
  /** Faturamento que o time informou na Prospecção; prevalece sobre a estimativa (US-0006). */
  faturamento_informado?: number | null;
  faturamento_informado_base?: FaturamentoBase | null;
  /** Entrou na lista só por uma atividade secundária (filtro com "Incluir atividade secundária"). */
  pela_secundaria?: boolean;
}

export interface PaginaReceita {
  /** Tamanho da base inteira; nulo quando ela ainda não foi carregada. */
  totalDaBase: number | null;
  carregadaEm: string | null;
  linhas: EmpresaReceita[];
}

/** Total da lista filtrada (US-0003). A contagem para em 100 mil: `limitado` = há mais. */
export interface TotalReceita {
  total: number | null;
  limitado: boolean;
}

/** Clicar na mesma coluna inverte; coluna nova começa pelo que mais interessa. */
export function alternarOrdenacao(atual: OrdenacaoReceita, ordem: OrdemReceita): OrdenacaoReceita {
  if (atual.ordem === ordem) return { ordem, crescente: !atual.crescente };
  return { ordem, crescente: ordem === 'nome' };
}

const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com']);
const SIGLAS: Record<string, string> = { LTDA: 'Ltda.', 'LTDA.': 'Ltda.', SA: 'S.A.', 'S.A.': 'S.A.', 'S/A': 'S.A.', EIRELI: 'Eireli', ME: 'ME', EPP: 'EPP' };

function palavraEmTitulo(palavra: string, indice: number): string {
  const sigla = SIGLAS[palavra.toUpperCase()];
  if (sigla) return sigla;
  const minuscula = palavra.toLocaleLowerCase('pt-BR');
  if (indice > 0 && MINUSCULAS.has(minuscula)) return minuscula;
  return minuscula.charAt(0).toLocaleUpperCase('pt-BR') + minuscula.slice(1);
}

/** A Receita escreve tudo em maiúsculas: "INDUSTRIA DE COLCHOES LTDA" → "Industria de Colchoes Ltda.". */
export function emTitulo(texto: string | null | undefined): string {
  if (!texto) return '';
  return texto.trim().split(/\s+/).map(palavraEmTitulo).join(' ');
}

export const nomeDaEmpresa = (e: Pick<EmpresaReceita, 'nome_fantasia' | 'razao_social'>): string =>
  emTitulo(e.nome_fantasia || e.razao_social);

/** Anos completos desde a abertura; nulo sem data. */
export function anosDeOperacao(abertura: string | null, hoje: Date = new Date()): number | null {
  if (!abertura) return null;
  const [ano, mes, dia] = abertura.split('-').map(Number);
  const passouAniversario = hoje.getMonth() + 1 > mes || (hoje.getMonth() + 1 === mes && hoje.getDate() >= dia);
  return hoje.getFullYear() - ano - (passouAniversario ? 0 : 1);
}

/** O ramo (divisão da CNAE) pelo CNAE principal, de qualquer setor (US-0003). */
export function ramoDaEmpresa(cnaePrincipal: string): string | null {
  return nomeDoRamo(divisaoDoCnae(cnaePrincipal));
}

export type SituacaoDaDivida = { tipo: 'sem' } | { tipo: 'cobranca' | 'ajuizada'; valor: number };

export function situacaoDaDivida(e: Pick<EmpresaReceita, 'divida_total' | 'divida_ajuizada'>): SituacaoDaDivida {
  if (!e.divida_total) return { tipo: 'sem' };
  return { tipo: e.divida_ajuizada ? 'ajuizada' : 'cobranca', valor: Number(e.divida_total) };
}

const ESCALAS: ReadonlyArray<[number, string]> = [[1e9, 'bi'], [1e6, 'mi'], [1e3, 'mil']];

/** "R$ 532 mil", "R$ 1,6 mi". Trunca, nunca arredonda (ADR-0011). */
export function reaisCurtos(valor: number): string {
  if (valuesAreHidden()) return HIDDEN_VALUE_MASK;
  const escala = ESCALAS.find(([limite]) => valor >= limite);
  if (!escala) return `R$ ${Math.trunc(valor).toLocaleString('pt-BR')}`;
  const [limite, unidade] = escala;
  const casas = unidade === 'mil' ? 0 : 1;
  const truncado = Math.trunc((valor / limite) * 10 ** casas) / 10 ** casas;
  return `R$ ${truncado.toLocaleString('pt-BR')} ${unidade}`;
}

/** "Base de 16/11/2026". */
export function dataDaBase(carregadaEm: string | null): string | null {
  if (!carregadaEm) return null;
  return new Date(carregadaEm).toLocaleDateString('pt-BR');
}
