import { differenceInCalendarDays, parseISO } from 'date-fns';
import { bantDaOportunidade, NOTA_PARA_QUALIFICAR } from '@/lib/prospecting/bant';
import { rotuloDoMotivoDoDescarte } from '@/lib/prospecting/decisoesDaBase';
import { getDiscardReasonLabel, getProspectStageLabel, PROSPECT_FUNNEL_STAGES, toISODate, type ProspectStage } from '@/types/prospect';
import type { EvidenciaBantDB } from '@/types/bant';
import type { MotivoDoDescarte } from '@/types/relacao';
import type {
  BantDaEtapa,
  DecisaoDasMetricas,
  DiscardCount,
  MetricsDataset,
  Occurrence,
  PeriodRange,
  ProspectMilestones,
  SaidasDaQualificacao,
  SaudeDoBant,
  TriagemDaBase,
} from '@/types/prospectMetrics';
import { isInRange, localDay } from './periods';

/**
 * Leituras do fluxo novo nas Métricas (US-0021, 23/11/2026): a triagem da Base de empresas,
 * as saídas da Qualificação, o "A abordar parado" e a saúde do BANT. Tudo derivado do que o
 * Pulse já guarda — a tela e o MCP só mostram.
 */

const ETAPA_A_ABORDAR: ProspectStage = 'a_abordar';
const ETAPA_PERDA: ProspectStage = 'descartado';
const SEM_RESPOSTA: ProspectStage = 'sem_resposta';
const DESCARTADA = 'descartada';
const NAO_AGORA = 'nao_agora';
const MOTIVO_NAO_AGORA = 'nao_agora';
const ROTULO_NAO_AGORA = '"Não agora" (com data para voltar)';

/** Saiu da Qualificação para A abordar ou adiante — não para a Perda. */
export const saiuParaAbordar = (m: ProspectMilestones): boolean =>
  !!m.saidaDaQualificacao && m.saidaDaQualificacao.para !== ETAPA_PERDA && m.saidaDaQualificacao.para !== SEM_RESPOSTA;

function contarMotivos(chaves: string[], rotulo: (chave: string) => string): DiscardCount[] {
  const mapa = new Map<string, number>();
  chaves.forEach((c) => mapa.set(c, (mapa.get(c) ?? 0) + 1));
  return [...mapa].map(([reason, count]) => ({ reason, label: rotulo(reason), count })).sort((a, b) => b.count - a.count);
}

// ---------- triagem da Base ----------

/** Decidida no período e não desfeita nele: descartar e desfazer no mesmo período não conta. */
const contaNoPeriodo = (d: DecisaoDasMetricas, range: PeriodRange) =>
  isInRange(localDay(d.decidida_em), range) && !(d.desfeita_em && isInRange(localDay(d.desfeita_em), range));

const retomarHoje = (d: DecisaoDasMetricas, hoje: string) => d.decisao === NAO_AGORA && !d.desfeita_em && (d.voltar_em ?? '') <= hoje;

/** Triagem da Base no período (no lugar da "Cobertura da lista"). */
export function triagemDaBase(d: MetricsDataset, range: PeriodRange, hoje = new Date()): TriagemDaBase {
  const noPeriodo = d.decisoes.filter((x) => contaNoPeriodo(x, range));
  const descartadas = noPeriodo.filter((x) => x.decisao === DESCARTADA);
  return {
    applies: d.triagemApplies,
    movidas: d.milestones.filter((m) => m.qualificacao && isInRange(m.qualificacao, range)).length,
    descartadas: descartadas.length,
    porMotivo: contarMotivos(descartadas.map((x) => x.motivo ?? ''), (m) => rotuloDoMotivoDoDescarte((m || null) as MotivoDoDescarte | null)),
    // O "Não agora" da Qualificação também é Perda: conta aqui e nas saídas da Qualificação.
    naoAgora: noPeriodo.filter((x) => x.decisao === NAO_AGORA).length,
    retomarAgora: d.decisoes.filter((x) => retomarHoje(x, toISODate(hoje))).length,
  };
}

// ---------- saídas da Qualificação ----------

/** As que saíram da Qualificação no período sem ir para A abordar: o motivo da Perda, ou "Não agora". */
export function saidasDaQualificacao(d: MetricsDataset, range: PeriodRange): SaidasDaQualificacao {
  const comNaoAgora = new Set(d.decisoes.filter((x) => x.decisao === NAO_AGORA && x.prospect_id).map((x) => x.prospect_id));
  const saidas = d.milestones.filter((m) => m.saidaDaQualificacao && isInRange(m.saidaDaQualificacao.date, range) && !saiuParaAbordar(m));
  const motivos = saidas.map((m) => (comNaoAgora.has(m.prospect.id) ? MOTIVO_NAO_AGORA : m.saidaDaQualificacao?.reason ?? ''));
  const rotulo = (motivo: string) => (motivo === MOTIVO_NAO_AGORA ? ROTULO_NAO_AGORA : motivo ? getDiscardReasonLabel(motivo) : 'Sem motivo registrado');
  return { total: saidas.length, porMotivo: contarMotivos(motivos, rotulo) };
}

