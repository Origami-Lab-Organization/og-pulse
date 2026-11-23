/**
 * Métricas da Prospecção em texto — o MESMO cálculo da aba Métricas (29/09/2026).
 *
 * Nada de regra aqui: marcos, safra, taxas, gargalo e leituras vêm de `src/lib/prospecting/`,
 * os mesmos módulos que a tela usa. Este arquivo só escolhe o que dizer e em que ordem —
 * se a tela e o chat derem números diferentes, o defeito está em outro lugar.
 */

import { SEM_RECORTE, formatRate, formatRatio } from '@/lib/prospecting/metrics';
import {
  activityRhythm,
  bottleneckOf,
  leverConcentration,
  meetingsAwaitingQualification,
  periodReadings,
  stageRates,
} from '@/lib/prospecting/metricsReadings';
import { buildMilestones } from '@/lib/prospecting/milestones';
import {
  MIN_SAMPLE,
  buildDataset,
  cutSafra,
  cycleTimes,
  listHealth,
  metricSeries,
  metricValues,
  periodLosses,
  safraCounts,
  salesSummary,
} from '@/lib/prospecting/periodMetrics';
import { PERIOD_PRESETS, formatDay, formatRangeCompact, resolvePeriod, trendBuckets } from '@/lib/prospecting/periods';
import { NOTA_PARA_QUALIFICAR } from '@/lib/prospecting/bant';
import { DIAS_PARADA_EM_ABORDAR, saidasDaQualificacao } from '@/lib/prospecting/qualificacaoMetrics';
import { getLeverLabel, getTipoDeContaLabel, nextTaskByProspect } from '@/types/prospect';
import type {
  CutSafraRow,
  CycleTime,
  ListHealthData,
  MetricValue,
  MetricsDataset,
  Occurrence,
  PeriodLosses,
  PeriodSelection,
  Reading,
  ResolvedPeriod,
  SafraCounts,
  SaidasDaQualificacao,
  SaudeDoBant,
  TriagemDaBase,
  SafraRateKey,
  SalesSummary,
  StageRate,
} from '@/types/prospectMetrics';
import type { DadosDasMetricas } from './data.js';
import { reais } from './format.js';
import type { CorteDeCanal, PedidoDeMetricas } from './types.js';

/** Desde quando ler atividades: as 12 semanas da leitura de ritmo e o período anterior. */
export function inicioDaLeitura(selecao: PeriodSelection): string {
  const periodo = resolvePeriod(selecao);
  return [trendBuckets(periodo, 'semana')[0].from, periodo.previous.from].sort()[0];
}

interface Leitura {
  periodo: ResolvedPeriod;
  dataset: MetricsDataset;
  valores: MetricValue[];
  safra: SafraCounts;
  taxas: StageRate[];
  gargalo: SafraRateKey | null;
  leituras: Reading[];
  vendas: SalesSummary;
  saude: ListHealthData;
  aguardando: Occurrence[];
  ciclos: CycleTime[];
  perdas: PeriodLosses;
  saidas: SaidasDaQualificacao;
  comBase: boolean;
}

function ler(dados: DadosDasMetricas, pedido: PedidoDeMetricas): Leitura {
  const periodo = resolvePeriod(pedido.selecao);
  const marcos = buildMilestones(dados.prospects, dados.responses, dados.changes);
  const dataset = buildDataset(dados, marcos, pedido.filtro);
  const valores = metricValues(dataset, periodo);
  const safra = safraCounts(dataset, periodo);
  const taxas = stageRates(safra);
  const gargalo = bottleneckOf(taxas);
  const semanal = metricSeries(dataset, trendBuckets(periodo, 'semana'), 'semana');
  const concentracao = leverConcentration(cutSafra(dataset, periodo, 'lever'));
  return {
    periodo,
    dataset,
    valores,
    safra,
    taxas,
    gargalo,
    leituras: periodReadings({ rates: taxas, bottleneck: gargalo, concentration: concentracao, rhythm: activityRhythm(semanal) }),
    vendas: salesSummary(dataset, periodo),
    saude: listHealth(dataset, periodo, nextTaskByProspect(dados.tarefasPendentes)),
    aguardando: meetingsAwaitingQualification(dataset),
    ciclos: cycleTimes(dataset, periodo),
    perdas: periodLosses(dataset, periodo),
    saidas: saidasDaQualificacao(dataset, periodo.elapsed),
    comBase: valores.some((v) => !!v.previous),
  };
}

