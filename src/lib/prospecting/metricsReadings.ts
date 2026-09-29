import { getLeverLabel, type ProspectStage } from '@/types/prospect';
import type {
  ActivityRhythm,
  CutSafraRow,
  LeverConcentration,
  MetricsDataset,
  Occurrence,
  Reading,
  SafraCounts,
  SafraRateKey,
  SeriesPoint,
  StageRate,
} from '@/types/prospectMetrics';
import { SEM_RECORTE, formatRate } from './metrics';
import { MIN_SAMPLE } from './periodMetrics';
import { localDay } from './periods';

/**
 * Leituras da aba Métricas (29/09/2026): as taxas entre etapas, o gargalo e as frases que
 * apontam o número que merece atenção. Tudo derivado — a tela só exibe.
 *
 * As leituras só aparecem com base: uma frase afirmativa sobre três contatos seria ruído
 * com cara de conclusão.
 */

interface Passagem {
  key: SafraRateKey;
  label: string;
  formula: string;
  parte: (s: SafraCounts) => number;
  base: (s: SafraCounts) => number;
}

const PASSAGENS: readonly Passagem[] = [
  { key: 'resposta', label: 'Resposta', formula: 'conversas ÷ ativados', parte: (s) => s.conversas, base: (s) => s.ativados },
  { key: 'agendamento', label: 'Agendamento', formula: 'agendadas ÷ conversas', parte: (s) => s.agendadas, base: (s) => s.conversas },
  { key: 'comparecimento', label: 'Comparecimento', formula: 'feitas ÷ agendadas', parte: (s) => s.feitas, base: (s) => s.agendadas },
  { key: 'qualificacao', label: 'Qualificação', formula: 'qualificadas ÷ feitas', parte: (s) => s.qualificadas, base: (s) => s.feitas },
  { key: 'fechamento', label: 'Fechamento', formula: 'ganhos ÷ qualificadas', parte: (s) => s.ganhos, base: (s) => s.qualificadas },
];

/**
 * As cinco passagens da safra. Diferente do quadro por safra mensal, a taxa aparece mesmo
 * com base pequena — marcada, para a pessoa ver o número e saber quanto confiar nele.
 */
export function stageRates(s: SafraCounts): StageRate[] {
  return PASSAGENS.map((p) => {
    const parte = p.parte(s);
    const base = p.base(s);
    return {
      key: p.key,
      label: p.label,
      formula: p.formula,
      parte,
      base,
      rate: base > 0 ? parte / base : null,
      small: base < MIN_SAMPLE,
    };
  });
}

/** Acima disso a passagem deixa passar a maioria: não é gargalo, por menor que seja entre as outras. */
const TETO_DO_GARGALO = 0.5;

/**
 * O gargalo: a passagem de menor taxa entre as que têm base suficiente — a maior queda
 * entre as etapas. Empate fica com a primeira, que é por onde o contato passa antes.
 */
export function bottleneckOf(rates: StageRate[]): SafraRateKey | null {
  const candidatas = rates.filter(podeSerGargalo);
  if (candidatas.length === 0) return null;
  return candidatas.reduce((pior, r) => ((r.rate as number) < (pior.rate as number) ? r : pior)).key;
}

const podeSerGargalo = (r: StageRate) => !r.small && r.rate !== null && r.rate < TETO_DO_GARGALO;

/** Com mais da metade dos ativados, a alavanca define o resultado do período. */
const CONCENTRACAO = 0.5;
/** Diferença de resposta que muda a decisão de onde pôr esforço: 20 pontos percentuais. */
const DIFERENCA_RELEVANTE = 0.2;
/** Abaixo disso, as demais somadas são poucas para a diferença ser mais que um indício. */
const BASE_ROBUSTA = 4 * MIN_SAMPLE;

const somar = (linhas: CutSafraRow[], campo: keyof Omit<CutSafraRow, 'key'>) =>
  linhas.reduce((total, l) => total + l[campo], 0);

/**
 * Uma alavanca concentra os ativados e responde bem menos que as demais somadas. Recebe as
 * linhas do recorte por alavanca, da maior para a menor.
 */
export function leverConcentration(linhas: CutSafraRow[]): LeverConcentration | null {
  const [maior, ...demais] = linhas;
  if (!concentra(maior, somar(linhas, 'ativados'))) return null;

  const outros = {
    ativados: somar(demais, 'ativados'),
    conversas: somar(demais, 'conversas'),
    feitas: somar(demais, 'feitas'),
  };
  if (outros.ativados < MIN_SAMPLE) return null;

  const rate = maior.conversas / maior.ativados;
  const rateDemais = outros.conversas / outros.ativados;
  if (rateDemais - rate < DIFERENCA_RELEVANTE) return null;

  return {
    key: maior.key,
    label: getLeverLabel(maior.key) ?? maior.key,
    share: maior.ativados / somar(linhas, 'ativados'),
    rate,
    demais: { ...outros, rate: rateDemais },
    smallSample: outros.ativados < BASE_ROBUSTA,
  };
}

/** A maior alavanca tem nome, base própria e mais da metade dos ativados. */
function concentra(maior: CutSafraRow | undefined, total: number): maior is CutSafraRow {
  return !!maior && maior.key !== SEM_RECORTE && maior.ativados >= MIN_SAMPLE && maior.ativados / total >= CONCENTRACAO;
}

/** Variação de semana para semana que já é mudança de ritmo, e não oscilação. */
const VARIACAO_RELEVANTE = 0.25;

