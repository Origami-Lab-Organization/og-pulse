import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import type { FinancialMonthlyPoint } from '@/hooks/useFinancialEvolution';

interface Props {
  data: FinancialMonthlyPoint[];
  year: number;
  title?: string;
  hideFaturado?: boolean;
}

const FATURADO_COLOR = 'hsl(152, 55%, 28%)';
const REVENUE_COLOR = 'hsl(150, 60%, 55%)';
const COSTS_COLOR   = 'hsl(0, 70%, 65%)';
const MARGIN_COLOR  = 'hsl(220, 70%, 50%)';

const PATTERN_SIZE = 6;

function StripedDefs() {
  const stripes: Array<{ id: string; color: string }> = [
    { id: 'stripe-faturado', color: FATURADO_COLOR },
    { id: 'stripe-revenue',  color: REVENUE_COLOR  },
    { id: 'stripe-costs',    color: COSTS_COLOR    },
  ];
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        {stripes.map(({ id, color }) => (
          <pattern key={id} id={id} patternUnits="userSpaceOnUse" width={PATTERN_SIZE} height={PATTERN_SIZE} patternTransform="rotate(45)">
            <rect width={PATTERN_SIZE / 2} height={PATTERN_SIZE} fill={color} fillOpacity={0.75} />
            <rect x={PATTERN_SIZE / 2} width={PATTERN_SIZE / 2} height={PATTERN_SIZE} fill="transparent" />
          </pattern>
        ))}
      </defs>
    </svg>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium capitalize">{label}</p>
      {payload.map((p: any) => {
        if (p.value === null || p.value === undefined || p.value === 0) return null;
        const formatted = p.dataKey === 'effectiveMargin'
          ? `${Number(p.value).toFixed(1)}%`
          : formatCurrency(p.value);
        return (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {formatted}
          </p>
        );
      })}
    </div>
  );
}

export function FinancialEvolutionChart({ data, year, title, hideFaturado }: Props) {
  const highlighted = data.filter(d => d.isHighlighted);
  const refStart = highlighted.length > 0 ? highlighted[0].label : undefined;
  const refEnd   = highlighted.length > 0 ? highlighted[highlighted.length - 1].label : undefined;

  const chartData = data.map(m => ({
    ...m,
    effectiveFaturado: m.isPast ? m.faturado      : 0,
    effectiveRevenue:  m.isPast ? m.revenueReal    : m.revenuePlanned,
    effectiveCosts:    m.isPast ? m.totalCosts     : m.plannedTotalCosts,
    effectiveMargin:   m.isPast ? m.grossMarginPct : m.plannedGrossMarginPct,
    isFuture: !m.isPast,
  }));

  const maxVal = Math.max(
    ...chartData.map(d => Math.max(d.effectiveFaturado, d.effectiveRevenue, d.effectiveCosts)),
    1,
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title ?? 'Evolução Financeira'}</CardTitle>
      </CardHeader>
      <CardContent>
        <StripedDefs />
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 44, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="val"
                orientation="left"
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                tick={{ fontSize: 11 }}
                domain={[0, maxVal * 1.15]}
                width={48}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
                domain={[0, 100]}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {refStart && refEnd && (
                <ReferenceArea
                  yAxisId="val"
                  x1={refStart}
                  x2={refEnd}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.06}
                  stroke="hsl(var(--primary))"
                  strokeOpacity={0.2}
                  strokeWidth={1}
                />
              )}

              {!hideFaturado && (
                <Bar yAxisId="val" dataKey="effectiveFaturado" name="Faturado" fill={FATURADO_COLOR} radius={[3, 3, 0, 0]} barSize={14}>
                  {chartData.map((d) => (
                    <Cell
                      key={d.monthIndex}
                      fill={d.isFuture ? `url(#stripe-faturado)` : FATURADO_COLOR}
                      fillOpacity={d.isHighlighted ? 1 : 0.35}
                    />
                  ))}
                </Bar>
              )}

              <Bar yAxisId="val" dataKey="effectiveRevenue" name="Receita" fill={REVENUE_COLOR} radius={[3, 3, 0, 0]} barSize={14}>
                {chartData.map((d) => (
                  <Cell
                    key={d.monthIndex}
                    fill={d.isFuture ? `url(#stripe-revenue)` : REVENUE_COLOR}
                    fillOpacity={d.isHighlighted ? 1 : 0.35}
                  />
                ))}
              </Bar>

              <Bar yAxisId="val" dataKey="effectiveCosts" name="Custos Totais" fill={COSTS_COLOR} radius={[3, 3, 0, 0]} barSize={14}>
                {chartData.map((d) => (
                  <Cell
                    key={d.monthIndex}
                    fill={d.isFuture ? `url(#stripe-costs)` : COSTS_COLOR}
                    fillOpacity={d.isHighlighted ? 1 : 0.35}
                  />
                ))}
              </Bar>

              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="effectiveMargin"
                name="Margem Bruta"
                stroke={MARGIN_COLOR}
                strokeWidth={2}
                strokeDasharray="0"
                dot={(props: any) => {
                  const d = chartData[props.index];
                  return (
                    <circle
                      key={props.index}
                      cx={props.cx}
                      cy={props.cy}
                      r={3}
                      fill={MARGIN_COLOR}
                      stroke={d?.isFuture ? 'white' : MARGIN_COLOR}
                      strokeWidth={d?.isFuture ? 1.5 : 0}
                      strokeDasharray={d?.isFuture ? '2 1' : '0'}
                    />
                  );
                }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}