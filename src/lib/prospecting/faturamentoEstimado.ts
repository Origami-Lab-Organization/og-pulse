import { HIDDEN_VALUE_MASK } from '@/lib/formatters';
import { valuesAreHidden } from '@/lib/hideValuesStore';
import type { BaseDoFaturamento, EmpresaParaModelo, Faturamento } from '@/types/filtrosReceita';
import type { FaturamentoBase } from '@/types/prospect';
import MODELO from './modeloDeFaturamento.json';
import CAPITAL from './calibracaoCapital.json';
import { calibracaoDoSetor, fatorDoSetor } from './fatorDoSetor';
import { receitaPorPessoa } from './receitaPorPessoa';

/**
 * Faturamento estimado das empresas da base da Receita (US-0006, US-0018). Quatro bases, nesta
 * ordem:
 *
 * 1. **RAIS:** funcionários × receita por pessoa da classe da CNAE e do porte
 *    (receitaPorPessoa.ts), combinada com o capital a partir de R$ 10 mi e ajustada pelo fator
 *    do setor, quando ele já foi calibrado com os casos do time (fatorDoSetor.ts).
 * 1a. **Capital:** sem RAIS, com capital a partir de R$ 10 mi, fora de holdings, imobiliárias e
 *    SPEs: a mesma conta do capital, com a previsão do modelo no lugar da RAIS (US-0018).
 * 2. **Modelo:** sem funcionário na RAIS, o modelo de empresas parecidas
 *    (modeloDeFaturamento.json, calibrado por scripts/receita/calibrar-faturamento.ts) prevê
 *    os funcionários pelas características da empresa; vale só quando passa do piso.
 * 3. **Piso:** R$ 4,8 mi, o que a Receita garante para quem não é ME nem EPP.
 *
 * A carga (scripts/receita/sincronizar-base.ts) grava o valor e a base; a tela mostra
 * "≈ valor" com a base, e a conta no tooltip. Moeda truncada, nunca arredondada (ADR-0011).
 * Não entra na nota de fit (ADR-0042).
 */

export const BASE_RAIS: BaseDoFaturamento = 'rais';
export const BASE_CAPITAL: BaseDoFaturamento = 'capital';
export const BASE_MODELO: BaseDoFaturamento = 'modelo';
export const BASE_PISO: BaseDoFaturamento = 'piso';

/** Quem não é ME nem EPP fatura acima disso (porte "Demais" da Receita). */
export const PISO_DO_PORTE = 4_800_000;
/** Acima disso, no ano anterior, a empresa é obrigada ao Lucro Real (Lei 9.718/1998, art. 14; sinal da Lei do Bem, ADR-0041). */
export const LIMITE_DO_LUCRO_REAL = 78_000_000;

// ---------- modelo de empresas parecidas ----------

const SECOES = 'ABCDEFGHIJKLMNOPQRSTU'.split('');
const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
const NATUREZAS = ['limitada', 'sa_fechada', 'sa_aberta', 'outras_empresas', 'associacoes', 'pessoa_fisica'];

/** Os nomes, na ordem dos coeficientes: a primeira categoria de cada grupo é a referência. */
export const CARACTERISTICAS: readonly string[] = [
  'const', 'log_capital', 'tem_capital', 'log_idade', 'log_filiais', 'log_socios', 'log_divida', 'email', 'telefone',
  ...SECOES.slice(1).map((s) => `secao_${s}`),
  ...NATUREZAS.slice(1).map((n) => `nat_${n}`),
  ...UFS.slice(1).map((u) => `uf_${u}`),
];

// Natureza jurídica da Receita: os mesmos grupos do filtro (US-0003).
const NATUREZA_POR_CODIGO: Record<string, string> = { '2062': 'limitada', '2054': 'sa_fechada', '2046': 'sa_aberta' };
const NATUREZA_POR_INICIO: Record<string, string> = { '3': 'associacoes', '4': 'pessoa_fisica' };

function grupoDaNatureza(codigo: string | null): string {
  const c = codigo ?? '';
  return NATUREZA_POR_CODIGO[c] ?? NATUREZA_POR_INICIO[c.slice(0, 1)] ?? 'outras_empresas';
}

