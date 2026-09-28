import { differenceInCalendarDays, parseISO, subDays } from 'date-fns';
import {
  PROSPECT_FUNNEL_STAGES,
  getDiscardReasonLabel,
  getProspectStageLabel,
  isTaskOverdue,
  toISODate,
  type PendingTaskLite,
  type ProspectWithCompany,
} from '@/types/prospect';
import type {
  Bucket,
  CutFlowRow,
  CycleTime,
  DiscardCount,
  Grain,
  ListHealthData,
  MetricDefinition,
  MetricFilter,
  MetricsDataset,
  MetricsSource,
  MetricValue,
  Occurrence,
  PeriodLosses,
  PeriodRange,
  ProspectMilestones,
  ResolvedPeriod,
  SafraPoint,
  SalesSummary,
  SeriesPoint,
  StageLossCount,
} from '@/types/prospectMetrics';
import {
  FUNNEL_RATE_LABELS,
  FUNNEL_STEP_META,
  calculateAccountCoverage,
  cutValue,
  formatRate,
  formatRatio,
  funnelSteps,
  type ProspectCut,
  type ProspectingFunnel,
} from './metrics';
import { historyStartOf } from './milestones';
import { bucketKeyOf, isInRange, localDay } from './periods';

/**
 * Métricas da Prospecção por período (28/09/2026).
 *
 * Duas leituras, e a tela não mistura as duas:
 *   - FLUXO — o que aconteceu no período: quantas reuniões foram agendadas na semana. São
 *     os números do topo e a evolução;
 *   - SAFRA — o que aconteceu com quem foi ativado no período, até hoje. É o quadro com as
 *     taxas: "dos contatos ativados em setembro, quantos já responderam". Dividir as
 *     reuniões da semana pelas conversas da mesma semana passaria de 100% sempre que a
 *     agenda viesse de conversas antigas.
 */

/** Abaixo disso, taxa e mediana viram ruído — "100% de resposta" com um contato. */
export const MIN_SAMPLE = 5;

/** A cadência leva ~12 dias e a reunião vem depois: safra mais nova ainda está amadurecendo. */
const DIAS_DE_MATURACAO = 21;

function aceitaContato(filtro: MetricFilter) {
  return (p: ProspectWithCompany) =>
    (!filtro.ownerId || p.owner_id === filtro.ownerId) && (!filtro.lever || p.lever === filtro.lever);
}

/** Empresa não tem alavanca; com responsável, conta as que a pessoa cadastrou. */
function empresasDoFiltro(fonte: MetricsSource, filtro: MetricFilter) {
  if (filtro.lever) return [];
  return filtro.ownerId ? fonte.companies.filter((c) => c.created_by === filtro.ownerId) : fonte.companies;
}

export function buildDataset(
  fonte: MetricsSource,
  marcos: ProspectMilestones[],
  filtro: MetricFilter,
): MetricsDataset {
  const aceita = aceitaContato(filtro);
  const milestones = marcos.filter((m) => aceita(m.prospect));
  const ids = new Set(milestones.map((m) => m.prospect.id));
  return {
    companies: empresasDoFiltro(fonte, filtro),
    milestones,
    activities: fonte.activities.filter((a) => ids.has(a.prospect_id)),
    changes: fonte.changes.filter((c) => ids.has(c.prospect_id)),
    companiesApply: !filtro.lever,
    historyStart: historyStartOf(fonte.changes),
  };
}

function dosMarcos(data: (m: ProspectMilestones) => string | null) {
  return (d: MetricsDataset): Occurrence[] =>
    d.milestones.flatMap((m) => {
      const date = data(m);
      return date ? [{ date, prospect: m.prospect }] : [];
    });
}

/** A conta abre no 1º toque em qualquer contato dela. */
function contasAbertas(d: MetricsDataset): Occurrence[] {
  const primeira = new Map<string, Occurrence>();
  for (const m of d.milestones) {
    const atual = primeira.get(m.prospect.company_id);
    if (m.ativado && (!atual || m.ativado < atual.date)) {
      primeira.set(m.prospect.company_id, { date: m.ativado, prospect: m.prospect, company: m.prospect.company ?? undefined });
    }
  }
  return [...primeira.values()];
}

