import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatRate, formatRatio, type AccountCoverage } from '@/lib/prospecting/metrics';
import { GRAIN_OPTIONS, formatDay } from '@/lib/prospecting/periods';
import { cn } from '@/lib/utils';
import type { Grain, MetricDefinition, MetricKey, MetricValue, SeriesPoint } from '@/types/prospectMetrics';
import { formatNumber, plural } from './format';
import { Painel, Segmentado } from './parts';

/** As métricas de esforço e o que ele já rendeu em conversa e agenda — as que valem acompanhar semana a semana. */
const METRICAS_DA_EVOLUCAO: readonly MetricKey[] = [
  'ativados',
  'atividades',
  'contas',
  'empresas',
  'contatos',
  'conversas',
  'agendadas',
  'feitas',
];

const METRICA_PADRAO: MetricKey = 'ativados';

const POR_GRAO: Record<Grain, { um: string; varios: string; curto: string }> = {
  semana: { um: 'semana', varios: 'semanas', curto: 'sem' },
  mes: { um: 'mês', varios: 'meses', curto: 'mês' },
};

/** Listras a 135°: marca "em andamento" sem depender só da cor. Tokens do tema, sem hex. */
const HACHURA: CSSProperties = {
  background: 'repeating-linear-gradient(135deg, hsl(var(--primary)) 0 2px, hsl(var(--primary) / 0.25) 2px 5px)',
};

interface EffortTabProps {
  values: MetricValue[];
  series: SeriesPoint[];
  grain: Grain;
  onGrainChange: (grain: Grain) => void;
  coverage: AccountCoverage;
  historyStart: string | null;
  onOpenMetric: (definition: MetricDefinition) => void;
}

/** "Estou fazendo volume?": o que foi feito no período, como isso evolui e quanto da lista já foi trabalhado. */
export function EffortTab(props: EffortTabProps) {
  const { values, coverage, onOpenMetric } = props;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 md:grid-cols-2">
        {gruposDe(values, coverage).map((g) => (
          <Painel key={g.title} title={g.title} description={g.question} className="gap-3 px-5 py-4">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-4">
              {g.items.map((item) => (
                <Numero key={item.key} item={item} value={valorDe(values, item.key)} onOpenMetric={onOpenMetric} />
              ))}
            </div>
          </Painel>
        ))}
      </div>
      <Evolucao {...props} />
      <Cobertura coverage={coverage} />
    </div>
  );
}

const valorDe = (values: MetricValue[], key: MetricKey) =>
  values.find((v) => v.definition.key === key) as MetricValue;

interface ItemDoGrupo {
  key: MetricKey;
  label: string;
  sub: string;
}

/** "2,3 por empresa" — só quando os dois lados existem. */
const porCada = (parte: number | null, total: number | null, rotulo: string) =>
  parte !== null && total ? `${formatRatio(parte, total)} ${rotulo}` : 'no período';

function gruposDe(values: MetricValue[], coverage: AccountCoverage) {
  const n = (k: MetricKey) => valorDe(values, k).current;
  const contas = n('contas') ?? 0;
  const listas: ItemDoGrupo[] = [
    { key: 'empresas', label: 'Empresas cadastradas', sub: n('empresas') === null ? 'não se aplica à alavanca' : 'no período' },
    { key: 'contatos', label: 'Contatos cadastrados', sub: porCada(n('contatos'), n('empresas'), 'por empresa') },
  ];
  const prospeccao: ItemDoGrupo[] = [
    { key: 'contas', label: 'Contas abertas', sub: coverage.naLista ? `${formatRate(contas / coverage.naLista)} da lista` : 'no período' },
    { key: 'ativados', label: 'Contatos ativados', sub: porCada(n('ativados'), contas, 'por conta') },
    { key: 'atividades', label: 'Atividades', sub: porCada(n('atividades'), n('ativados'), 'por ativado') },
  ];
  return [
    { title: 'Construção da lista', question: 'Estou alimentando o topo?', items: listas },
    { title: 'Prospecção', question: 'Estou prospectando de verdade?', items: prospeccao },
  ];
}

