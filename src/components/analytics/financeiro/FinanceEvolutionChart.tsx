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
  faturado: number;
  receita: number;
  custos: number;
  margemPct: number | null;
  isFuture: boolean;
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

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; dataKey: string; payload?: EvolutionChartPoint }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-dropdown">
      <p className="mb-1 flex items-center gap-1.5 font-medium uppercase">
        {label}
        {point?.isFuture && (
          <span className="rounded-pill bg-muted px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-muted-foreground">
            projeção
          </span>
        )}
        {point && !point.isHighlighted && (
          <span className="text-[10px] font-normal normal-case tracking-normal text-muted-foreground">fora do período</span>
        )}
      </p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-mono tabular-nums" style={{ color: p.color }}>
          {p.name}: {p.dataKey === 'margemPct' ? fmtPct(Number(p.value)) : fmtBRL0(Number(p.value))}
        </p>
      ))}
    </div>
  );
}

export function FinanceEvolutionChart({ months }: { months: FinancialMonthlyPoint[] }) {
  const chartData: EvolutionChartPoint[] = months.map((m) => {
    const isFuture = !m.isPast;
    const receita = isFuture ? m.revenuePlanned : m.revenueReal;
    const custos = isFuture ? m.plannedTotalCosts : m.totalCosts;
    return {
      label: m.label.toUpperCase(),
      faturado: Math.round(isFuture ? m.revenuePlanned : m.faturado),
      receita: Math.round(receita),
      custos: Math.round(custos),
      margemPct: (isFuture ? m.plannedGrossMarginPct : m.grossMarginPct) != null
        ? Math.round((isFuture ? m.plannedGrossMarginPct : m.grossMarginPct)!)
        : null,
      isFuture,
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
          <p className="text-xs text-muted-foreground">valores em R$ (eixo esq.) · margem % (eixo dir.) · destaque = período selecionado · hachurado = projeção</p>
        </div>
      </div>
      <div className="mt-3 h-[300px]">
        <ProjectionPatterns />
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
            <Bar yAxisId="val" dataKey="faturado" name="Faturamento" fill={FATURAMENTO} radius={[3, 3, 0, 0]} barSize={12}>
              {chartData.map((d) => (
                <Cell key={d.label} fill={d.isFuture ? 'url(#evo-stripe-faturado)' : FATURAMENTO} fillOpacity={d.isHighlighted ? 1 : DIMMED_OPACITY} />
              ))}
            </Bar>
            <Bar yAxisId="val" dataKey="receita" name="Receita" fill={RECEITA} radius={[3, 3, 0, 0]} barSize={12}>
              {chartData.map((d) => (
                <Cell key={d.label} fill={d.isFuture ? 'url(#evo-stripe-receita)' : RECEITA} fillOpacity={d.isHighlighted ? 1 : DIMMED_OPACITY} />
              ))}
            </Bar>
            <Bar yAxisId="val" dataKey="custos" name="Custos" fill={CUSTOS} radius={[3, 3, 0, 0]} barSize={12}>
              {chartData.map((d) => (
                <Cell key={d.label} fill={d.isFuture ? 'url(#evo-stripe-custos)' : CUSTOS} fillOpacity={d.isHighlighted ? 1 : DIMMED_OPACITY} />
              ))}
            </Bar>
            <Line yAxisId="pct" type="monotone" dataKey="margemPct" name="Margem %" stroke={MARGEM} strokeWidth={2} strokeDasharray="5 4" dot={projectionDot(MARGEM)} activeDot={{ r: 5 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
