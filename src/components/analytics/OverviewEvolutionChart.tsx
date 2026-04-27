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
const REVENUE_COLOR = 'hsl(210, 60%, 50%)';
const COSTS_COLOR = 'hsl(0, 70%, 60%)';
const MARGIN_COLOR = 'hsl(220, 70%, 50%)';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium capitalize">{label}</p>
      {payload.map((p: any) => {
        if (p.value === null || p.value === undefined) return null;
        const formatted = p.dataKey === 'marginPct'
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
    const showProj = !m.isPast || m.isCurrent;
    return {
      label: m.label,
      faturado: m.isPast ? m.faturado : null,
      receita: m.isPast ? m.revenueReal : null,
      custos: m.isPast ? m.totalCosts : null,
      marginPct: m.isPast ? (m.grossMarginPct ?? null) : null,
      faturadoProj: showProj ? m.revenuePlanned : null,
      custosProj: showProj ? m.plannedTotalCosts : null,
      marginPctProj: showProj ? (m.plannedGrossMarginPct ?? null) : null,
      isHighlighted: m.isHighlighted,
      isPast: m.isPast,
    };
  });

  const maxVal = Math.max(
    ...chartData.map((d) => Math.max(d.faturado ?? 0, d.receita ?? 0, d.custos ?? 0, d.faturadoProj ?? 0, d.custosProj ?? 0)),
    1,
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Evolução Financeira Consolidada</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
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

              <Bar yAxisId="val" dataKey="faturado" name="Faturado" fill={FATURADO_COLOR} radius={[3, 3, 0, 0]} barSize={10}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={FATURADO_COLOR} fillOpacity={d.isHighlighted ? 1 : 0.3} />
                ))}
              </Bar>

              <Bar yAxisId="val" dataKey="faturadoProj" name="Faturado (proj.)" fill={FATURADO_COLOR} radius={[3, 3, 0, 0]} barSize={10} fillOpacity={0.4}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={FATURADO_COLOR} fillOpacity={d.isHighlighted ? 0.4 : 0.15} />
                ))}
              </Bar>

              <Bar yAxisId="val" dataKey="receita" name="Receita Recebida" fill={REVENUE_COLOR} radius={[3, 3, 0, 0]} barSize={10}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={REVENUE_COLOR} fillOpacity={d.isHighlighted ? 1 : 0.3} />
                ))}
              </Bar>

              <Bar yAxisId="val" dataKey="custos" name="Custos" fill={COSTS_COLOR} radius={[3, 3, 0, 0]} barSize={10}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={COSTS_COLOR} fillOpacity={d.isHighlighted ? 1 : 0.3} />
                ))}
              </Bar>

              <Bar yAxisId="val" dataKey="custosProj" name="Custos (proj.)" fill={COSTS_COLOR} radius={[3, 3, 0, 0]} barSize={10} fillOpacity={0.4}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={COSTS_COLOR} fillOpacity={d.isHighlighted ? 0.4 : 0.15} />
                ))}
              </Bar>

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