/** Atividades das duas últimas semanas completas. Recebe a série SEMANAL. */
export function activityRhythm(series: SeriesPoint[]): ActivityRhythm | null {
  const comparacao = duasUltimasCompletas(series);
  if (!comparacao) return null;
  const { atual, antes, depois } = comparacao;
  const change = (depois - antes) / antes;
  if (Math.abs(change) < VARIACAO_RELEVANTE) return null;
  return { weekLabel: atual.bucket.label, previous: antes, current: depois, change, inProgressLabel: rotuloEmAndamento(series) };
}

/** As duas últimas semanas completas, se a primeira tem base para comparar. */
function duasUltimasCompletas(series: SeriesPoint[]) {
  const [anterior, atual] = series.filter((p) => !p.bucket.inProgress).slice(-2);
  const antes = anterior?.values.atividades;
  const depois = atual?.values.atividades;
  if (antes == null || depois == null || antes < MIN_SAMPLE) return null;
  return { atual, antes, depois };
}

const rotuloEmAndamento = (series: SeriesPoint[]) => series.find((p) => p.bucket.inProgress)?.bucket.label ?? null;

const verbo = (n: number, um: string, varios: string) => (n === 1 ? um : varios);

const CONSELHO: Record<SafraRateKey, string> = {
  resposta: 'Revise a lista e a mensagem de abertura antes de aumentar o volume.',
  agendamento: 'Revise o convite para a reunião e o momento em que ele é feito na conversa.',
  comparecimento: 'Confirme a reunião na véspera e reagende logo quem faltou.',
  qualificacao: 'Revise o critério de qualificação e o próximo passo combinado ao fim da reunião.',
  fechamento: 'Revise proposta, preço e o acompanhamento depois da reunião de qualificação.',
};

const FRASE_DO_GARGALO: Record<SafraRateKey, (r: StageRate) => string> = {
  resposta: (r) => `Só ${formatRate(r.rate)} dos ativados responderam.`,
  agendamento: ({ parte, base }) => `Das ${base} conversas, ${parte} ${verbo(parte, 'virou', 'viraram')} reunião agendada.`,
  comparecimento: ({ parte, base }) => `${base - parte} de ${base} reuniões agendadas não aconteceram.`,
  qualificacao: ({ parte, base }) =>
    parte === 0
      ? `${base} reuniões feitas, nenhuma virou oportunidade qualificada.`
      : `Das ${base} reuniões feitas, só ${parte} ${verbo(parte, 'virou', 'viraram')} oportunidade qualificada.`,
  fechamento: ({ parte, base }) =>
    parte === 0
      ? `${base} oportunidades qualificadas, nenhuma virou venda.`
      : `Das ${base} oportunidades qualificadas, ${parte} ${verbo(parte, 'virou', 'viraram')} venda.`,
};

function leituraDoGargalo(r: StageRate): Reading {
  return {
    kind: 'gargalo',
    tag: 'Gargalo',
    alert: true,
    lead: FRASE_DO_GARGALO[r.key](r),
    text: `É a maior queda entre as etapas. ${CONSELHO[r.key]}`,
    link: { label: 'Ver conversão', tab: 'conv' },
  };
}

function leituraDoCanal(c: LeverConcentration): Reading {
  const ressalva = c.smallSample ? ' — amostra pequena, mas a diferença é grande' : '';
  return {
    kind: 'canal',
    tag: 'Canal',
    alert: true,
    lead: `${c.label} trouxe ${formatRate(c.share)} dos ativados, mas só ${formatRate(c.rate)} responderam.`,
    text: `Nas demais alavancas, ${c.demais.conversas} de ${c.demais.ativados} responderam (${formatRate(c.demais.rate)})${ressalva}.`,
    link: { label: 'Ver canais', tab: 'canais' },
  };
}

function leituraDoRitmo(r: ActivityRhythm): Reading {
  const andamento = r.inProgressLabel ? ` A semana de ${r.inProgressLabel} ainda está em andamento.` : '';
  return {
    kind: 'ritmo',
    tag: 'Ritmo',
    alert: false,
    lead: `Atividades ${r.change < 0 ? 'caíram' : 'subiram'} ${formatRate(Math.abs(r.change))} na semana de ${r.weekLabel}.`,
    text: `De ${r.previous} para ${r.current} registradas.${andamento}`,
    link: { label: 'Ver esforço', tab: 'esforco' },
  };
}

interface ReadingsInput {
  rates: StageRate[];
  bottleneck: SafraRateKey | null;
  concentration: LeverConcentration | null;
  rhythm: ActivityRhythm | null;
}

/** As leituras do período, na ordem em que pedem ação: gargalo, canal, ritmo. */
export function periodReadings(input: ReadingsInput): Reading[] {
  const gargalo = input.rates.find((r) => r.key === input.bottleneck);
  return [
    gargalo ? leituraDoGargalo(gargalo) : null,
    input.concentration ? leituraDoCanal(input.concentration) : null,
    input.rhythm ? leituraDoRitmo(input.rhythm) : null,
  ].filter((r): r is Reading => r !== null);
}

const ETAPA_REUNIAO_FEITA: ProspectStage = 'reuniao_feita';

/**
 * Quem está parado em Reunião feita: a reunião aconteceu e ninguém registrou se virou
 * oportunidade. Não olha o período — é pendência de hoje.
 */
export function meetingsAwaitingQualification(d: MetricsDataset): Occurrence[] {
  return d.milestones
    .filter((m) => m.prospect.stage === ETAPA_REUNIAO_FEITA)
    .map((m) => ({ date: m.feita.date ?? localDay(m.prospect.updated_at), prospect: m.prospect }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
