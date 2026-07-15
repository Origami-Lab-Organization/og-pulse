import {
  ComposedChart, Bar, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea,
} from 'recharts';
import { fmtBRL0, fmtPct } from './financeUtils';
import type { FinancialMonthlyPoint } from '@/hooks/useFinancialEvolution';

const FATURAMENTO = 'hsl(var(--muted-foreground))';
const RECEITA = 'hsl(var(--success))';
const CUSTOS = 'hsl(var(--destructive))';
const MARGEM = 'hsl(var(--warning))';

const DIMMED_OPACITY = 0.35;
const RADIUS_TOP: [number, number, number, number] = [3, 3, 0, 0];
const RADIUS_FLAT: [number, number, number, number] = [0, 0, 0, 0];

const STRIPE_SIZE = 6;
const STRIPES: Array<{ id: string; color: string }> = [
  { id: 'evo-stripe-faturado', color: FATURAMENTO },
  { id: 'evo-stripe-receita', color: RECEITA },
  { id: 'evo-stripe-custos', color: CUSTOS },
];

function ProjectionPatterns() {
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
      <defs>
        {STRIPES.map(({ id, color }) => (
          <pattern key={id} id={id} patternUnits="userSpaceOnUse" width={STRIPE_SIZE} height={STRIPE_SIZE} patternTransform="rotate(45)">
            <rect width={STRIPE_SIZE} height={STRIPE_SIZE} fill={color} fillOpacity={0.16} />
            <rect width={STRIPE_SIZE / 2} height={STRIPE_SIZE} fill={color} fillOpacity={0.55} />
          </pattern>
        ))}
      </defs>
    </svg>
  );
}

interface EvolutionChartPoint {
  label: string;
  monthIndex: number;
  faturadoReal: number;
  faturadoRestante: number;
  receitaReal: number;
  receitaRestante: number;
  custosReal: number;
  custosRestante: number;
  margemPct: number | null;
  isFuture: boolean;
  isCurrent: boolean;
  isHighlighted: boolean;
}

function projectionDot(color: string) {
  return function Dot(props: { cx?: number; cy?: number; payload?: EvolutionChartPoint }) {
    const { cx, cy, payload } = props;
    if (cx == null || cy == null) return null;
    const isFuture = payload?.isFuture;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={3}
        fill={isFuture ? 'hsl(var(--card))' : color}
        stroke={color}
        strokeWidth={isFuture ? 1.5 : 0}
        strokeDasharray={isFuture ? '2 1' : undefined}
      />
    );
  };
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ payload?: EvolutionChartPoint }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const rows: Array<{ key: string; name: string; value: number | null; color: string; pct?: boolean }> = [
    { key: 'faturado', name: 'Faturamento', value: point.faturadoReal + point.faturadoRestante, color: FATURAMENTO },
    { key: 'receita', name: 'Receita', value: point.receitaReal + point.receitaRestante, color: RECEITA },
    { key: 'custos', name: 'Custos', value: point.custosReal + point.custosRestante, color: CUSTOS },
    { key: 'margem', name: 'Margem %', value: point.margemPct, color: MARGEM, pct: true },
  ];
  const hasRestante = point.faturadoRestante > 0 || point.receitaRestante > 0 || point.custosRestante > 0;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-dropdown">
      <p className="mb-1 flex items-center gap-1.5 font-medium uppercase">
        {label}
        {point.isCurrent && (
          <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-muted-foreground">
            em curso
          </span>
        )}
        {point.isFuture && (
          <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-muted-foreground">
            projeção
          </span>
        )}
        {!point.isHighlighted && (
          <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">fora do período</span>
        )}
      </p>
      {rows.map((r) => r.value != null && (
        <p key={r.key} className="font-mono tabular-nums" style={{ color: r.color }}>
          {r.name}: {r.pct ? fmtPct(r.value) : fmtBRL0(r.value)}
        </p>
      ))}
      {point.isCurrent && hasRestante && (
        <p className="mt-1 border-t pt-1 text-[11px] text-muted-foreground">hachurado = restante até o previsto do mês</p>
      )}
    </div>
  );
}

interface FinanceEvolutionChartProps {
  months: FinancialMonthlyPoint[];
  onMonthClick?: (monthIndex: number) => void;
}

