import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { fmtBRL0, fmtPct } from './financeUtils';
import type { FinancialMonthlyPoint } from '@/hooks/useFinancialEvolution';

const FATURAMENTO = 'hsl(var(--muted-foreground))';
const RECEITA = 'hsl(var(--success))';
const CUSTOS = 'hsl(var(--destructive))';
const MARGEM = 'hsl(var(--warning))';

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-dropdown">
      <p className="mb-1 font-medium uppercase">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="font-mono tabular-nums" style={{ color: p.color }}>
          {p.name}: {p.dataKey === 'grossMarginPct' ? fmtPct(Number(p.value)) : fmtBRL0(Number(p.value))}
        </p>
      ))}
    </div>
  );
}

export function FinanceEvolutionChart({ months }: { months: FinancialMonthlyPoint[] }) {
  const chartData = months.map((m) => ({
    label: m.label.toUpperCase(),
    faturado: Math.round(m.faturado),
    revenueReal: Math.round(m.revenueReal),
    totalCosts: Math.round(m.totalCosts),
    grossMarginPct: m.grossMarginPct != null ? Math.round(m.grossMarginPct) : null,
  }));

  return (
    <section className="rounded-lg border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Evolução financeira</h2>
          <p className="text-xs text-muted-foreground">valores em R$ (eixo esq.) · margem % (eixo dir.)</p>
        </div>
      </div>
      <div className="mt-3 h-[300px]">
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
            <Bar yAxisId="val" dataKey="faturado" name="Faturamento" fill={FATURAMENTO} radius={[3, 3, 0, 0]} barSize={12} />
            <Bar yAxisId="val" dataKey="revenueReal" name="Receita" fill={RECEITA} radius={[3, 3, 0, 0]} barSize={12} />
            <Bar yAxisId="val" dataKey="totalCosts" name="Custos" fill={CUSTOS} radius={[3, 3, 0, 0]} barSize={12} />
            <Line yAxisId="pct" type="monotone" dataKey="grossMarginPct" name="Margem %" stroke={MARGEM} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
