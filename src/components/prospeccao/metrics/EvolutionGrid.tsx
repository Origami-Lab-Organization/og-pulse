import { useId } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ReferenceArea, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { METRIC_DEFINITIONS } from '@/lib/prospecting/periodMetrics';
import { formatDay } from '@/lib/prospecting/periods';
import type { Bucket, Grain, MetricDefinition, SeriesPoint } from '@/types/prospectMetrics';

/**
 * Emphasis, não categórico: a coluna do período escolhido no tom de destaque, as outras em
 * cinza. A pergunta de cada gráfico é "o período escolhido foi bom?", e o cinza é o contexto
 * que responde. Tokens do tema — `--primary` já é outro passo do verde no modo escuro.
 */
const COR_DESTAQUE = 'hsl(var(--primary))';
const COR_CONTEXTO = 'hsl(var(--chart-5))';

const POR_GRAO: Record<Grain, { um: string; varios: string }> = {
  semana: { um: 'semana', varios: 'semanas' },
  mes: { um: 'mês', varios: 'meses' },
};

interface EvolutionGridProps {
  series: SeriesPoint[];
  grain: Grain;
  historyStart: string | null;
  onSelectBucket: (bucket: Bucket) => void;
}

export function EvolutionGrid(props: EvolutionGridProps) {
  const { series, grain, historyStart, onSelectBucket } = props;
  // Sem valor nenhum e sem depender do histórico = não se aplica ao filtro (empresa não tem alavanca).
  const definicoes = METRIC_DEFINITIONS.filter((d) => d.needsHistory || series.some((p) => p.values[d.key] != null));

  return (
    <Card>
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-base">Evolução</CardTitle>
        <p className="text-sm text-muted-foreground">
          {series.length} {POR_GRAO[grain].varios} até o período escolhido. Clique numa
          coluna para ver aquele trecho.
        </p>
        <Legenda />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
          {definicoes.map((def) => (
            <MiniColunas key={def.key} definition={def} series={series} grain={grain} onSelectBucket={onSelectBucket} />
          ))}
        </div>
        {historyStart && (
          <p className="text-xs text-muted-foreground">
            Reuniões e qualificações passaram a ter data em {formatDay(historyStart)}. Antes disso a área cinza marca
            "sem registro" — não é zero.
          </p>
        )}
        <TabelaDaEvolucao series={series} definitions={definicoes} />
      </CardContent>
    </Card>
  );
}

function Legenda() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground" aria-label="Legenda">
      <li className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_DESTAQUE }} aria-hidden="true" />
        Período escolhido
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_CONTEXTO }} aria-hidden="true" />
        Anteriores
      </li>
      <li className="inline-flex items-center gap-1.5">
        <span
          className="h-2.5 w-2.5 rounded-sm border border-primary"
          style={{ background: `repeating-linear-gradient(135deg, ${COR_DESTAQUE} 0 2px, transparent 2px 4px)` }}
          aria-hidden="true"
        />
        Em andamento
      </li>
    </ul>
  );
}

interface Coluna {
  key: string;
  label: string;
  bucket: Bucket;
  value: number | null;
}

function media(colunas: Coluna[]): number | null {
  const completas = colunas.filter((c) => c.value !== null && !c.bucket.inProgress).map((c) => c.value as number);
  if (completas.length === 0) return null;
  return completas.reduce((a, b) => a + b, 0) / completas.length;
}

/** O trecho sem registro, de ponta a ponta, para a faixa cinza. */
function trechoSemRegistro(colunas: Coluna[]): [string, string] | null {
  const sem = colunas.filter((c) => c.value === null);
  return sem.length ? [sem[0].key, sem[sem.length - 1].key] : null;
}

interface MiniColunasProps {
  definition: MetricDefinition;
  series: SeriesPoint[];
  grain: Grain;
  onSelectBucket: (bucket: Bucket) => void;
}