export function FinanceEvolutionChart({ months, onMonthClick }: FinanceEvolutionChartProps) {
  const chartData: EvolutionChartPoint[] = months.map((m) => {
    const isFuture = !m.isPast;
    const closed = m.isPast && !m.isCurrent;

    const faturadoAtual = isFuture ? 0 : m.faturado;
    const receitaAtual = isFuture ? 0 : m.revenueReal;
    const custosAtual = isFuture ? 0 : m.totalCosts;

    const faturadoRestante = closed ? 0 : Math.max(0, m.revenuePlanned - faturadoAtual);
    const receitaRestante = closed ? 0 : Math.max(0, m.revenuePlanned - receitaAtual);
    const custosRestante = closed ? 0 : Math.max(0, m.plannedTotalCosts - custosAtual);

    return {
      label: m.label.toUpperCase(),
      monthIndex: m.monthIndex,
      faturadoReal: Math.round(faturadoAtual),
      faturadoRestante: Math.round(faturadoRestante),
      receitaReal: Math.round(receitaAtual),
      receitaRestante: Math.round(receitaRestante),
      custosReal: Math.round(custosAtual),
      custosRestante: Math.round(custosRestante),
      margemPct: (isFuture ? m.plannedGrossMarginPct : m.grossMarginPct) != null
        ? Math.max(0, Math.round((isFuture ? m.plannedGrossMarginPct : m.grossMarginPct)!))
        : null,
      isFuture,
      isCurrent: m.isCurrent,
      isHighlighted: m.isHighlighted,
    };
  });

  const highlighted = chartData.filter((d) => d.isHighlighted);
  const showHighlightBand = highlighted.length > 0 && highlighted.length < chartData.length;
  const highlightStart = highlighted[0]?.label;
  const highlightEnd = highlighted[highlighted.length - 1]?.label;

  return (
    <section className="rounded-lg border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Evolução financeira</h2>
          <p className="text-xs text-muted-foreground">
            valores em R$ (eixo esq.) · margem % (eixo dir.) · destaque = período selecionado · hachurado = projeção
            {onMonthClick && ' · clique em um mês para filtrar'}
          </p>
        </div>
      </div>
      <div className="mt-3 h-[300px]" style={onMonthClick ? { cursor: 'pointer' } : undefined}>
        <ProjectionPatterns />
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            onClick={(state) => {
              const point = state?.activePayload?.[0]?.payload as EvolutionChartPoint | undefined;
              if (point) onMonthClick?.(point.monthIndex);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'hsl(var(--border))' }} />
            <YAxis
              yAxisId="val"
              orientation="left"
              tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: 'hsl(var(--warning))' }}
              tickLine={false}
              axisLine={false}
              domain={[0, 50]}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', fillOpacity: 0.4 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {showHighlightBand && (
              <ReferenceArea
                yAxisId="val"
                x1={highlightStart}
                x2={highlightEnd}
                fill="hsl(var(--primary))"
                fillOpacity={0.07}
                stroke="hsl(var(--primary))"
                strokeOpacity={0.25}
                strokeWidth={1}
              />
            )}
            <Bar yAxisId="val" dataKey="faturadoReal" name="Faturamento" stackId="faturamento" fill={FATURAMENTO} barSize={12}>
              {chartData.map((d) => (
                <Cell key={d.label} fill={FATURAMENTO} fillOpacity={d.isHighlighted ? 1 : DIMMED_OPACITY} radius={d.faturadoRestante > 0 ? RADIUS_FLAT : RADIUS_TOP} />
              ))}
            </Bar>
            <Bar yAxisId="val" dataKey="faturadoRestante" name="Faturamento (previsto)" legendType="none" stackId="faturamento" fill="url(#evo-stripe-faturado)" barSize={12}>
              {chartData.map((d) => (
                <Cell key={d.label} fill="url(#evo-stripe-faturado)" fillOpacity={d.isHighlighted ? 1 : DIMMED_OPACITY} radius={RADIUS_TOP} />
              ))}
            </Bar>
            <Bar yAxisId="val" dataKey="receitaReal" name="Receita" stackId="receita" fill={RECEITA} barSize={12}>
              {chartData.map((d) => (
                <Cell key={d.label} fill={RECEITA} fillOpacity={d.isHighlighted ? 1 : DIMMED_OPACITY} radius={d.receitaRestante > 0 ? RADIUS_FLAT : RADIUS_TOP} />
              ))}
            </Bar>
            <Bar yAxisId="val" dataKey="receitaRestante" name="Receita (previsto)" legendType="none" stackId="receita" fill="url(#evo-stripe-receita)" barSize={12}>
              {chartData.map((d) => (
                <Cell key={d.label} fill="url(#evo-stripe-receita)" fillOpacity={d.isHighlighted ? 1 : DIMMED_OPACITY} radius={RADIUS_TOP} />
              ))}
            </Bar>
            <Bar yAxisId="val" dataKey="custosReal" name="Custos" stackId="custos" fill={CUSTOS} barSize={12}>
              {chartData.map((d) => (
                <Cell key={d.label} fill={CUSTOS} fillOpacity={d.isHighlighted ? 1 : DIMMED_OPACITY} radius={d.custosRestante > 0 ? RADIUS_FLAT : RADIUS_TOP} />
              ))}
            </Bar>
            <Bar yAxisId="val" dataKey="custosRestante" name="Custos (previsto)" legendType="none" stackId="custos" fill="url(#evo-stripe-custos)" barSize={12}>
              {chartData.map((d) => (
                <Cell key={d.label} fill="url(#evo-stripe-custos)" fillOpacity={d.isHighlighted ? 1 : DIMMED_OPACITY} radius={RADIUS_TOP} />
              ))}
            </Bar>
            <Line yAxisId="pct" type="monotone" dataKey="margemPct" name="Margem %" stroke={MARGEM} strokeWidth={2} strokeDasharray="5 4" dot={projectionDot(MARGEM)} activeDot={{ r: 5 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