function anosCompletos(abertura: string | null, hoje: string): number {
  if (!abertura) return 0;
  const [a, m, d] = abertura.split('-').map(Number);
  const [ha, hm, hd] = hoje.split('-').map(Number);
  const anos = ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0);
  return Math.max(anos, 0);
}

const um = (sim: boolean) => (sim ? 1 : 0);

/** As características na ordem de CARACTERISTICAS. A calibração e a carga usam esta mesma função. */
export function caracteristicasDoModelo(e: EmpresaParaModelo, hoje: string): number[] {
  const capital = e.capital ?? 0;
  const natureza = grupoDaNatureza(e.natureza);
  return [
    1,
    Math.log1p(capital),
    um(capital > 0),
    Math.log1p(anosCompletos(e.abertura, hoje)),
    Math.log1p(e.filiais),
    Math.log1p(e.socios),
    Math.log1p(e.divida ?? 0),
    um(e.email),
    um(e.telefone),
    ...SECOES.slice(1).map((s) => um(e.secao === s)),
    ...NATUREZAS.slice(1).map((n) => um(natureza === n)),
    ...UFS.slice(1).map((u) => um(e.uf === u)),
  ];
}

interface Modelo {
  nomes: string[];
  coeficientes: number[];
}

function coeficientes(): number[] {
  const m = MODELO as Modelo;
  if (m.nomes.join() !== CARACTERISTICAS.join()) {
    throw new Error('modeloDeFaturamento.json não bate com as características: rode a calibração de novo.');
  }
  return m.coeficientes;
}

/** Funcionários previstos para uma empresa sem RAIS. */
export function funcionariosPrevistos(e: EmpresaParaModelo, hoje: string): number {
  const beta = coeficientes();
  const x = caracteristicasDoModelo(e, hoje);
  return Math.exp(x.reduce((soma, v, i) => soma + v * beta[i], 0));
}

// ---------- estimativa ----------

const NATUREZAS_SA = new Set(['2046', '2054', '2038']);

/**
 * Capital social a partir de R$ 10 mi, com RAIS e fora de holdings e imobiliárias: a
 * estimativa pela RAIS é combinada com o capital (calibracaoCapital.json, US-0006, 18/11/2026).
 * Nas empresas que o time conhece, o erro mediano caiu de 4,4 para 2 vezes; abaixo de R$ 10 mi
 * não há dado para calibrar, e vale só a RAIS.
 */
export function usaCapital(cnae: string, capital: number | null): boolean {
  return (capital ?? 0) >= CAPITAL.capital_minimo && !CAPITAL.divisoes_fora.includes(cnae.slice(0, 2));
}

function comCapital(pelaRais: number, capital: number, natureza: string | null): number {
  const sa = NATUREZAS_SA.has(natureza ?? '') ? 1 : 0;
  const ln = CAPITAL.constante + CAPITAL.peso_estimativa * Math.log(pelaRais) + CAPITAL.peso_capital * Math.log(capital) + CAPITAL.ajuste_sa * sa;
  return Math.trunc(Math.exp(ln));
}

/**
 * Funcionários × receita por pessoa (com o capital, quando ele entra), ajustado pelo fator do
 * setor; nulo sem funcionário ou sem receita por pessoa para o ramo. Serve à RAIS da carga e
 * aos funcionários confirmados pelo time (US-0020), que a tela recalcula. A calibração por
 * setor pede a conta sem o fator (`comFatorDoSetor = false`).
 */
export function estimarPorFuncionarios(
  cnae: string,
  funcionarios: number | null,
  capital: number | null,
  natureza: string | null,
  comFatorDoSetor = true,
): number | null {
  if (!funcionarios || funcionarios <= 0) return null;
  const r = receitaPorPessoa(cnae, funcionarios);
  if (!r) return null;
  const pelaRais = funcionarios * r.mil * 1000;
  const conta = usaCapital(cnae, capital) ? comCapital(pelaRais, capital!, natureza) : pelaRais;
  return comFatorDoSetor ? Math.trunc(conta * fatorDoSetor(cnae)) : conta;
}

/**
 * Funcionários confiáveis — do time ou a estimativa da RAIS improvável (US-0054, decisão de
 * 26/11/2026): funcionários × receita por pessoa × fator do setor, sem a correção pelo capital. A
 * correção existe para compensar a RAIS baixa; aplicada de novo, inflava (Gecal: R$ 1,3 bi com 411
 * funcionários, R$ 311 mi sem ela).
 */