function MiniColunas(props: MiniColunasProps) {
  const { definition, series, grain, onSelectBucket } = props;
  const hachura = `hachura-${useId().replace(/:/g, '')}`;
  const colunas: Coluna[] = series.map((p) => ({
    key: p.bucket.key,
    label: p.bucket.label,
    bucket: p.bucket,
    value: p.values[definition.key] ?? null,
  }));
  const semRegistro = trechoSemRegistro(colunas);
  const mediaDoPeriodo = media(colunas);
  const sufixo = (c: Coluna) => (c.bucket.selected ? 'd' : 'c');
  const corBase = (c: Coluna) => (c.bucket.selected ? COR_DESTAQUE : COR_CONTEXTO);
  const corDa = (c: Coluna) => (c.bucket.inProgress ? `url(#${hachura}-${sufixo(c)})` : corBase(c));

  return (
    <figure className="space-y-1">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{definition.label}</span>
        {mediaDoPeriodo !== null && (
          <span className="text-xs tabular-nums text-muted-foreground">
            média {mediaDoPeriodo.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/{POR_GRAO[grain].um}
          </span>
        )}
      </figcaption>
      <ChartContainer config={{ value: { label: definition.label, color: COR_DESTAQUE } }} className="aspect-auto h-28 w-full">
        <BarChart data={colunas} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap={2}>
          <defs>
            <Hachura id={`${hachura}-d`} cor={COR_DESTAQUE} />
            <Hachura id={`${hachura}-c`} cor={COR_CONTEXTO} />
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="key"
            tickFormatter={(key: string) => colunas.find((c) => c.key === key)?.label ?? key}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
            tick={{ fontSize: 10 }}
          />
          <YAxis allowDecimals={false} width={24} tickLine={false} axisLine={false} tickCount={3} tick={{ fontSize: 10 }} />
          {semRegistro && (
            <ReferenceArea x1={semRegistro[0]} x2={semRegistro[1]} fill="hsl(var(--muted))" fillOpacity={0.7} ifOverflow="visible" />
          )}
          <ChartTooltip cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} content={<DicaDaColuna />} />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            className="cursor-pointer"
            onClick={(dado: { payload?: Coluna }) => dado.payload && onSelectBucket(dado.payload.bucket)}
          >
            {colunas.map((c) => <Cell key={c.key} fill={corDa(c)} />)}
          </Bar>
        </BarChart>
      </ChartContainer>
    </figure>
  );
}

/** Listras a 135°: marca "em andamento" sem depender só da cor. */
function Hachura({ id, cor }: { id: string; cor: string }) {
  return (
    <pattern id={id} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
      <rect width="6" height="6" fill={cor} fillOpacity={0.3} />
      <line x1="0" y1="0" x2="0" y2="6" stroke={cor} strokeWidth="3" />
    </pattern>
  );
}

interface DicaProps {
  active?: boolean;
  payload?: Array<{ payload: Coluna }>;
}

function DicaDaColuna(props: DicaProps) {
  const coluna = props.active ? props.payload?.[0]?.payload : undefined;
  if (!coluna) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{coluna.bucket.title}</p>
      <p className="tabular-nums">{coluna.value === null ? 'Sem registro' : coluna.value}</p>
      {coluna.bucket.inProgress && <p className="text-muted-foreground">Em andamento</p>}
    </div>
  );
}

interface TabelaDaEvolucaoProps {
  series: SeriesPoint[];
  definitions: MetricDefinition[];
}

/** A mesma evolução em números: leitor de tela, cópia para planilha e conferência. */
function TabelaDaEvolucao(props: TabelaDaEvolucaoProps) {
  const { series, definitions } = props;
  return (
    <details className="rounded-lg border px-3 py-2 text-sm">
      <summary className="cursor-pointer select-none font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Ver os números em tabela
      </summary>
      <div className="mt-2 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Período</TableHead>
              {definitions.map((d) => <TableHead key={d.key} className="text-right">{d.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {series.map((p) => (
              <TableRow key={p.bucket.key} className={p.bucket.selected ? 'font-medium' : undefined}>
                <TableCell className="whitespace-nowrap">
                  {p.bucket.title}
                  {p.bucket.inProgress && <span className="text-muted-foreground"> · em andamento</span>}
                </TableCell>
                {definitions.map((d) => (
                  <TableCell key={d.key} className="text-right tabular-nums">
                    {p.values[d.key] ?? <span className="text-muted-foreground">sem registro</span>}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}