/** O relatório inteiro, na ordem da aba: números, jornada, leituras, ação, triagem, Qualificação, BANT, ciclo, perdas e canais. */
export function relatorioDeMetricas(dados: DadosDasMetricas, pedido: PedidoDeMetricas): string {
  const l = ler(dados, pedido);
  const partes = [
    ...cabecalho(l, pedido),
    '',
    ...numerosDoPeriodo(l),
    '',
    ...jornada(l),
    '',
    ...secaoDeLeituras(l.leituras),
    '',
    ...precisaDeAcao(l),
    '',
    ...secaoDeTriagem(l.saude.triagem),
    '',
    ...secaoDeSaidas(l.saidas),
    '',
    ...secaoDoBant(l.saude.bant),
    '',
    ...tempoDeCiclo(l.ciclos),
    '',
    ...secaoDePerdas(l.perdas),
  ];
  if (pedido.corte) partes.push('', ...tabelaDoCorte(cutSafra(l.dataset, l.periodo, pedido.corte), pedido));
  return partes.join('\n');
}

function cabecalho(l: Leitura, pedido: PedidoDeMetricas): string[] {
  const { periodo } = l;
  const { ownerId, lever, tipoConta } = pedido.filtro;
  const filtros = [
    ownerId ? `responsável ${pedido.pessoas.get(ownerId) ?? ownerId}` : null,
    lever ? `alavanca ${getLeverLabel(lever)}` : null,
    tipoConta ? `tipo de conta ${getTipoDeContaLabel(tipoConta) ?? 'sem tipo'}` : null,
  ].filter(Boolean);
  const anterior = formatRangeCompact(periodo.previous);
  const comparacao = l.comBase
    ? `Comparando com ${anterior} (${periodo.comparisonLabel.replace(/^vs /, '')}).`
    : `Período anterior (${anterior}) sem registros — variações ocultas até haver base de comparação.`;
  return [
    `**Prospecção — ${formatRangeCompact(periodo.elapsed)}** (${PERIOD_PRESETS[pedido.selecao.preset].label})`,
    ...(filtros.length ? [`Filtro: ${filtros.join(' · ')}`] : []),
    comparacao,
  ];
}

/** Sem base no período anterior, ou métrica que não se aplica: não há o que comparar. */
const semComparacao = (v: MetricValue, comBase: boolean) => !comBase || v.current === null || v.previous === null;

function variacao(v: MetricValue, comBase: boolean, historyStart: string | null): string {
  if (v.partial && historyStart) return ` (com data desde ${formatDay(historyStart).slice(0, 5)} — sem comparação)`;
  if (semComparacao(v, comBase)) return '';
  const delta = v.current - v.previous;
  const percentual = v.previous ? `, ${Math.round((delta / v.previous) * 100)}%` : '';
  return ` (${delta > 0 ? '+' : ''}${delta}${percentual})`;
}

function numerosDoPeriodo(l: Leitura): string[] {
  const linhas = l.valores.map((v) => {
    const numero = v.current === null ? 'não se aplica à alavanca' : `**${v.current}**`;
    return `- ${v.definition.label}: ${numero}${variacao(v, l.comBase, l.dataset.historyStart)}`;
  });
  const { valor, ganhos, semValor, ticketMedio } = l.vendas;
  const pendencia = semValor ? ` · ${semValor} ganho(s) sem valor` : '';
  const ticket = ticketMedio === null ? '—' : reais(ticketMedio);
  return ['**Números do período**', ...linhas, `- Valor ganho: **${reais(valor)}** · ${ganhos} ganho(s) · ticket médio ${ticket}${pendencia}`];
}

const PASSOS: ReadonlyArray<{ label: string; count: (s: SafraCounts) => number; rate: SafraRateKey }> = [
  { label: 'Responderam', count: (s) => s.conversas, rate: 'resposta' },
  { label: 'Agendaram reunião', count: (s) => s.agendadas, rate: 'agendamento' },
  { label: 'Fizeram reunião', count: (s) => s.feitas, rate: 'comparecimento' },
  { label: 'Qualificados', count: (s) => s.qualificadas, rate: 'qualificacao' },
  { label: 'Ganhos', count: (s) => s.ganhos, rate: 'fechamento' },
];