const doFunil = (indice: number) => ({
  label: FUNNEL_STEP_META[indice].label,
  question: FUNNEL_STEP_META[indice].question,
});

export const METRIC_DEFINITIONS: readonly MetricDefinition[] = [
  {
    key: 'empresas',
    label: 'Empresas cadastradas',
    question: 'Estou alimentando a lista?',
    block: 'lista',
    needsHistory: false,
    drillable: true,
    applies: (d) => d.companiesApply,
    occurrences: (d) => d.companies.map((c) => ({ date: localDay(c.created_at), company: c })),
  },
  {
    key: 'contatos',
    label: 'Contatos cadastrados',
    question: 'As contas têm gente para abordar?',
    block: 'lista',
    needsHistory: false,
    drillable: true,
    occurrences: dosMarcos((m) => m.cadastrado),
  },
  { key: 'contas', ...doFunil(0), block: 'esforco', needsHistory: false, drillable: true, occurrences: contasAbertas },
  { key: 'ativados', ...doFunil(1), block: 'esforco', needsHistory: false, drillable: true, occurrences: dosMarcos((m) => m.ativado) },
  {
    key: 'atividades',
    label: 'Atividades registradas',
    question: 'Quanto trabalho de abordagem foi feito?',
    block: 'esforco',
    needsHistory: false,
    drillable: false,
    occurrences: (d) => d.activities.map((a) => ({ date: a.activity_date })),
  },
  { key: 'conversas', ...doFunil(2), block: 'resultado', needsHistory: false, drillable: true, occurrences: dosMarcos((m) => m.conversa) },
  { key: 'agendadas', ...doFunil(3), block: 'resultado', needsHistory: true, drillable: true, occurrences: dosMarcos((m) => m.agendada.date) },
  { key: 'feitas', ...doFunil(4), block: 'resultado', needsHistory: true, drillable: true, occurrences: dosMarcos((m) => m.feita.date) },
  { key: 'qualificadas', ...doFunil(5), block: 'resultado', needsHistory: true, drillable: true, occurrences: dosMarcos((m) => m.qualificada.date) },
  {
    key: 'ganhos',
    label: 'Ganhos',
    question: 'Quantos negócios fechamos?',
    block: 'desfecho',
    needsHistory: false,
    drillable: true,
    occurrences: dosMarcos((m) => m.ganho),
  },
  {
    key: 'perdas',
    label: 'Perdas',
    question: 'Quantos contatos perdemos — e por quê?',
    block: 'desfecho',
    needsHistory: false,
    drillable: true,
    occurrences: dosMarcos((m) => m.perda?.date ?? null),
  },
];

const aplicaA = (def: MetricDefinition, d: MetricsDataset) => def.applies?.(d) ?? true;

/** A métrica depende do histórico de etapa e o trecho começa antes dele. */
export function isBeforeHistory(def: MetricDefinition, d: MetricsDataset, desde: string): boolean {
  return def.needsHistory && !!d.historyStart && desde < d.historyStart;
}

function valorDa(def: MetricDefinition, d: MetricsDataset, periodo: ResolvedPeriod): MetricValue {
  const aplica = aplicaA(def, d);
  const ocorrencias = aplica ? def.occurrences(d) : [];
  const contar = (r: PeriodRange) => (aplica ? ocorrencias.filter((o) => isInRange(o.date, r)).length : null);
  return {
    definition: def,
    current: contar(periodo.elapsed),
    previous: contar(periodo.previous),
    partial: isBeforeHistory(def, d, periodo.previous.from),
  };
}

export function metricValues(d: MetricsDataset, periodo: ResolvedPeriod): MetricValue[] {
  return METRIC_DEFINITIONS.map((def) => valorDa(def, d, periodo));
}