export function estimarPorFuncionariosConfiaveis(cnae: string, funcionarios: number | null): number | null {
  return estimarPorFuncionarios(cnae, funcionarios, null, null);
}

// Sociedade de propósito específico: capital alto para um único empreendimento, sem relação
// com o faturamento (US-0018).
const SPE = /\bSPE\b|PROP[OÓ]SITO ESPEC[IÍ]FICO/i;

/** Sem RAIS, o capital entra a partir de R$ 10 mi, fora de holdings, imobiliárias e SPEs (US-0018). */
export function usaCapitalSemRais(cnae: string, empresa: EmpresaParaModelo): boolean {
  return usaCapital(cnae, empresa.capital) && !SPE.test(empresa.nome ?? '');
}

/** Faturamento previsto pelo modelo de empresas parecidas; zero sem receita por pessoa do ramo. */
function previstoPeloModelo(cnae: string, empresa: EmpresaParaModelo, hoje: string): number {
  const previstos = funcionariosPrevistos(empresa, hoje);
  const r = receitaPorPessoa(cnae, Math.max(1, Math.round(previstos)));
  return r ? Math.trunc(previstos * r.mil * 1000) : 0;
}

/**
 * O faturamento estimado de uma empresa, em reais, truncado: funcionários × receita por pessoa do
 * ramo (IBGE) × fator do setor; sem funcionários, empresas parecidas quando passam do piso; senão,
 * o piso.
 *
 * Sem a correção pelo capital social (US-0056, decisão do Victor de 26/11/2026): com os
 * funcionários da referência, a conta sem ela acertou a faixa do Econodata ou do time em 6 de 8
 * Âncoras da região (mediana 1,09 vez); com ela, errava 7 vezes para cima na mediana (Thinal 15×,
 * Cimento UAU 109×). O custo é a empresa cuja RAIS conta pouca gente sem ser improvável (Arape:
 * R$ 350 mi reais, R$ 6 mi pela conta), que o time corrige informando funcionários ou faturamento.
 */
export function estimarFaturamento(cnae: string, funcionarios: number | null, empresa: EmpresaParaModelo, hoje: string): Faturamento {
  const pelosFuncionarios = estimarPorFuncionarios(cnae, funcionarios, null, null);
  if (pelosFuncionarios != null) return { valor: pelosFuncionarios, base: BASE_RAIS };
  const previsto = previstoPeloModelo(cnae, empresa, hoje);
  return previsto > PISO_DO_PORTE ? { valor: previsto, base: BASE_MODELO } : { valor: PISO_DO_PORTE, base: BASE_PISO };
}

/**
 * Acima de R$ 78 mi de receita no ano anterior, o Lucro Real é obrigatório (Lei 9.718/1998,
 * art. 14). Só a estimativa pela RAIS sustenta o aviso; o modelo erra demais para isso.
 */
export function lucroRealProvavel(valor: number, base: BaseDoFaturamento): boolean {
  return base === BASE_RAIS && valor > LIMITE_DO_LUCRO_REAL;
}

// ---------- exibição ----------

const ESCALAS: ReadonlyArray<[number, string]> = [[1e9, 'bi'], [1e6, 'mi'], [1e3, 'mil'], [1, '']];

/** Abaixo de 10 na unidade, uma casa; acima, só o inteiro. Sempre truncado. */
export function emReais(valor: number): string {
  const [limite, unidade] = ESCALAS.find(([l]) => valor >= l) ?? ESCALAS[ESCALAS.length - 1];
  // Multiplica antes de dividir: 2.300.000 / 1e6 × 10 dá 22,99… em ponto flutuante.
  const casas = valor < 10 * limite ? 10 : 1;
  const numero = (Math.trunc((valor * casas) / limite) / casas).toLocaleString('pt-BR');
  return `R$ ${numero}${unidade ? ` ${unidade}` : ''}`;
}

/** "≈ R$ 723 mi", ou "acima de R$ 4,8 mi" quando só há o piso. */
export function textoDoFaturamento(valor: number, base: BaseDoFaturamento): string {
  if (valuesAreHidden()) return HIDDEN_VALUE_MASK;
  return base === BASE_PISO ? `acima de ${emReais(PISO_DO_PORTE)}` : `≈ ${emReais(valor)}`;
}

