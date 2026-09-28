import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatRate } from '@/lib/prospecting/metrics';
import { MIN_SAMPLE } from '@/lib/prospecting/periodMetrics';
import type { SafraPoint, SafraRateKey } from '@/types/prospectMetrics';

const COR = 'hsl(var(--primary))';

const TAXAS: ReadonlyArray<{ key: SafraRateKey; label: string; base: string }> = [
  { key: 'resposta', label: 'Taxa de resposta', base: 'conversas ÷ ativados' },
  { key: 'agendamento', label: 'Taxa de agendamento', base: 'agendadas ÷ conversas' },
  { key: 'comparecimento', label: 'Taxa de comparecimento', base: 'feitas ÷ agendadas' },
  { key: 'qualificacao', label: 'Taxa de qualificação', base: 'qualificadas ÷ feitas' },
  { key: 'fechamento', label: 'Taxa de fechamento', base: 'ganhos ÷ qualificadas' },
];

interface SafraRatesGridProps {
  points: SafraPoint[];
}

/**
 * Conversão por safra: cada ponto é o grupo de contatos ativados naquela semana/mês e até
 * onde ele chegou, até hoje. Uma linha por taxa, em gráficos separados e com a mesma
 * escala de 0 a 100% — quatro linhas num gráfico só pediriam quatro cores e esconderiam
 * justamente a taxa que caiu.
 */
export function SafraRatesGrid(props: SafraRatesGridProps) {
  const { points } = props;
  return (
    <Card>
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-base">Conversão por mês de ativação</CardTitle>
        <p className="text-sm text-muted-foreground">
          Cada ponto é o grupo de contatos que recebeu o 1º toque naquele mês, e até onde chegou até hoje. Por mês, e
          não por semana: com o volume de prospecção de um time pequeno, a safra semanal raramente tem base para taxa. O
          trecho tracejado ainda está amadurecendo: a cadência e a reunião levam semanas. Com menos de {MIN_SAMPLE}{' '}
          contatos na base, a taxa fica de fora.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          {TAXAS.map((t) => <LinhaDaTaxa key={t.key} taxa={t} points={points} />)}
        </div>
        <TabelaDasSafras points={points} />
      </CardContent>
    </Card>
  );
}

interface Ponto {
  key: string;
  label: string;
  title: string;
  ativados: number;
  maturing: boolean;
  madura: number | null;
  amadurecendo: number | null;
}

const percentual = (v: number | null) => (v === null ? null : Math.round(v * 100));

/**
 * Duas séries da mesma taxa: madura (contínua) e amadurecendo (tracejada). O último ponto
 * maduro entra nas duas para a linha não quebrar na passagem.
 */
function pontosDa(key: SafraRateKey, points: SafraPoint[]): Ponto[] {
  return points.map((p, i) => {
    const valor = percentual(p[key]);
    const vizinhoAmadurece = points[i + 1]?.maturing ?? false;
    return {
      key: p.bucket.key,
      label: p.bucket.label,
      title: p.bucket.title,
      ativados: p.ativados,
      maturing: p.maturing,
      madura: p.maturing ? null : valor,
      amadurecendo: p.maturing || vizinhoAmadurece ? valor : null,
    };
  });
}

interface LinhaDaTaxaProps {
  taxa: (typeof TAXAS)[number];
  points: SafraPoint[];
}

function LinhaDaTaxa(props: LinhaDaTaxaProps) {
  const { taxa, points } = props;
  const dados = pontosDa(taxa.key, points);
  return (
    <figure className="space-y-1">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{taxa.label}</span>
        <span className="text-xs text-muted-foreground">{taxa.base}</span>
      </figcaption>
      <ChartContainer config={{ madura: { label: taxa.label, color: COR } }} className="aspect-auto h-32 w-full">
        <LineChart data={dados} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="key"
            tickFormatter={(key: string) => dados.find((d) => d.key === key)?.label ?? key}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={16}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            tickFormatter={(v: number) => `${v}%`}
            width={36}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10 }}
          />
          <ChartTooltip cursor={{ stroke: 'hsl(var(--border))' }} content={<DicaDaSafra />} />
          <Line dataKey="madura" stroke={COR} strokeWidth={2} dot={{ r: 4, fill: COR, strokeWidth: 0 }} isAnimationActive={false} />
          <Line
            dataKey="amadurecendo"
            stroke={COR}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={{ r: 4, fill: 'hsl(var(--card))', stroke: COR, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
    </figure>
  );
}

interface DicaProps {
  active?: boolean;
  payload?: Array<{ payload: Ponto }>;
}

function DicaDaSafra(props: DicaProps) {
  const ponto = props.active ? props.payload?.[0]?.payload : undefined;
  if (!ponto) return null;
  const valor = ponto.madura ?? ponto.amadurecendo;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{ponto.title}</p>
      <p className="tabular-nums">{valor === null ? 'Amostra pequena' : `${valor}%`}</p>
      <p className="text-muted-foreground">{ponto.ativados} ativado(s){ponto.maturing ? ' · amadurecendo' : ''}</p>
    </div>
  );
}

function TabelaDasSafras(props: SafraRatesGridProps) {
  const { points } = props;
  return (
    <details className="rounded-lg border px-3 py-2 text-sm">
      <summary className="cursor-pointer select-none font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Ver as safras em tabela
      </summary>
      <div className="mt-2 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Safra</TableHead>
              <TableHead className="text-right">Ativados</TableHead>
              {TAXAS.map((t) => <TableHead key={t.key} className="text-right">{t.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {points.map((p) => (
              <TableRow key={p.bucket.key}>
                <TableCell className="whitespace-nowrap">
                  {p.bucket.title}
                  {p.maturing && <span className="text-muted-foreground"> · amadurecendo</span>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{p.ativados}</TableCell>
                {TAXAS.map((t) => <TableCell key={t.key} className="text-right tabular-nums">{formatRate(p[t.key])}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </details>
  );
}
