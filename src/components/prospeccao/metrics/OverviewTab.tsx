import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHideValues } from '@/contexts/HideValuesContext';
import { formatCurrency } from '@/lib/formatters';
import { formatRate, formatRatio } from '@/lib/prospecting/metrics';
import { DIAS_PARADA_EM_ABORDAR } from '@/lib/prospecting/qualificacaoMetrics';
import { cn } from '@/lib/utils';
import type {
  ListHealthData,
  MetricDefinition,
  MetricKey,
  MetricsDrill,
  MetricsTab,
  MetricValue,
  Occurrence,
  Reading,
  SafraCounts,
  SafraRateKey,
  SalesSummary,
  SeriesPoint,
  StageRate,
} from '@/types/prospectMetrics';
import { corDaTaxa, plural } from './format';
import { GargaloBadge, Painel } from './parts';

/** O indicador do topo que carrega o selo quando a passagem é o gargalo (a da Qualificação não tem cartão). */
const GARGALO_NO_INDICADOR: Partial<Record<SafraRateKey, MetricKey>> = {
  resposta: 'conversas',
  agendamento: 'feitas',
  comparecimento: 'feitas',
  qualificacao: 'qualificadas',
  fechamento: 'ganhos',
};

/** O cartão de dinheiro conta os ganhos: é a lista deles que abre, e é deles o minigráfico. */
const CHAVE_DO_VALOR: MetricKey = 'ganhos';

interface OverviewTabProps {
  values: MetricValue[];
  /** Série semanal — alimenta os minigráficos, qualquer que seja o agrupamento da evolução. */
  weekly: SeriesPoint[];
  safra: SafraCounts;
  rates: StageRate[];
  bottleneck: SafraRateKey | null;
  sales: SalesSummary;
  readings: Reading[];
  health: ListHealthData;
  awaiting: Occurrence[];
  /** O período anterior tem registro: as variações têm base. */
  showDelta: boolean;
  onGoTab: (tab: MetricsTab) => void;
  onOpenMetric: (definition: MetricDefinition) => void;
  onOpenList: (drill: MetricsDrill) => void;
}

/** A primeira leitura: quanto foi feito, até onde os ativados chegaram, o que chama atenção e o que pede ação. */
export function OverviewTab(props: OverviewTabProps) {
  return (
    <div className="flex flex-col gap-5">
      <Indicadores {...props} />
      <Jornada safra={props.safra} rates={props.rates} bottleneck={props.bottleneck} />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Leituras readings={props.readings} onGoTab={props.onGoTab} />
        <PrecisaDeAcao health={props.health} awaiting={props.awaiting} onOpenList={props.onOpenList} />
      </div>
    </div>
  );
}

interface Indicador {
  key: MetricKey;
  label: string;
  sub: string;
}

function indicadoresDe(p: OverviewTabProps): Indicador[] {
  const atual = (k: MetricKey) => valorDe(p.values, k).current ?? 0;
  const taxa = (k: SafraRateKey) => formatRate(p.rates.find((r) => r.key === k)?.rate ?? null);
  return [
    {
      key: 'ativados',
      label: 'Contatos ativados',
      sub: `em ${plural(p.safra.contas, 'conta', 'contas')} · ${plural(atual('atividades'), 'atividade', 'atividades')}`,
    },
    { key: 'conversas', label: 'Conversas iniciadas', sub: `${taxa('resposta')} dos ativados responderam` },
    {
      key: 'feitas',
      label: 'Reuniões feitas',
      sub: `${plural(atual('agendadas'), 'agendada', 'agendadas')} · ${taxa('comparecimento')} de comparecimento`,
    },
    { key: 'qualificadas', label: 'Oportunidades qualificadas', sub: `${taxa('qualificacao')} das reuniões feitas` },
  ];
}

const valorDe = (values: MetricValue[], key: MetricKey) =>
  values.find((v) => v.definition.key === key) as MetricValue;