/** O que foi contado, do mais recente para o mais antigo — é a lista do detalhe. */
export function occurrencesInRange(def: MetricDefinition, d: MetricsDataset, range: PeriodRange): Occurrence[] {
  if (!aplicaA(def, d)) return [];
  return def
    .occurrences(d)
    .filter((o) => isInRange(o.date, range))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function contarPorColuna(def: MetricDefinition, d: MetricsDataset, grain: Grain): Map<string, number> | null {
  if (!aplicaA(def, d)) return null;
  const mapa = new Map<string, number>();
  for (const o of def.occurrences(d)) {
    const chave = bucketKeyOf(o.date, grain);
    mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
  }
  return mapa;
}

/** Coluna inteira antes do histórico não é zero: é "sem registro". */
function valorNaColuna(def: MetricDefinition, d: MetricsDataset, bucket: Bucket, mapa: Map<string, number> | null) {
  if (!mapa || isBeforeHistory(def, d, bucket.to)) return null;
  return mapa.get(bucket.key) ?? 0;
}

export function metricSeries(d: MetricsDataset, buckets: Bucket[], grain: Grain): SeriesPoint[] {
  const contagens = METRIC_DEFINITIONS.map((def) => [def, contarPorColuna(def, d, grain)] as const);
  return buckets.map((bucket) => ({
    bucket,
    values: Object.fromEntries(contagens.map(([def, mapa]) => [def.key, valorNaColuna(def, d, bucket, mapa)])),
  }));
}

const razao = (parte: number, total: number) => (total >= MIN_SAMPLE ? parte / total : null);

function contarSafra(marcos: ProspectMilestones[]) {
  return {
    contas: new Set(marcos.map((m) => m.prospect.company_id)).size,
    ativados: marcos.length,
    conversas: marcos.filter((m) => m.conversa).length,
    agendadas: marcos.filter((m) => m.agendada.reached).length,
    feitas: marcos.filter((m) => m.feita.reached).length,
    qualificadas: marcos.filter((m) => m.qualificada.reached).length,
    ganhos: marcos.filter((m) => m.ganho).length,
  };
}

const safraDe = (d: MetricsDataset, range: PeriodRange) =>
  d.milestones.filter((m) => m.ativado && isInRange(m.ativado, range));

/**
 * Rótulos do que o GRUPO fez, e não os do fluxo: o quadro fica abaixo dos números do
 * período, e "Conversas iniciadas" com dois valores diferentes na mesma tela pareceria erro.
 */
const ROTULOS_DA_SAFRA = [
  'Contas dos ativados',
  'Ativados',
  'Responderam',
  'Agendaram reunião',
  'Fizeram reunião',
  'Qualificados',
];

/** O quadro da safra: os contatos ativados no período e até onde chegaram, até hoje. */
export function safraFunnel(d: MetricsDataset, periodo: ResolvedPeriod): ProspectingFunnel {
  const s = contarSafra(safraDe(d, periodo.elapsed));
  const passos = funnelSteps([s.contas, s.ativados, s.conversas, s.agendadas, s.feitas, s.qualificadas]);
  return {
    steps: [
      ...passos.map((passo, i) => ({ ...passo, label: ROTULOS_DA_SAFRA[i] })),
      { key: 'ganhos', label: 'Viraram venda', value: s.ganhos, question: 'A oportunidade virou negócio fechado?' },
    ],
    rates: [
      { value: formatRatio(s.ativados, s.contas), label: FUNNEL_RATE_LABELS[0] },
      { value: formatRate(razao(s.conversas, s.ativados)), label: FUNNEL_RATE_LABELS[1] },
      { value: formatRate(razao(s.agendadas, s.conversas)), label: FUNNEL_RATE_LABELS[2] },
      { value: formatRate(razao(s.feitas, s.agendadas)), label: FUNNEL_RATE_LABELS[3] },
      { value: formatRate(razao(s.qualificadas, s.feitas)), label: FUNNEL_RATE_LABELS[4] },
      { value: formatRate(razao(s.ganhos, s.qualificadas)), label: 'taxa de fechamento' },
    ],
  };
}

export function safraSeries(d: MetricsDataset, buckets: Bucket[], hoje = new Date()): SafraPoint[] {
  const maduraAte = toISODate(subDays(hoje, DIAS_DE_MATURACAO));
  return buckets.map((bucket) => {
    const s = contarSafra(safraDe(d, bucket));
    return {
      bucket,
      ativados: s.ativados,
      resposta: razao(s.conversas, s.ativados),
      agendamento: razao(s.agendadas, s.conversas),
      comparecimento: razao(s.feitas, s.agendadas),
      qualificacao: razao(s.qualificadas, s.feitas),
      fechamento: razao(s.ganhos, s.qualificadas),
      maturing: bucket.to > maduraAte,
    };
  });
}

const dias = (de: string, ate: string) => differenceInCalendarDays(parseISO(ate), parseISO(de));
const entre = (de: string | null, ate: string | null) => (de && ate ? dias(de, ate) : null);

function mediana(valores: number[]): number | null {
  if (valores.length < MIN_SAMPLE) return null;
  const ordem = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordem.length / 2);
  return ordem.length % 2 ? ordem[meio] : (ordem[meio - 1] + ordem[meio]) / 2;
}

