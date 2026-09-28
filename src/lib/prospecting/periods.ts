import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  format,
  isLastDayOfMonth,
  parseISO,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toISODate } from '@/types/prospect';
import type {
  Bucket,
  Grain,
  PeriodPreset,
  PeriodRange,
  PeriodSelection,
  ResolvedPeriod,
} from '@/types/prospectMetrics';

/**
 * Períodos da aba Métricas (28/09/2026).
 *
 * A comparação é sempre com o MESMO TRECHO do período anterior: na quarta-feira, "esta
 * semana" compara segunda a quarta com segunda a quarta da semana passada. Comparar meia
 * semana com uma semana inteira faria todo período em andamento parecer queda.
 */

const SEMANA = { weekStartsOn: 1 } as const;

type Intervalo = [Date, Date];
type Recuo = (data: Date, dias: number) => Date;

interface PresetMeta {
  label: string;
  grain: Grain;
  intervalo: ((hoje: Date) => Intervalo) | null;
  recuar: Recuo;
  comparacao: string;
}

/** Fim de mês recua para fim de mês: 30/09 → 31/08, e não 30/08. */
const recuarMeses =
  (meses: number): Recuo =>
  (data) => {
    const recuada = subMonths(data, meses);
    return isLastDayOfMonth(data) ? endOfMonth(recuada) : recuada;
  };
const recuarSemana: Recuo = (data) => subWeeks(data, 1);
const recuarDias: Recuo = (data, dias) => addDays(data, -dias);

const semanaDe = (d: Date): Intervalo => [startOfWeek(d, SEMANA), endOfWeek(d, SEMANA)];
const mesDe = (d: Date): Intervalo => [startOfMonth(d), endOfMonth(d)];

export const PERIOD_PRESETS: Record<PeriodPreset, PresetMeta> = {
  esta_semana: {
    label: 'Esta semana',
    grain: 'semana',
    intervalo: semanaDe,
    recuar: recuarSemana,
    comparacao: 'vs mesmo trecho da semana anterior',
  },
  semana_passada: {
    label: 'Semana passada',
    grain: 'semana',
    intervalo: (h) => semanaDe(subWeeks(h, 1)),
    recuar: recuarSemana,
    comparacao: 'vs semana anterior',
  },
  este_mes: {
    label: 'Este mês',
    grain: 'semana',
    intervalo: mesDe,
    recuar: recuarMeses(1),
    comparacao: 'vs mesmo trecho do mês anterior',
  },
  mes_passado: {
    label: 'Mês passado',
    grain: 'semana',
    intervalo: (h) => mesDe(subMonths(h, 1)),
    recuar: recuarMeses(1),
    comparacao: 'vs mês anterior',
  },
  este_trimestre: {
    label: 'Este trimestre',
    grain: 'mes',
    intervalo: (h) => [startOfQuarter(h), endOfQuarter(h)],
    recuar: recuarMeses(3),
    comparacao: 'vs mesmo trecho do trimestre anterior',
  },
  ultimos_30: {
    label: 'Últimos 30 dias',
    grain: 'semana',
    intervalo: (h) => [addDays(h, -29), h],
    recuar: recuarDias,
    comparacao: 'vs 30 dias anteriores',
  },
  ultimos_90: {
    label: 'Últimos 90 dias',
    grain: 'mes',
    intervalo: (h) => [addDays(h, -89), h],
    recuar: recuarDias,
    comparacao: 'vs 90 dias anteriores',
  },
  personalizado: {
    label: 'Personalizado',
    grain: 'semana',
    intervalo: null,
    recuar: recuarDias,
    comparacao: 'vs período anterior de mesma duração',
  },
};

export const PERIOD_PRESET_OPTIONS = (Object.keys(PERIOD_PRESETS) as PeriodPreset[]).map((value) => ({
  value,
  label: PERIOD_PRESETS[value].label,
}));

/** Período sem intervalo próprio: as datas vêm da pessoa. */
export function isCustomPreset(preset: PeriodPreset): boolean {
  return PERIOD_PRESETS[preset].intervalo === null;
}

/**
 * Janela móvel como padrão: um período de calendário abre vazio no primeiro dia ("esta
 * semana" numa segunda-feira), e a primeira leitura da aba seria uma tela de zeros.
 */
export const DEFAULT_PERIOD: PeriodSelection = { preset: 'ultimos_30', grain: 'semana' };

