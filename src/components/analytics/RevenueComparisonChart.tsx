import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import type { FinancialMonthlyPoint } from '@/hooks/useFinancialEvolution';

interface Props {
  data: FinancialMonthlyPoint[];
  year: number;
}

const PLANNED_COLOR = 'hsl(220, 15%, 70%)';
const FATURADO_COLOR = 'hsl(152, 55%, 35%)';
const RECEIVED_COLOR = 'hsl(220, 70%, 50%)';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium capitalize">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export function RevenueComparisonChart({ data, year }: Props) {
  const maxVal = Math.max(
    ...data.map(d => Math.max(d.revenuePlanned, d.faturado, d.revenueReal)),
    1,
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">NF &amp; Receita: Previsto vs Realizado — {year}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 0 }} barCategoryGap="20%" barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                tick={{ fontSize: 11 }}
                domain={[0, maxVal * 1.15]}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              <Bar dataKey="revenuePlanned" name="Previsto" fill={PLANNED_COLOR} radius={[3, 3, 0, 0]} barSize={8}>
                {data.map((d) => (
                  <Cell key={d.monthIndex} fill={PLANNED_COLOR} fillOpacity={d.isHighlighted ? 1 : 0.4} />
                ))}
              </Bar>

              <Bar dataKey="faturado" name="NF Emitida" fill={FATURADO_COLOR} radius={[3, 3, 0, 0]} barSize={8}>
                {data.map((d) => (
                  <Cell key={d.monthIndex} fill={FATURADO_COLOR} fillOpacity={d.isHighlighted ? 1 : 0.4} />
                ))}
              </Bar>

              <Bar dataKey="revenueReal" name="Receita Recebida" fill={RECEIVED_COLOR} radius={[3, 3, 0, 0]} barSize={8}>
                {data.map((d) => (
                  <Cell key={d.monthIndex} fill={RECEIVED_COLOR} fillOpacity={d.isHighlighted ? 1 : 0.4} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