interface Ciclo {
  key: string;
  label: string;
  unit: CycleTime['unit'];
  /** O marco que coloca o contato no período. */
  quando: (m: ProspectMilestones) => string | null;
  valor: (m: ProspectMilestones) => number | null;
}

const CICLOS: readonly Ciclo[] = [
  { key: 'toques', label: 'Toques até responder', unit: 'toques', quando: (m) => m.conversa, valor: (m) => m.toquesAteResponder },
  { key: 'resposta', label: 'Toque → resposta', unit: 'dias', quando: (m) => m.conversa, valor: (m) => entre(m.ativado, m.conversa) },
  {
    key: 'agendamento',
    label: 'Resposta → reunião',
    unit: 'dias',
    quando: (m) => m.agendada.date,
    valor: (m) => entre(m.conversa, m.agendada.date),
  },
  {
    key: 'qualificacao',
    label: 'Reunião → qualificação',
    unit: 'dias',
    quando: (m) => m.qualificada.date,
    valor: (m) => entre(m.feita.date, m.qualificada.date),
  },
  { key: 'ganho', label: 'Toque → ganho', unit: 'dias', quando: (m) => m.ganho, valor: (m) => entre(m.ativado, m.ganho) },
];

/** Mediana, não média: um contato que respondeu depois de 60 dias não pode puxar o número do time. */
export function cycleTimes(d: MetricsDataset, periodo: ResolvedPeriod): CycleTime[] {
  return CICLOS.map((c) => {
    const valores = d.milestones
      .filter((m) => {
        const quando = c.quando(m);
        return !!quando && isInRange(quando, periodo.elapsed);
      })
      .map(c.valor)
      .filter((v): v is number => v !== null && v >= 0);
    return { key: c.key, label: c.label, unit: c.unit, median: mediana(valores), sample: valores.length };
  });
}

function contarPor<T>(itens: T[], chave: (item: T) => string): Map<string, { item: T; count: number }> {
  const mapa = new Map<string, { item: T; count: number }>();
  for (const item of itens) {
    const k = chave(item);
    mapa.set(k, { item, count: (mapa.get(k)?.count ?? 0) + 1 });
  }
  return mapa;
}

const maisFrequentes = <T extends { count: number }>(lista: T[]) => lista.sort((a, b) => b.count - a.count);

/**
 * As perdas do período: quem está em Perda hoje, com a data da perda no período. Quem foi
 * reaberto não conta — deixou de ser perda. Por motivo (por que) e por etapa (onde).
 */
export function periodLosses(d: MetricsDataset, periodo: ResolvedPeriod): PeriodLosses {
  const perdas = d.milestones.flatMap((m) => (m.perda && isInRange(m.perda.date, periodo.elapsed) ? [m.perda] : []));
  const porMotivo = [...contarPor(perdas, (p) => p.reason ?? '').entries()].map(([reason, { count }]) => ({
    reason,
    label: reason ? getDiscardReasonLabel(reason) : 'Sem motivo registrado',
    count,
  }));
  const porEtapa: StageLossCount[] = [...contarPor(perdas, (p) => p.fromStage ?? '').values()].map(({ item, count }) => ({
    stage: item.fromStage,
    label: item.fromStage ? getProspectStageLabel(item.fromStage) : 'Etapa não registrada',
    count,
  }));
  return { total: perdas.length, byReason: maisFrequentes(porMotivo), byStage: maisFrequentes(porEtapa) };
}

