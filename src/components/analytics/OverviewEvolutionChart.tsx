import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import type { FinancialMonthlyPoint } from '@/hooks/useFinancialEvolution';

interface Props {
  data: (FinancialMonthlyPoint & { isHighlighted?: boolean })[];
  year: number;
}

const FATURADO_COLOR = 'hsl(152, 55%, 28%)';
const REVENUE_COLOR = 'hsl(152, 55%, 55%)';
const COSTS_COLOR = 'hsl(0, 70%, 60%)';
const MARGIN_COLOR = 'hsl(210, 70%, 50%)';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium capitalize">{label}</p>
      {payload.map((p: any) => {
        if (p.value === null || p.value === undefined || p.value === 0) return null;
        const formatted = p.dataKey === 'marginPct' || p.dataKey === 'marginPctProj'
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

export function OverviewEvolutionChart({ data, year }: Props) {
  const chartData = data.map((m) => {
    const faturadoReal = m.isPast ? m.faturado : null;
    const faturadoRem = m.isCurrent
      ? Math.max(0, m.revenuePlanned - m.faturado)
      : !m.isPast
        ? m.revenuePlanned
        : null;

    const custosReal = m.isPast ? m.totalCosts : null;
    const custosRem = m.isCurrent
      ? Math.max(0, m.plannedTotalCosts - m.totalCosts)
      : !m.isPast
        ? m.plannedTotalCosts
        : null;

    return {
      label: m.label,
      faturadoReal,
      faturadoRem,
      receitaReal: m.isPast ? m.revenueReal : null,
      custosReal,
      custosRem,
      marginPct: m.isPast ? (m.grossMarginPct ?? null) : null,
      marginPctProj: (!m.isPast || m.isCurrent) ? (m.plannedGrossMarginPct ?? null) : null,
      isHighlighted: m.isHighlighted,
      isPast: m.isPast,
    };
  });

  const maxVal = Math.max(
    ...chartData.map((d) =>
      Math.max(
        (d.faturadoReal ?? 0) + (d.faturadoRem ?? 0),
        d.receitaReal ?? 0,
        (d.custosReal ?? 0) + (d.custosRem ?? 0),
      ),
    ),
    1,
  );

  const opacity = (d: typeof chartData[number]) => d.isHighlighted ? 1 : 0.3;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Evolução Financeira Consolidada</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {/* SVG pattern defs for hatched projected bars */}
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <pattern id="hatch-faturado" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="5" stroke={FATURADO_COLOR} strokeWidth="2.5" />
            </pattern>
            <pattern id="hatch-receita" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="5" stroke={REVENUE_COLOR} strokeWidth="2.5" />
            </pattern>
            <pattern id="hatch-custos" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="5" stroke={COSTS_COLOR} strokeWidth="2.5" />
            </pattern>
          </defs>
        </svg>

        <div className="h-[320px]">
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

              {/* Faturado: solid (realized) + hatched (planned remainder) stacked */}
              <Bar yAxisId="val" dataKey="faturadoReal" name="Faturado" stackId="fat" fill={FATURADO_COLOR} radius={[0, 0, 0, 0]} barSize={12}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={FATURADO_COLOR} fillOpacity={opacity(d)} />
                ))}
              </Bar>
              <Bar yAxisId="val" dataKey="faturadoRem" name="Faturado (proj.)" stackId="fat" fill="url(#hatch-faturado)" radius={[3, 3, 0, 0]} barSize={12}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill="url(#hatch-faturado)" fillOpacity={opacity(d)} />
                ))}
              </Bar>

              {/* Receita Recebida: realized only */}
              <Bar yAxisId="val" dataKey="receitaReal" name="Receita Recebida" fill={REVENUE_COLOR} radius={[3, 3, 0, 0]} barSize={12}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={REVENUE_COLOR} fillOpacity={opacity(d)} />
                ))}
              </Bar>

              {/* Custos: solid (realized) + hatched (planned remainder) stacked */}
              <Bar yAxisId="val" dataKey="custosReal" name="Custos" stackId="cus" fill={COSTS_COLOR} radius={[0, 0, 0, 0]} barSize={12}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={COSTS_COLOR} fillOpacity={opacity(d)} />
                ))}
              </Bar>
              <Bar yAxisId="val" dataKey="custosRem" name="Custos (proj.)" stackId="cus" fill="url(#hatch-custos)" radius={[3, 3, 0, 0]} barSize={12}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill="url(#hatch-custos)" fillOpacity={opacity(d)} />
                ))}
              </Bar>

              {/* Margin lines */}
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="marginPct"
                name="Margem Bruta"
                stroke={MARGIN_COLOR}
                strokeWidth={2}
                dot={{ r: 3, fill: MARGIN_COLOR }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="marginPctProj"
                name="Margem (proj.)"
                stroke={MARGIN_COLOR}
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={{ r: 3, fill: MARGIN_COLOR, fillOpacity: 0.5 }}
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
