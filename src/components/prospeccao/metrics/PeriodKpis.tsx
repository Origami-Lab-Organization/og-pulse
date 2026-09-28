import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency } from '@/lib/formatters';
import { formatDay } from '@/lib/prospecting/periods';
import { cn } from '@/lib/utils';
import type { MetricBlock, MetricDefinition, MetricValue, SalesSummary } from '@/types/prospectMetrics';

const BLOCOS: ReadonlyArray<{ block: MetricBlock; titulo: string; pergunta: string; vendas?: boolean }> = [
  { block: 'lista', titulo: 'Construção da lista', pergunta: 'Estou alimentando o topo?' },
  { block: 'esforco', titulo: 'Esforço', pergunta: 'Estou prospectando de verdade?' },
  { block: 'resultado', titulo: 'Resultado', pergunta: 'O esforço virou conversa e agenda?' },
  { block: 'desfecho', titulo: 'Desfecho', pergunta: 'Quanto virou venda, e quanto se perdeu?', vendas: true },
];

interface PeriodKpisProps {
  values: MetricValue[];
  sales: SalesSummary;
  comparisonLabel: string;
  historyStart: string | null;
  onOpen: (definition: MetricDefinition) => void;
}

/**
 * O que aconteceu no período, com a variação contra o mesmo trecho do período anterior.
 * Em prospecção, mais é melhor em todos: o sinal da variação pode ganhar cor.
 */
export function PeriodKpis(props: PeriodKpisProps) {
  const { values, sales, comparisonLabel, historyStart, onOpen } = props;
  return (
    <div className="space-y-4">
      {BLOCOS.map(({ block, titulo, pergunta, vendas }) => (
        <section key={block} aria-label={titulo} className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <h3 className="ui-label">{titulo}</h3>
            <p className="text-xs text-muted-foreground">{pergunta}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {values
              .filter((v) => v.definition.block === block)
              .map((v) => (
                <Indicador
                  key={v.definition.key}
                  value={v}
                  comparisonLabel={comparisonLabel}
                  historyStart={historyStart}
                  onOpen={onOpen}
                />
              ))}
            {vendas && <Vendas sales={sales} />}
          </div>
        </section>
      ))}
    </div>
  );
}

interface IndicadorProps {
  value: MetricValue;
  comparisonLabel: string;
  historyStart: string | null;
  onOpen: (definition: MetricDefinition) => void;
}

function Indicador(props: IndicadorProps) {
  const { value, comparisonLabel, historyStart, onOpen } = props;
  const { definition, current } = value;
  const cartao = (
    <MetricCard
      label={definition.label}
      wrapLabel
      value={current ?? '—'}
      subline={<Variacao value={value} historyStart={historyStart} />}
      className={cn('h-full', definition.drillable && 'transition-colors group-hover:border-primary/50')}
    />
  );
  if (!definition.drillable || current === null) return <div title={definition.question}>{cartao}</div>;

  return (
    <button
      type="button"
      onClick={() => onOpen(definition)}
      title={definition.question}
      aria-label={`${definition.label}: ${current}. ${textoDaVariacao(value)} ${comparisonLabel}. Ver a lista.`}
      className="group rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {cartao}
    </button>
  );
}

function diferenca(value: MetricValue): number | null {
  if (value.current === null || value.previous === null || value.partial) return null;
  return value.current - value.previous;
}

function textoDaVariacao(value: MetricValue): string {
  const delta = diferenca(value);
  if (delta === null) return 'Sem comparação';
  const percentual = value.previous ? ` (${Math.round((delta / value.previous) * 100)}%)` : '';
  return `${delta > 0 ? '+' : ''}${delta}${percentual}`;
}

const SINAIS = {
  subiu: { Icone: ArrowUp, classe: 'text-success', rotulo: 'subiu' },
  caiu: { Icone: ArrowDown, classe: 'text-destructive', rotulo: 'caiu' },
  igual: { Icone: Minus, classe: 'text-muted-foreground', rotulo: 'igual' },
} as const;

const sinalDe = (delta: number) => (delta > 0 ? SINAIS.subiu : delta < 0 ? SINAIS.caiu : SINAIS.igual);

function Variacao({ value, historyStart }: { value: MetricValue; historyStart: string | null }) {
  if (value.current === null) return <span>não se aplica à alavanca</span>;
  if (value.partial && historyStart) {
    const dia = formatDay(historyStart).slice(0, 5);
    return <span title={`Esta etapa tem data desde ${dia}: sem comparação com o período anterior.`}>desde {dia}</span>;
  }
  const delta = diferenca(value);
  if (delta === null) return <span>—</span>;
  const sinal = sinalDe(delta);
  return (
    <span className={cn('inline-flex items-center gap-1', sinal.classe)}>
      <sinal.Icone className="h-3 w-3" aria-hidden="true" />
      <span className="sr-only">{sinal.rotulo}</span>
      {textoDaVariacao(value)}
    </span>
  );
}

/**
 * O dinheiro do período. Ganho sem valor fica FORA do valor e do ticket — somá-lo como zero
 * puxaria o ticket para baixo em silêncio —, e a pendência aparece por extenso.
 */
function Vendas({ sales }: { sales: SalesSummary }) {
  const delta = sales.valorAnterior === null ? null : sales.valor - sales.valorAnterior;
  const pendencia = sales.semValor > 0 ? `${sales.semValor} ganho(s) sem valor` : null;
  return (
    <>
      <MetricCard
        label="Valor ganho"
        wrapLabel
        value={formatCurrency(sales.valor)}
        subline={pendencia ? <span className="text-warning-emphasis">{pendencia}</span> : <VariacaoEmReais delta={delta} />}
      />
      <MetricCard
        label="Ticket médio"
        wrapLabel
        value={sales.ticketMedio === null ? '—' : formatCurrency(sales.ticketMedio)}
        subline={sales.ganhos ? `${sales.ganhos - sales.semValor} ganho(s) com valor` : 'nenhum ganho'}
      />
    </>
  );
}

function VariacaoEmReais({ delta }: { delta: number | null }) {
  if (delta === null) return <span>—</span>;
  const sinal = sinalDe(delta);
  return (
    <span className={cn('inline-flex items-center gap-1', sinal.classe)}>
      <sinal.Icone className="h-3 w-3" aria-hidden="true" />
      <span className="sr-only">{sinal.rotulo}</span>
      {delta > 0 ? '+' : ''}
      {formatCurrency(delta)}
    </span>
  );
}