interface NumeroProps {
  item: ItemDoGrupo;
  value: MetricValue;
  onOpenMetric: EffortTabProps['onOpenMetric'];
}

function Numero(props: NumeroProps) {
  const { item, value, onOpenMetric } = props;
  const numero = value.current === null ? '—' : String(value.current);
  const corpo = (
    <>
      <span className="font-mono text-[1.625rem] font-medium leading-tight tracking-tight tabular-nums">{numero}</span>
      <span className="text-xs text-foreground">{item.label}</span>
      <span className="text-xs text-muted-foreground">{item.sub}</span>
    </>
  );
  if (!value.definition.drillable || value.current === null) return <div className="flex flex-col gap-1">{corpo}</div>;
  return (
    <button
      type="button"
      onClick={() => onOpenMetric(value.definition)}
      title={value.definition.question}
      aria-label={`${item.label}: ${numero}. Ver a lista.`}
      className="-m-1.5 flex flex-col gap-1 rounded-lg p-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {corpo}
    </button>
  );
}

interface Barra {
  key: string;
  label: string;
  title: string;
  value: number | null;
  selected: boolean;
  inProgress: boolean;
}

function barrasDe(series: SeriesPoint[], metric: MetricKey): Barra[] {
  return series.map((p) => {
    const value = p.values[metric] ?? null;
    const detalhe = value === null ? 'sem registro' : String(value);
    return {
      key: p.bucket.key,
      label: p.bucket.label,
      title: `${p.bucket.title}: ${detalhe}${p.bucket.inProgress ? ' (em andamento)' : ''}`,
      value,
      selected: p.bucket.selected,
      inProgress: p.bucket.inProgress,
    };
  });
}

/** Média das colunas completas do período — com menos de duas, "média" seria só o próprio número. */
function mediaDoPeriodo(barras: Barra[]): number | null {
  const completas = barras.filter((b) => b.selected && !b.inProgress && b.value !== null).map((b) => b.value as number);
  if (completas.length < 2) return null;
  return completas.reduce((a, b) => a + b, 0) / completas.length;
}