function Indicadores(props: OverviewTabProps) {
  const { values, weekly, bottleneck, showDelta, onOpenMetric } = props;
  const gargalo = bottleneck ? GARGALO_NO_INDICADOR[bottleneck] ?? null : null;
  return (
    <div className="flex flex-wrap gap-3">
      {indicadoresDe(props).map((i) => {
        const valor = valorDe(values, i.key);
        const numero = String(valor.current ?? 0);
        return (
          <CartaoIndicador
            key={i.key}
            label={i.label}
            value={numero}
            sub={i.sub}
            flag={gargalo === i.key}
            spark={sparkDe(weekly, i.key)}
            delta={showDelta ? <Variacao value={valor} /> : null}
            onOpen={() => onOpenMetric(valor.definition)}
          />
        );
      })}
      <CartaoValorGanho {...props} flag={gargalo === CHAVE_DO_VALOR} />
    </div>
  );
}

/**
 * O dinheiro do período. Ganho sem valor fica FORA do valor e do ticket — somá-lo como zero
 * puxaria o ticket para baixo em silêncio —, e a pendência aparece por extenso.
 */
function CartaoValorGanho(props: OverviewTabProps & { flag: boolean }) {
  useHideValues();
  const { sales, values, weekly, showDelta, flag, onOpenMetric } = props;
  return (
    <CartaoIndicador
      label="Valor ganho"
      value={formatCurrency(sales.valor)}
      sub={subDoValor(sales, valorDe(values, 'perdas').current ?? 0)}
      flag={flag}
      spark={sparkDe(weekly, CHAVE_DO_VALOR)}
      delta={showDelta ? <VariacaoEmReais sales={sales} /> : null}
      onOpen={() => onOpenMetric(valorDe(values, CHAVE_DO_VALOR).definition)}
    />
  );
}

function subDoValor(sales: SalesSummary, perdas: number): string {
  const ticket = sales.ticketMedio === null ? '—' : formatCurrency(sales.ticketMedio);
  const pendencia = sales.semValor > 0 ? ` · ${sales.semValor} sem valor` : '';
  return `${plural(sales.ganhos, 'ganho', 'ganhos')} · ${plural(perdas, 'perda', 'perdas')} · ticket ${ticket}${pendencia}`;
}

function VariacaoEmReais({ sales }: { sales: SalesSummary }) {
  if (sales.valorAnterior === null) return null;
  const delta = sales.valor - sales.valorAnterior;
  return <Sinal delta={delta} texto={`${delta > 0 ? '+' : ''}${formatCurrency(delta)}`} />;
}

interface PontoDoSpark {
  key: string;
  value: number | null;
  selected: boolean;
  inProgress: boolean;
}

const sparkDe = (weekly: SeriesPoint[], key: MetricKey): PontoDoSpark[] =>
  weekly.map((p) => ({
    key: p.bucket.key,
    value: p.values[key] ?? null,
    selected: p.bucket.selected,
    inProgress: p.bucket.inProgress,
  }));

interface CartaoIndicadorProps {
  label: string;
  value: string;
  sub: string;
  flag: boolean;
  spark: PontoDoSpark[];
  delta: ReactNode;
  onOpen: () => void;
}

