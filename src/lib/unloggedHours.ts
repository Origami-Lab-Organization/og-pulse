import { countWorkingDays, type Holiday } from '@/lib/workingDays';

/**
 * Horas não lançadas: a regra, sem I/O (PUL-182).
 *
 * O QUE ESTA CONTA EXISTE PARA EXPOR. Hora não lançada não deixa de ser paga — ela só some
 * da leitura de custo. Quem se divide entre projeto, comercial e administrativo costuma
 * lançar só a parte do projeto, e as outras frentes aparecem mais baratas do que são.
 *
 * A BASE É A CAPACIDADE, NÃO O PLANEJADO. O planejado só cobre alocação em projeto: alguém
 * com 40h planejadas que trabalha 160h fecharia o mês "em dia" com 120h de custo invisível —
 * exatamente o buraco que a história descreve. Então o que se cobra é a jornada que a
 * empresa paga. O planejado vai junto na tela, como contexto, mas não é o denominador.
 *
 * O QUE SAI DA CAPACIDADE, porque não é hora de trabalho a lançar: fim de semana, feriado,
 * o tempo antes da admissão, o tempo depois do desligamento e férias aprovadas. Sem
 * descontar férias, quem volta de um mês fora aparece como o maior devedor da lista, e o
 * relatório perde a credibilidade no primeiro uso.
 *
 * O RESÍDUO NÃO VAI PARA CENTRO NENHUM (decisão da PUL-182). Mandar a hora que faltou para
 * um centro automático mascara o problema que este relatório existe para mostrar: se some
 * sozinha, ninguém sente falta dela.
 */

/** Um período de ausência aprovada, que não conta como hora a lançar. */
export interface PeriodoDeAusencia {
  start_date: string;
  end_date: string;
}

export interface PessoaParaCobranca {
  id: string;
  nome: string;
  cargo: string | null;
  jornadaDiaria: number;
  /** Data de admissão (yyyy-MM-dd). Antes dela não se cobra hora. */
  dataAdmissao: string | null;
  /** Data de desligamento (yyyy-MM-dd). Depois dela não se cobra hora. */
  dataDesligamento: string | null;
}

export interface LinhaDeHorasNaoLancadas {
  employeeId: string;
  nome: string;
  cargo: string | null;
  /** Dias úteis do período que valem para esta pessoa, já sem feriado, férias e vínculo. */
  diasUteis: number;
  capacidade: number;
  lancado: number;
  /** Horas planejadas de alocação no período. Contexto, não é a base da cobrança. */
  planejado: number;
  naoLancadas: number;
  /** Quanto da capacidade foi lançado, de 0 a 100. */
  cobertura: number;
}

/** Jornada padrão de quem não tem uma definida. Mesmo default do resto do sistema. */
const JORNADA_PADRAO = 8;

/**
 * Os dias úteis que valem para esta pessoa no período.
 *
 * O recorte por admissão e desligamento é o mesmo que `useAnalyticsData` já aplica na
 * utilização — quem entrou no dia 20 não deve o mês inteiro.
 */
export function diasUteisDaPessoa(
  pessoa: PessoaParaCobranca,
  inicio: Date,
  fim: Date,
  feriados: Holiday[],
  ausencias: readonly PeriodoDeAusencia[],
): number {
  const admissao = pessoa.dataAdmissao ? new Date(pessoa.dataAdmissao + 'T00:00:00') : null;
  const desligamento = pessoa.dataDesligamento
    ? new Date(pessoa.dataDesligamento + 'T00:00:00')
    : null;

  if (admissao && admissao > fim) return 0;
  if (desligamento && desligamento < inicio) return 0;

  const de = admissao && admissao > inicio ? admissao : inicio;
  const ate = desligamento && desligamento < fim ? desligamento : fim;
  if (de > ate) return 0;

  const uteis = countWorkingDays(de, ate, feriados);
  const forade = diasDeAusenciaNoPeriodo(ausencias, de, ate, feriados);
  return Math.max(0, uteis - forade);
}

/** Dias úteis cobertos por ausência aprovada dentro da janela. */
function diasDeAusenciaNoPeriodo(
  ausencias: readonly PeriodoDeAusencia[],
  de: Date,
  ate: Date,
  feriados: Holiday[],
): number {
  let total = 0;
  for (const ausencia of ausencias) {
    const inicio = new Date(ausencia.start_date + 'T00:00:00');
    const fim = new Date(ausencia.end_date + 'T00:00:00');
    const recorteInicio = inicio > de ? inicio : de;
    const recorteFim = fim < ate ? fim : ate;
    if (recorteInicio > recorteFim) continue;
    total += countWorkingDays(recorteInicio, recorteFim, feriados);
  }
  return total;
}

export interface EntradaDeCobranca {
  pessoa: PessoaParaCobranca;
  lancado: number;
  planejado: number;
  ausencias: readonly PeriodoDeAusencia[];
}

/**
 * Monta a linha do relatório para uma pessoa.
 *
 * `naoLancadas` tem piso em zero: quem lançou MAIS do que a capacidade não tem crédito a
 * receber aqui, e um número negativo na coluna só confundiria a leitura. Hora a mais é outra
 * conversa — aparece em `cobertura` acima de 100.
 */
export function montarLinha(
  entrada: EntradaDeCobranca,
  inicio: Date,
  fim: Date,
  feriados: Holiday[],
): LinhaDeHorasNaoLancadas {
  const { pessoa, lancado, planejado, ausencias } = entrada;
  const diasUteis = diasUteisDaPessoa(pessoa, inicio, fim, feriados, ausencias);
  const jornada = pessoa.jornadaDiaria > 0 ? pessoa.jornadaDiaria : JORNADA_PADRAO;
  const capacidade = diasUteis * jornada;

  return {
    employeeId: pessoa.id,
    nome: pessoa.nome,
    cargo: pessoa.cargo,
    diasUteis,
    capacidade,
    lancado,
    planejado,
    naoLancadas: Math.max(0, capacidade - lancado),
    cobertura: capacidade > 0 ? (lancado / capacidade) * 100 : 0,
  };
}

/** Faixas de leitura da tela. Comparar sempre pelo membro (ADR-030). */
export const CoberturaStatus = {
  EM_DIA: 'em-dia',
  PARCIAL: 'parcial',
  CRITICO: 'critico',
  SEM_COBRANCA: 'sem-cobranca',
} as const;
export type CoberturaStatus = (typeof CoberturaStatus)[keyof typeof CoberturaStatus];

/**
 * 90% é "em dia" e não 100% de propósito: meia hora de café por dia não é falha de
 * apontamento, e um relatório que acusa todo mundo todo mês deixa de ser lido.
 */
export function statusDaCobertura(linha: LinhaDeHorasNaoLancadas): CoberturaStatus {
  if (linha.capacidade === 0) return CoberturaStatus.SEM_COBRANCA;
  if (linha.cobertura >= 90) return CoberturaStatus.EM_DIA;
  if (linha.cobertura >= 60) return CoberturaStatus.PARCIAL;
  return CoberturaStatus.CRITICO;
}

export const COBERTURA_LABELS: Record<CoberturaStatus, string> = {
  [CoberturaStatus.EM_DIA]: 'Em dia',
  [CoberturaStatus.PARCIAL]: 'Parcial',
  [CoberturaStatus.CRITICO]: 'Crítico',
  [CoberturaStatus.SEM_COBRANCA]: 'Sem cobrança',
};