export const ROTULO_DA_BASE: Record<BaseDoFaturamento, string> = {
  rais: 'pela RAIS',
  capital: 'pelo capital social',
  modelo: 'aproximado',
  piso: 'pelo porte',
};

const ERRO_DO_MODELO = ((MODELO as { erro_mediano?: number }).erro_mediano ?? 0).toLocaleString('pt-BR');

const PELO_PISO =
  'Sem funcionários na RAIS. A Receita classifica a empresa como média ou grande (nem ME nem EPP), o que significa faturamento acima de R$ 4,8 mi por ano.';

const detalhe = (r: { nivel: string; porte: string | null; fonte: string }) =>
  `${r.nivel} da CNAE${r.porte ? `, empresas de ${r.porte}` : ''}; ${r.fonte}`;

const ERRO_DO_CAPITAL = CAPITAL.erro_mediano_casos_do_time.toLocaleString('pt-BR');

/** As bases sem RAIS: a explicação não depende dos funcionários. */
const SEM_RAIS: Partial<Record<BaseDoFaturamento, (capital: number | null) => string>> = {
  piso: () => PELO_PISO,
  modelo: () =>
    `Sem funcionários na RAIS. Estimado por empresas parecidas (setor, capital social, idade, filiais, sócios, natureza jurídica e estado) × a receita por pessoa do IBGE. Erro típico de ${ERRO_DO_MODELO} vezes, para mais ou para menos.`,
  capital: (capital) =>
    `Sem funcionários na RAIS (podem estar registrados em outro CNPJ do grupo). Estimado pelo capital social${capital ? ` de ${emReais(capital)}` : ''}, combinado com a previsão por empresas parecidas, pela conta calibrada com companhias abertas e casos do time (erro típico de ${ERRO_DO_CAPITAL} vezes, maior sem a RAIS).`,
};

/** O ajuste do setor, quando já há casos do time para calibrar (US-0018). */
function notaDoSetor(cnae: string): string {
  const s = calibracaoDoSetor(cnae);
  if (!s) return '';
  const fator = (Math.trunc(s.fator * 100) / 100).toLocaleString('pt-BR');
  return ` Ajustado × ${fator} pelos ${s.casos} casos do time no ${s.nome}.`;
}

function origemDaConta(doTime: boolean, estimados: boolean): string {
  if (doTime) return 'confirmados pelo time';
  return estimados ? 'estimados por empresas parecidas; a RAIS veio baixa demais para o porte' : 'RAIS';
}

/** A explicação do valor, para o tooltip (US-0006, cenário 5). */
export function contaDoFaturamento(
  cnae: string,
  funcionarios: number | null,
  base: BaseDoFaturamento,
  capital: number | null = null,
  doTime = false,
  estimados = false,
): string {
  const semRais = SEM_RAIS[base];
  if (semRais) return semRais(capital);
  const r = receitaPorPessoa(cnae, funcionarios ?? 0);
  if (!r) return PELO_PISO;
  const pessoas = (funcionarios ?? 0).toLocaleString('pt-BR');
  const conta = `${pessoas} funcionários (${origemDaConta(doTime, estimados)}) × R$ ${r.mil.toLocaleString('pt-BR')} mil por pessoa (${detalhe(r)})`;
  return `${conta}. É uma média: empresas do mesmo ramo e porte variam bastante em torno dela.${notaDoSetor(cnae)}`;
}

// ---------- informado pelo time ----------

/** O valor que o time informou na Prospecção, sem "≈": não é estimativa da base. */
export function textoDoInformado(valor: number): string {
  return valuesAreHidden() ? HIDDEN_VALUE_MASK : emReais(valor);
}

export const ROTULO_DO_INFORMADO: Record<FaturamentoBase, string> = {
  estimado: 'estimado pelo time',
  apurado: 'apurado pelo time',
  calculado: 'calculado pela base',
};

/** Com o valor do time, sem margem: passou de R$ 78 mi, o selo aparece. */
export const lucroRealPeloTime = (valor: number): boolean => valor > LIMITE_DO_LUCRO_REAL;