function taxaPorExtenso(r: StageRate | undefined, gargalo: boolean): string {
  if (!r || r.base === 0) return 'sem base';
  const marca = [r.small ? 'amostra pequena' : null, gargalo ? '**▼ gargalo**' : null].filter(Boolean).join(' · ');
  return `${r.label.toLowerCase()} ${formatRate(r.rate)} (${r.parte} de ${r.base})${marca ? ` · ${marca}` : ''}`;
}

/** A Qualificação (US-0021): as movidas no período e quantas já saíram para A abordar. */
function jornadaDaQualificacao(l: Leitura): string[] {
  const { safra } = l;
  if (!safra.movidas) return ['**Qualificação no período**', 'Nenhuma empresa movida para qualificação no período (a etapa existe desde 19/11/2026).'];
  const r = l.taxas.find((t) => t.key === 'abordar');
  return [
    `**Qualificação no período** — ${safra.movidas} empresa(s) movida(s) para qualificação.`,
    `- Saíram para A abordar: **${safra.paraAbordar}** — ${taxaPorExtenso(r, l.gargalo === 'abordar')}`,
  ];
}

function jornada(l: Leitura): string[] {
  const { safra } = l;
  const qualificacao = [...jornadaDaQualificacao(l), ''];
  if (!safra.ativados) return [...qualificacao, '**Jornada dos ativados no período**', 'Nenhum contato recebeu o 1º toque no período.'];
  return [
    ...qualificacao,
    `**Jornada dos ativados no período** — ${safra.ativados} contato(s) com 1º toque, em ${safra.contas} conta(s) (${formatRatio(safra.ativados, safra.contas)} por conta). Até onde chegaram até hoje; taxa sobre a etapa anterior, amostra pequena abaixo de ${MIN_SAMPLE}.`,
    ...PASSOS.map((p) => {
      const r = l.taxas.find((t) => t.key === p.rate);
      return `- ${p.label}: **${p.count(safra)}** — ${taxaPorExtenso(r, p.rate === l.gargalo)}`;
    }),
  ];
}

function secaoDeLeituras(leituras: Reading[]): string[] {
  if (leituras.length === 0) return ['**Leituras do período**', 'Nada fora do esperado — ou ainda não há base para afirmar.'];
  return ['**Leituras do período**', ...leituras.map((r) => `- [${r.tag}] **${r.lead}** ${r.text}`)];
}

function precisaDeAcao(l: Leitura): string[] {
  const { overdue, paradas, bant } = l.saude;
  const itens = [
    overdue.length ? `- ${overdue.length} contato(s) com tarefa vencida — veja com list_prospect_tasks` : null,
    l.aguardando.length
      ? `- ${l.aguardando.length} reunião(ões) feita(s) sem qualificação registrada — ${nomesDe(l.aguardando)}`
      : null,
    paradas.length
      ? `- ${paradas.length} oportunidade(s) em A abordar sem 1º toque há mais de ${DIAS_PARADA_EM_ABORDAR} dias — ${nomesDe(paradas)}`
      : null,
    bant.abaixoDaMeta.length
      ? `- ${bant.abaixoDaMeta.length} oportunidade(s) com BANT abaixo da meta da etapa — ${nomesDe(bant.abaixoDaMeta)}`
      : null,
  ].filter((i): i is string => i !== null);
  return ['**Precisa de ação**', ...(itens.length ? itens : ['Nada pendente agora.'])];
}

const nomesDe = (ocorrencias: Occurrence[]) =>
  ocorrencias
    .slice(0, 8)
    .map((o) => o.prospect?.contact_name)
    .filter(Boolean)
    .join(', ') + (ocorrencias.length > 8 ? '…' : '');

/** Triagem da Base no período (US-0021): movidas, descartadas (por motivo), "Não agora" e o que espera retomar. */
function secaoDeTriagem(t: TriagemDaBase): string[] {
  if (!t.applies) return ['**Triagem da Base:** não se aplica ao filtro de alavanca ou de tipo de conta.'];
  const motivos = t.porMotivo.length ? ` (${t.porMotivo.map((m) => `${m.label}: ${m.count}`).join(', ')})` : '';
  return [
    '**Triagem da Base no período**',
    `- Movidas para qualificação: **${t.movidas}** · descartadas: **${t.descartadas}**${motivos} · "Não agora": **${t.naoAgora}**`,
    `- Esperando retomar agora (data do "Não agora" vencida): **${t.retomarAgora}**`,
  ];
}