function ganhosNo(d: MetricsDataset, range: PeriodRange): ProspectMilestones[] {
  return d.milestones.filter((m) => m.ganho && isInRange(m.ganho, range));
}

const somaDosValores = (ganhos: ProspectMilestones[]) => ganhos.reduce((total, m) => total + (m.valor ?? 0), 0);

/** Valor vendido no período. Ganho sem valor fica de fora do valor e do ticket, e é contado à parte. */
export function salesSummary(d: MetricsDataset, periodo: ResolvedPeriod): SalesSummary {
  const ganhos = ganhosNo(d, periodo.elapsed);
  const comValor = ganhos.filter((m) => m.valor !== null);
  const valor = somaDosValores(comValor);
  return {
    valor,
    valorAnterior: somaDosValores(ganhosNo(d, periodo.previous)),
    ganhos: ganhos.length,
    semValor: ganhos.length - comValor.length,
    ticketMedio: comValor.length ? valor / comValor.length : null,
  };
}

type CampoDoCorte = Exclude<keyof CutFlowRow, 'key'>;

const CAMPOS_DO_CORTE: ReadonlyArray<[CampoDoCorte, (m: ProspectMilestones) => string | null]> = [
  ['ativados', (m) => m.ativado],
  ['conversas', (m) => m.conversa],
  ['agendadas', (m) => m.agendada.date],
  ['feitas', (m) => m.feita.date],
  ['qualificadas', (m) => m.qualificada.date],
  ['ganhos', (m) => m.ganho],
  ['perdas', (m) => m.perda?.date ?? null],
];

function somarNoCorte(linha: CutFlowRow, m: ProspectMilestones, range: PeriodRange): void {
  for (const [campo, data] of CAMPOS_DO_CORTE) {
    const quando = data(m);
    if (quando && isInRange(quando, range)) linha[campo] += 1;
  }
}

const linhaVazia = (key: string): CutFlowRow => ({
  key,
  ativados: 0,
  conversas: 0,
  agendadas: 0,
  feitas: 0,
  qualificadas: 0,
  ganhos: 0,
  perdas: 0,
});

/** O fluxo do período quebrado por alavanca, anel, tier ou responsável. */
export function cutFlow(d: MetricsDataset, periodo: ResolvedPeriod, cut: ProspectCut): CutFlowRow[] {
  const linhas = new Map<string, CutFlowRow>();
  for (const m of d.milestones) {
    const chave = cutValue(m.prospect, cut);
    const linha = linhas.get(chave) ?? linhaVazia(chave);
    somarNoCorte(linha, m, periodo.elapsed);
    linhas.set(chave, linha);
  }
  return [...linhas.values()]
    .filter((l) => CAMPOS_DO_CORTE.some(([campo]) => l[campo] > 0))
    .sort((a, b) => b.ativados - a.ativados || b.conversas - a.conversas);
}

/**
 * Cobertura no período e contatos do quadro com TAREFA vencida. A data da cadência não
 * entra (28/09/2026): é sugestão do sistema, e o aviso é só do que alguém se comprometeu.
 */
export function listHealth(
  d: MetricsDataset,
  periodo: ResolvedPeriod,
  proximaTarefa: Map<string, PendingTaskLite>,
  hoje = new Date(),
): ListHealthData {
  const contatos = d.milestones.map((m) => m.prospect);
  const vencida = (task?: PendingTaskLite) => !!task && isTaskOverdue({ due_date: task.due_date, done_at: null }, hoje);
  return {
    coverage: calculateAccountCoverage(
      contatos,
      d.activities.filter((a) => isInRange(a.activity_date, periodo.elapsed)),
    ),
    overdue: contatos
      .filter((p) => PROSPECT_FUNNEL_STAGES.includes(p.stage) && vencida(proximaTarefa.get(p.id)))
      .map((prospect) => ({ prospect, task: proximaTarefa.get(prospect.id) as PendingTaskLite }))
      .sort((a, b) => a.task.due_date.localeCompare(b.task.due_date)),
  };
}