const iso = (data: Date) => toISODate(data);

function intervaloEscolhido(selecao: PeriodSelection, hoje: Date): PeriodRange {
  const meta = PERIOD_PRESETS[selecao.preset];
  if (meta.intervalo) {
    const [de, ate] = meta.intervalo(hoje);
    return { from: iso(de), to: iso(ate) };
  }
  return selecao.custom ?? intervaloEscolhido(DEFAULT_PERIOD, hoje);
}

/** O que já passou do período. Um período inteiro no futuro fica como está (e conta zero). */
function trechoDecorrido(range: PeriodRange, hojeISO: string): PeriodRange {
  if (range.from > hojeISO) return range;
  return { from: range.from, to: range.to < hojeISO ? range.to : hojeISO };
}

export function resolvePeriod(selecao: PeriodSelection, hoje = new Date()): ResolvedPeriod {
  const meta = PERIOD_PRESETS[selecao.preset];
  const range = intervaloEscolhido(selecao, hoje);
  const elapsed = trechoDecorrido(range, iso(hoje));
  const dias = differenceInCalendarDays(parseISO(elapsed.to), parseISO(elapsed.from)) + 1;
  const previous = {
    from: iso(meta.recuar(parseISO(elapsed.from), dias)),
    to: iso(meta.recuar(parseISO(elapsed.to), dias)),
  };
  return { range, elapsed, previous, comparisonLabel: meta.comparacao };
}

interface GrainMeta {
  inicio: (d: Date) => Date;
  fim: (d: Date) => Date;
  recuar: (d: Date, n: number) => Date;
  rotulo: (d: Date) => string;
  titulo: (inicio: Date, fim: Date) => string;
}

const GRAOS: Record<Grain, GrainMeta> = {
  semana: {
    inicio: (d) => startOfWeek(d, SEMANA),
    fim: (d) => endOfWeek(d, SEMANA),
    recuar: (d, n) => subWeeks(d, n),
    rotulo: (d) => format(d, 'dd/MM'),
    titulo: (i, f) => `Semana de ${format(i, 'dd/MM')} a ${format(f, 'dd/MM/yyyy')}`,
  },
  mes: {
    inicio: startOfMonth,
    fim: endOfMonth,
    recuar: (d, n) => subMonths(d, n),
    rotulo: (d) => format(d, 'MMM/yy', { locale: ptBR }),
    titulo: (i) => format(i, "MMMM 'de' yyyy", { locale: ptBR }),
  },
};

export const GRAIN_OPTIONS: ReadonlyArray<{ value: Grain; label: string }> = [
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
];

/**
 * As colunas da evolução: `quantidade` semanas ou meses terminando no período escolhido.
 * O período escolhido é o destaque; as colunas anteriores são o contexto que diz se o
 * número é bom.
 */
export function trendBuckets(
  periodo: ResolvedPeriod,
  grain: Grain,
  hoje = new Date(),
  quantidade = 12,
): Bucket[] {
  const g = GRAOS[grain];
  const ultimo = g.inicio(parseISO(periodo.elapsed.to));
  const hojeISO = iso(hoje);
  return Array.from({ length: quantidade }, (_, i) => {
    const inicio = g.recuar(ultimo, quantidade - 1 - i);
    const fim = g.fim(inicio);
    const from = iso(inicio);
    const to = iso(fim);
    return {
      key: from,
      from,
      to,
      label: g.rotulo(inicio),
      title: g.titulo(inicio, fim),
      selected: from <= periodo.elapsed.to && to >= periodo.range.from,
      inProgress: from <= hojeISO && to > hojeISO,
    };
  });
}

/** Início da semana (segunda) ou do mês que contém a data. */
export function bucketKeyOf(dataISO: string, grain: Grain): string {
  return iso(GRAOS[grain].inicio(parseISO(dataISO)));
}

export function isInRange(dataISO: string, range: PeriodRange): boolean {
  return dataISO >= range.from && dataISO <= range.to;
}

export function formatDay(dataISO: string): string {
  const [ano, mes, dia] = dataISO.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatRange(range: PeriodRange): string {
  return range.from === range.to ? formatDay(range.from) : `${formatDay(range.from)} a ${formatDay(range.to)}`;
}

/** Data local de um timestamp: o dia de quem olha, sem passar por UTC. */
export function localDay(timestamp: string): string {
  return toISODate(new Date(timestamp));
}