// ---------- A abordar parado ----------

/** Sem 1º toque há mais disso em A abordar, a oportunidade está parada (hipótese da US-0021). */
export const DIAS_PARADA_EM_ABORDAR = 14;

/** Quando entrou em A abordar: a última entrada registrada, ou a criação da oportunidade. */
function entrouEmAbordar(d: MetricsDataset, m: ProspectMilestones): string {
  const entradas = d.changes.filter((c) => c.prospect_id === m.prospect.id && c.to_stage === ETAPA_A_ABORDAR).map((c) => c.occurred_on);
  return entradas.sort().at(-1) ?? localDay(m.prospect.created_at);
}

/** Em A abordar, sem 1º toque, há mais de 14 dias — os mais antigos primeiro. Não olha o período. */
export function abordarParadas(d: MetricsDataset, hoje = new Date()): Occurrence[] {
  const hojeIso = toISODate(hoje);
  return d.milestones
    .filter((m) => m.prospect.stage === ETAPA_A_ABORDAR && !m.ativado)
    .map((m) => ({ date: entrouEmAbordar(d, m), prospect: m.prospect }))
    .filter((o) => differenceInCalendarDays(parseISO(hojeIso), parseISO(o.date)) > DIAS_PARADA_EM_ABORDAR)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- saúde do BANT ----------

const EM_ANDAMENTO = new Set<ProspectStage>(PROSPECT_FUNNEL_STAGES);

function agruparEvidencias(evidencias: EvidenciaBantDB[]): Map<string, EvidenciaBantDB[]> {
  const mapa = new Map<string, EvidenciaBantDB[]>();
  evidencias.forEach((e) => mapa.set(e.prospect_id, [...(mapa.get(e.prospect_id) ?? []), e]));
  return mapa;
}

const ACEITA = 'aceita';
const quandoAceita = (e: EvidenciaBantDB) => localDay(e.decidida_em ?? e.created_at);

/** A última evidência aceita caiu no período: foi ela que pôs a nota onde está. */
function aceitaNoPeriodo(evidencias: EvidenciaBantDB[], range: PeriodRange): boolean {
  const ultima = evidencias.filter((e) => e.situacao === ACEITA).map(quandoAceita).sort().at(-1);
  return !!ultima && isInRange(ultima, range);
}

function mediaPorEtapa(notas: Array<{ stage: ProspectStage; nota: number; meta: number | null }>): BantDaEtapa[] {
  return PROSPECT_FUNNEL_STAGES.flatMap((stage) => {
    const daEtapa = notas.filter((n) => n.stage === stage);
    if (!daEtapa.length) return [];
    const media = Math.round(daEtapa.reduce((soma, n) => soma + n.nota, 0) / daEtapa.length);
    return [{ stage, label: getProspectStageLabel(stage), media, quantas: daEtapa.length, meta: daEtapa[0].meta }];
  });
}

/** Saúde do BANT: abaixo da meta da etapa (pendência de hoje), nota média por etapa e quem chegou a 75 no período. */
export function saudeDoBant(d: MetricsDataset, range: PeriodRange): SaudeDoBant {
  const porOportunidade = agruparEvidencias(d.evidencias);
  const abertas = d.milestones.filter((m) => EM_ANDAMENTO.has(m.prospect.stage)).map((m) => {
    const evidencias = porOportunidade.get(m.prospect.id) ?? [];
    const bant = bantDaOportunidade(m.prospect, evidencias);
    return { prospect: m.prospect, stage: m.prospect.stage, nota: bant.nota, meta: bant.meta, evidencias };
  });
  const abaixo = abertas.filter((a) => a.meta !== null && a.nota < a.meta);
  return {
    abaixoDaMeta: abaixo
      .map((a) => ({ date: localDay(a.prospect.updated_at), prospect: a.prospect, nota: a.nota, meta: a.meta as number }))
      .sort((x, y) => (x.nota - x.meta) - (y.nota - y.meta)),
    porEtapa: mediaPorEtapa(abertas),
    chegaram75: abertas.filter((a) => a.nota >= NOTA_PARA_QUALIFICAR && aceitaNoPeriodo(a.evidencias, range)).length,
  };
}