function secaoDeSaidas(s: SaidasDaQualificacao): string[] {
  if (s.total === 0) return ['**Saídas da Qualificação sem ir para A abordar:** nenhuma no período (as devolvidas para a lista não deixam registro).'];
  return [`**Saídas da Qualificação sem ir para A abordar: ${s.total}**`, `- Por motivo: ${s.porMotivo.map((m) => `${m.label} (${m.count})`).join(', ')}`];
}

function secaoDoBant(b: SaudeDoBant): string[] {
  const etapas = b.porEtapa.map((e) => `${e.label} ${e.media}${e.meta === null ? '' : ` (meta ${e.meta})`} · ${e.quantas}`).join('; ');
  return [
    '**Saúde do BANT** (oportunidades em andamento)',
    `- Nota média por etapa: ${etapas || 'nenhuma em andamento'}`,
    `- Abaixo da meta da etapa: **${b.abaixoDaMeta.length}** · chegaram a ${NOTA_PARA_QUALIFICAR} no período: **${b.chegaram75}**`,
  ];
}

const UNIDADE_NO_SINGULAR: Record<CycleTime['unit'], string> = { dias: 'dia', toques: 'toque' };

function valorDoCiclo(c: CycleTime): string {
  if (c.sample === 0) return 'sem casos';
  if (c.median === null) return `— (amostra pequena: ${c.sample} de ${MIN_SAMPLE})`;
  const unidade = c.median === 1 ? UNIDADE_NO_SINGULAR[c.unit] : c.unit;
  return `**${c.median.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${unidade}** (${c.sample} contato(s))`;
}

function tempoDeCiclo(ciclos: CycleTime[]): string[] {
  return ['**Tempo de ciclo** (mediana de quem passou pela etapa no período)', ...ciclos.map((c) => `- ${c.label}: ${valorDoCiclo(c)}`)];
}

function secaoDePerdas(perdas: PeriodLosses): string[] {
  if (perdas.total === 0) return ['**Perdas no período:** nenhuma.'];
  const motivos = perdas.byReason.map((r) => `${r.label} (${r.count})`).join(', ');
  const etapas = perdas.byStage.map((e) => `${e.label} (${e.count})`).join(', ');
  return [`**Perdas no período: ${perdas.total}**`, `- Por motivo: ${motivos}`, `- Onde perdemos: ${etapas}`];
}

const TITULO_DO_CORTE: Record<CorteDeCanal, { coluna: string; semValor: string }> = {
  lever: { coluna: 'Alavanca', semValor: 'Sem alavanca' },
  owner: { coluna: 'Responsável', semValor: 'Sem responsável' },
  tipo_conta: { coluna: 'Tipo de conta', semValor: 'Sem tipo' },
};

function nomeNoCorte(chave: string, pedido: PedidoDeMetricas): string {
  const corte = pedido.corte as CorteDeCanal;
  if (chave === SEM_RECORTE) return TITULO_DO_CORTE[corte].semValor;
  const nomes: Record<CorteDeCanal, () => string> = {
    lever: () => getLeverLabel(chave) ?? chave,
    owner: () => pedido.pessoas.get(chave) ?? chave,
    tipo_conta: () => getTipoDeContaLabel(chave) ?? chave,
  };
  return nomes[corte]();
}

/** Canais: os ativados do período por grupo e até onde chegaram — safra, como na aba. */
function tabelaDoCorte(linhas: CutSafraRow[], pedido: PedidoDeMetricas): string[] {
  const { coluna } = TITULO_DO_CORTE[pedido.corte as CorteDeCanal];
  if (linhas.length === 0) return [`Nenhum contato ativado no período para quebrar por ${coluna.toLowerCase()}.`];
  return [
    `**Por ${coluna.toLowerCase()}** — marcos dos ativados do período; resposta com menos de ${MIN_SAMPLE} ativados é amostra pequena.`,
    `| ${coluna} | Ativados | Resposta | Conversas | Agendadas | Feitas | Qualif. | Ganhos | Perdas |`,
    '|---|---|---|---|---|---|---|---|---|',
    ...linhas.map(
      (l) =>
        `| ${nomeNoCorte(l.key, pedido)} | ${l.ativados} | ${formatRate(l.conversas / l.ativados)}${l.ativados < MIN_SAMPLE ? '*' : ''} | ${l.conversas} | ${l.agendadas} | ${l.feitas} | ${l.qualificadas} | ${l.ganhos} | ${l.perdas} |`,
    ),
  ];
}