function Evolucao(props: EffortTabProps) {
  const { values, series, grain, onGrainChange, historyStart } = props;
  const [escolhida, setEscolhida] = useState<MetricKey>(METRICA_PADRAO);
  // Empresa não tem alavanca: com esse filtro, a métrica some da lista em vez de mostrar zeros.
  const disponiveis = METRICAS_DA_EVOLUCAO.map((k) => valorDe(values, k)).filter((v) => v.current !== null);
  const metrica = disponiveis.some((v) => v.definition.key === escolhida) ? escolhida : METRICA_PADRAO;
  const atual = valorDe(values, metrica);
  const barras = barrasDe(series, metrica);
  const semRegistro = historyStart && barras.some((b) => b.value === null);

  return (
    <Painel
      title="Evolução"
      description={`${plural(series.length, POR_GRAO[grain].um, POR_GRAO[grain].varios)} até o período escolhido. Passe o mouse numa coluna para ver o detalhe.`}
      actions={<Segmentado value={grain} onChange={onGrainChange} options={GRAIN_OPTIONS} label="Agrupar a evolução por" />}
    >
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Métrica da evolução">
        {disponiveis.map((v) => (
          <Chip key={v.definition.key} ativo={v.definition.key === metrica} onClick={() => setEscolhida(v.definition.key)}>
            {v.definition.label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-mono text-[1.75rem] font-medium tabular-nums">{atual.current ?? 0}</span>
        <span className="text-sm text-muted-foreground">{atual.definition.label.toLowerCase()} no período</span>
      </div>
      <Colunas barras={barras} grain={grain} rotulo={atual.definition.label} />
      <Legenda />
      {semRegistro && (
        <p className="text-xs text-muted-foreground">
          Reuniões e qualificações passaram a ter data em {formatDay(historyStart)}. Colunas anteriores ficam sem registro — não é zero.
        </p>
      )}
    </Painel>
  );
}

interface ChipProps {
  ativo: boolean;
  onClick: () => void;
  children: string;
}

function Chip(props: ChipProps) {
  const { ativo, onClick, children } = props;
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        ativo ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  );
}

function corDaColuna(b: Barra): string {
  if (!b.value) return 'bg-border';
  if (!b.selected) return 'bg-muted-foreground/30';
  return b.inProgress ? '' : 'bg-primary';
}

interface ColunasProps {
  barras: Barra[];
  grain: Grain;
  rotulo: string;
}

function Colunas(props: ColunasProps) {
  const { barras, grain, rotulo } = props;
  const maior = Math.max(1, ...barras.map((b) => b.value ?? 0));
  const media = mediaDoPeriodo(barras);
  const altura = (v: number | null) => (v ? `${(v / maior) * 85}%` : '2px');
  return (
    <>
      <div className="relative h-[200px] border-b" role="img" aria-label={`${rotulo}: ${barras.map((b) => b.title).join('; ')}`}>
        {media !== null && (
          <div className="pointer-events-none absolute inset-x-0 z-[1] border-t border-dashed border-muted-foreground" style={{ bottom: altura(media) }}>
            <span className="absolute -top-[17px] left-0 bg-card pr-1 text-[11px] text-muted-foreground">
              média {formatNumber(media)}/{POR_GRAO[grain].curto} no período
            </span>
          </div>
        )}
        <div className="flex h-full items-end gap-1 sm:gap-2">
          {barras.map((b) => (
            <div key={b.key} title={b.title} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1">
              <span className="text-center font-mono text-[11px] tabular-nums">{b.value || ''}</span>
              <div
                className={cn('rounded-t-[3px]', corDaColuna(b))}
                style={{ height: altura(b.value), ...(b.value && b.selected && b.inProgress ? HACHURA : {}) }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="-mt-2 flex gap-1 sm:gap-2" aria-hidden="true">
        {barras.map((b) => (
          <span
            key={b.key}
            className={cn(
              'min-w-0 flex-1 overflow-hidden text-ellipsis text-center font-mono text-[10px]',
              b.selected ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {b.label}
          </span>
        ))}
      </div>
    </>
  );
}

function Legenda() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legenda">
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-primary" aria-hidden="true" />
        Período escolhido
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={HACHURA} aria-hidden="true" />
        Em andamento
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/30" aria-hidden="true" />
        Anteriores
      </li>
    </ul>
  );
}

/**
 * Cobertura de contas — fica fora da jornada porque responde outra pergunta: não "como
 * converte", e sim "a lista está sendo consumida". Uma lista parada produz taxas de
 * aparência saudável com volume minúsculo, e só este número denuncia isso.
 */
function Cobertura({ coverage }: { coverage: AccountCoverage }) {
  const percentual = coverage.taxa === null ? 0 : Math.round(coverage.taxa * 100);
  const nunca = coverage.nuncaAbordadas;
  return (
    <Painel title="Cobertura da lista" description="Quanto das empresas com contato cadastrado foi trabalhado no período." className="gap-3.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[1.75rem] font-medium tabular-nums">{formatRate(coverage.taxa)}</span>
        <span className="text-sm text-muted-foreground">
          {coverage.abertas} de {plural(coverage.naLista, 'conta', 'contas')} trabalhadas no período
        </span>
      </div>
      <Progress value={percentual} className="h-2.5" aria-label={`Cobertura da lista: ${formatRate(coverage.taxa)}`} />
      {nunca > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>
            <span className="font-mono font-medium tabular-nums">{nunca}</span>{' '}
            {nunca === 1 ? 'conta nunca foi abordada' : 'contas nunca foram abordadas'}
          </span>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs">
            <Link to="/comercial/empresas">Ver contas</Link>
          </Button>
        </div>
      )}
    </Painel>
  );
}