function CartaoIndicador(props: CartaoIndicadorProps) {
  const { label, value, sub, flag, spark, delta, onOpen } = props;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${label}: ${value}. ${sub}. Ver a lista.`}
      className={cn(
        'flex min-w-0 flex-[1_1_170px] flex-col gap-2.5 rounded-xl border bg-card p-4 text-left transition-colors',
        'hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        flag && 'border-warning/40',
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        {flag && <GargaloBadge />}
      </span>
      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="truncate font-mono text-[1.75rem] font-medium leading-none tracking-tight tabular-nums">{value}</span>
        {delta}
      </span>
      <Spark points={spark} />
      <span className="text-xs text-muted-foreground text-pretty">{sub}</span>
    </button>
  );
}

/** Coluna do período no destaque, a semana em andamento mais clara, as anteriores de contexto. */
function corDoSpark(p: PontoDoSpark): string {
  if (!p.value) return 'bg-border';
  if (!p.selected) return 'bg-muted-foreground/25';
  return p.inProgress ? 'bg-primary/40' : 'bg-primary';
}

function Spark({ points }: { points: PontoDoSpark[] }) {
  const maior = Math.max(1, ...points.map((p) => p.value ?? 0));
  return (
    <span className="flex h-[22px] items-end gap-0.5" aria-hidden="true">
      {points.map((p) => (
        <span
          key={p.key}
          className={cn('flex-1 rounded-[1px]', corDoSpark(p))}
          style={{ height: p.value ? `${Math.max((p.value / maior) * 100, 10)}%` : '2px' }}
        />
      ))}
    </span>
  );
}

function Variacao({ value }: { value: MetricValue }) {
  if (value.current === null || value.previous === null || value.partial) return null;
  const delta = value.current - value.previous;
  const percentual = value.previous ? ` (${Math.round((delta / value.previous) * 100)}%)` : '';
  return <Sinal delta={delta} texto={`${delta > 0 ? '+' : ''}${delta}${percentual}`} />;
}

const SINAIS = {
  subiu: { Icone: ArrowUp, classe: 'text-success', rotulo: 'subiu' },
  caiu: { Icone: ArrowDown, classe: 'text-destructive', rotulo: 'caiu' },
  igual: { Icone: Minus, classe: 'text-muted-foreground', rotulo: 'igual' },
} as const;

const sinalDe = (delta: number) => (delta > 0 ? SINAIS.subiu : delta < 0 ? SINAIS.caiu : SINAIS.igual);

/** Em prospecção, mais é melhor em todos os números: o sinal da variação pode ganhar cor. */
function Sinal({ delta, texto }: { delta: number; texto: string }) {
  const sinal = sinalDe(delta);
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-mono text-xs tabular-nums', sinal.classe)}>
      <sinal.Icone className="h-3 w-3" aria-hidden="true" />
      <span className="sr-only">{sinal.rotulo}</span>
      {texto}
    </span>
  );
}

interface PassoDaJornada {
  label: string;
  count: (s: SafraCounts) => number;
  rate: SafraRateKey | null;
}

interface GrupoDaJornada {
  titulo: string;
  /** O topo do grupo: a barra de cada passo compara com ele. */
  base: (s: SafraCounts) => number;
  vazio: string;
  passos: readonly PassoDaJornada[];
}

/**
 * Duas safras, uma em cima da outra (US-0021): as empresas movidas para qualificação no
 * período e quantas já saíram para A abordar; e os contatos ativados no período e até onde
 * chegaram. Cada barra compara com o topo do próprio grupo.
 */
const GRUPOS: readonly GrupoDaJornada[] = [
  {
    titulo: 'Qualificação · empresas movidas no período',
    base: (s) => s.movidas,
    vazio: 'Nenhuma empresa movida para qualificação no período.',
    passos: [
      { label: 'Movidas para qualificação', count: (s) => s.movidas, rate: null },
      { label: 'Saíram para A abordar', count: (s) => s.paraAbordar, rate: 'abordar' },
    ],
  },
  {
    titulo: 'Abordagem · contatos ativados no período',
    base: (s) => s.ativados,
    vazio: 'Nenhum contato recebeu o 1º toque no período.',
    passos: [
      { label: 'Ativados', count: (s) => s.ativados, rate: null },
      { label: 'Responderam', count: (s) => s.conversas, rate: 'resposta' },
      { label: 'Agendaram reunião', count: (s) => s.agendadas, rate: 'agendamento' },
      { label: 'Fizeram reunião', count: (s) => s.feitas, rate: 'comparecimento' },
      { label: 'Oportunidade qualificada', count: (s) => s.qualificadas, rate: 'qualificacao' },
      { label: 'Ganhos', count: (s) => s.ganhos, rate: 'fechamento' },
    ],
  },
];

interface JornadaProps {
  safra: SafraCounts;
  rates: StageRate[];
  bottleneck: SafraRateKey | null;
}

/**
 * A jornada do período (US-0021): a Qualificação e a Abordagem, cada uma com a própria safra.
 * A barra compara com o topo do grupo; a taxa, com a etapa anterior — é ela que aponta onde
 * a conta ou o contato para.
 */
function Jornada(props: JornadaProps) {
  const { safra } = props;
  const contatos = safra.ativados
    ? ` ${plural(safra.ativados, 'contato ativado', 'contatos ativados')} em ${plural(safra.contas, 'conta', 'contas')} (${formatRatio(safra.ativados, safra.contas)} por conta).`
    : '';
  return (
    <Painel
      title="Jornada no período"
      description={`Onde cada uma chegou até hoje.${contatos}`}
      actions={<span className="text-xs text-muted-foreground">% sobre a etapa anterior</span>}
    >
      <div className="flex flex-col gap-5">
        {GRUPOS.map((g) => <GrupoDaJornadaNaTela key={g.titulo} grupo={g} {...props} />)}
      </div>
    </Painel>
  );
}

// A faixa mais estreita ainda precisa caber o número.
const LARGURA_MINIMA = 18;

/** Largura da faixa em % da largura do topo do grupo. */
const larguraDe = (n: number, topo: number) => Math.max(LARGURA_MINIMA, Math.min(100, topo ? (n / topo) * 100 : 0));

/** Trapézio centrado: a faixa vai da largura da etapa (em cima) à da seguinte (embaixo). */
function recorteDoTrapezio(cima: number, baixo: number): string {
  const l1 = (100 - cima) / 2;
  const l2 = (100 - baixo) / 2;
  return `polygon(${l1}% 0, ${100 - l1}% 0, ${100 - l2}% 100%, ${l2}% 100%)`;
}

function corDaFaixa(primeira: boolean, gargalo: boolean): string {
  if (gargalo) return 'bg-warning text-warning-foreground';
  return primeira ? 'bg-foreground text-background' : 'bg-primary text-primary-foreground';
}

/**
 * O grupo como funil (revisão de 23/11/2026): cada etapa é uma faixa com a largura
 * proporcional ao número, que fica dentro dela, e que se estreita até a largura da etapa
 * seguinte. A queda aparece no formato; a etapa do gargalo fica em amarelo.
 */
function GrupoDaJornadaNaTela(props: JornadaProps & { grupo: GrupoDaJornada }) {
  const { grupo, safra, rates, bottleneck } = props;
  const topo = grupo.base(safra);
  const larguras = grupo.passos.map((p) => larguraDe(p.count(safra), topo));
  return (
    <section className="flex flex-col gap-2.5" aria-label={grupo.titulo}>
      <h3 className="ui-label">{grupo.titulo}</h3>
      {topo === 0 ? (
        <p className="text-sm text-muted-foreground">{grupo.vazio}</p>
      ) : (
        <ol className="flex flex-col gap-[3px]">
          {grupo.passos.map((passo, i) => {
            const n = passo.count(safra);
            const gargalo = !!passo.rate && passo.rate === bottleneck;
            return (
              <li
                key={passo.label}
                className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_4rem] items-center gap-3 sm:grid-cols-[170px_minmax(0,1fr)_96px] sm:gap-4"
              >
                <span className="text-sm">{passo.label}</span>
                <span
                  className={cn('flex h-11 items-center justify-center font-mono text-[15px] font-semibold tabular-nums', corDaFaixa(i === 0, gargalo))}
                  style={{ clipPath: recorteDoTrapezio(larguras[i], larguras[i + 1] ?? larguras[i]) }}
                >
                  {n.toLocaleString('pt-BR')}
                </span>
                <TaxaDaJornada rate={rates.find((r) => r.key === passo.rate)} gargalo={gargalo} />
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function TaxaDaJornada({ rate, gargalo }: { rate?: StageRate; gargalo: boolean }) {
  if (!rate) return <span className="text-right font-mono text-xs text-muted-foreground">base</span>;
  return (
    <span
      className={cn('text-right font-mono text-xs tabular-nums', corDaTaxa(rate, gargalo))}
      title={`${rate.parte} de ${rate.base}${rate.small ? ' · amostra pequena' : ''}`}
    >
      {formatRate(rate.rate)}
      {gargalo && (
        <>
          <span aria-hidden="true"> ▼</span>
          <span className="sr-only"> (gargalo)</span>
        </>
      )}
    </span>
  );
}

function Leituras({ readings, onGoTab }: { readings: Reading[]; onGoTab: (tab: MetricsTab) => void }) {
  return (
    <Painel title="Leituras do período" className="gap-2">
      {readings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada fora do esperado no período — ou ainda não há base para afirmar.</p>
      ) : (
        <ul className="flex flex-col">
          {readings.map((r) => (
            <li key={r.kind} className="flex flex-col gap-1.5 border-t py-3.5">
              <span
                className={cn(
                  'self-start rounded px-1.5 py-0.5 text-[11px] font-medium',
                  r.alert ? 'bg-warning-subtle text-warning-emphasis' : 'bg-muted text-muted-foreground',
                )}
              >
                {r.tag}
              </span>
              <p className="text-sm font-medium text-pretty">{r.lead}</p>
              <p className="text-sm text-muted-foreground text-pretty">{r.text}</p>
              <Button variant="link" className="h-auto self-start p-0 text-sm" onClick={() => onGoTab(r.link.tab)}>
                {r.link.label} →
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Painel>
  );
}

interface Acao {
  key: string;
  count: number;
  text: string;
  alert: boolean;
  cta: ReactNode;
}

interface PrecisaDeAcaoProps {
  health: ListHealthData;
  awaiting: Occurrence[];
  onOpenList: (drill: MetricsDrill) => void;
}

function acoesDe(props: PrecisaDeAcaoProps): Acao[] {
  const { health, awaiting, onOpenList } = props;
  const { overdue, paradas, bant } = health;
  const abrirParadas = () =>
    onOpenList({
      title: `Em A abordar sem 1º toque há mais de ${DIAS_PARADA_EM_ABORDAR} dias`,
      description: 'Desde quando estão em A abordar, as mais antigas primeiro: aborde, ou registre a Perda.',
      items: paradas,
    });
  const abrirBant = () =>
    onOpenList({
      title: 'BANT abaixo da meta da etapa',
      description: 'Oportunidades em andamento com a nota do BANT abaixo da meta da etapa, as mais distantes primeiro.',
      items: bant.abaixoDaMeta,
    });
  const abrirVencidos = () =>
    onOpenList({
      title: 'Tarefa vencida',
      description: 'Contatos do quadro com tarefa pendente de prazo vencido, os mais atrasados primeiro.',
      items: overdue.map(({ prospect, task }) => ({ date: task.due_date, prospect })),
    });
  const abrirSemQualificacao = () =>
    onOpenList({
      title: 'Reunião feita sem qualificação',
      description: 'Contatos em Reunião feita: registre se viraram oportunidade qualificada, ganho ou perda.',
      items: awaiting,
    });
  return [
    {
      key: 'vencidas',
      count: overdue.length,
      text: overdue.length === 1 ? 'contato com tarefa vencida' : 'contatos com tarefa vencida',
      alert: true,
      cta: <BotaoDaAcao onClick={abrirVencidos}>{overdue.length === 1 ? 'Ver contato' : 'Ver contatos'}</BotaoDaAcao>,
    },
    {
      key: 'sem-qualificacao',
      count: awaiting.length,
      text: awaiting.length === 1 ? 'reunião feita sem qualificação registrada' : 'reuniões feitas sem qualificação registrada',
      alert: true,
      cta: <BotaoDaAcao onClick={abrirSemQualificacao}>Revisar</BotaoDaAcao>,
    },
    {
      key: 'paradas',
      count: paradas.length,
      text: `${paradas.length === 1 ? 'oportunidade' : 'oportunidades'} em A abordar sem 1º toque há mais de ${DIAS_PARADA_EM_ABORDAR} dias`,
      alert: false,
      cta: <BotaoDaAcao onClick={abrirParadas}>Ver</BotaoDaAcao>,
    },
    {
      key: 'bant',
      count: bant.abaixoDaMeta.length,
      text: bant.abaixoDaMeta.length === 1 ? 'oportunidade com BANT abaixo da meta da etapa' : 'oportunidades com BANT abaixo da meta da etapa',
      alert: false,
      cta: <BotaoDaAcao onClick={abrirBant}>Ver</BotaoDaAcao>,
    },
  ].filter((a) => a.count > 0);
}

function BotaoDaAcao({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClick}>
      {children}
    </Button>
  );
}

/** Pendências de hoje — não dependem do período, só do filtro de responsável e alavanca. */
function PrecisaDeAcao(props: PrecisaDeAcaoProps) {
  const acoes = acoesDe(props);
  return (
    <Painel title="Precisa de ação" className="gap-2">
      {acoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada pendente agora.</p>
      ) : (
        <ul className="flex flex-col">
          {acoes.map((a) => (
            <li key={a.key} className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 border-t py-3">
              <span className={cn('font-mono text-xl font-medium tabular-nums', a.alert && 'text-warning-emphasis')}>{a.count}</span>
              <span className="text-sm text-pretty">{a.text}</span>
              {a.cta}
            </li>
          ))}
        </ul>
      )}
    </Painel>
  );
}
