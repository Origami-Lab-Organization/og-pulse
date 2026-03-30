import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import type { MonthlyPoint } from '@/hooks/useYearlyEvolution';

interface Props {
  data: MonthlyPoint[];
  year: number;
}

const LABOR_COLOR = 'hsl(var(--chart-1))';
const SUPPLIER_COLOR = 'hsl(var(--chart-3))';
const MATERIAL_COLOR = 'hsl(var(--chart-5))';
const TAXES_COLOR = 'hsl(var(--chart-4))';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium capitalize">{label}</p>
      {payload.map((p: any) => {
        if (p.value === null || p.value === undefined || p.value === 0) return null;
        return (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {formatCurrency(p.value)}
          </p>
        );
      })}
    </div>
  );
}

export function YearlyCostsChart({ data, year }: Props) {
  const highlighted = data.filter(d => d.isHighlighted);
  const refStart = highlighted.length > 0 ? highlighted[0].label : undefined;
  const refEnd = highlighted.length > 0 ? highlighted[highlighted.length - 1].label : undefined;

  const maxVal = Math.max(
    ...data.map(d => d.laborCost + d.supplierCost + d.materialCost),
    ...data.map(d => d.taxesValue),
    1,
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Custos e Impostos — {year}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="cost"
                orientation="left"
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                tick={{ fontSize: 11 }}
                domain={[0, maxVal * 1.15]}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />

              {refStart && refEnd && (
                <ReferenceArea
                  yAxisId="cost"
                  x1={refStart}
                  x2={refEnd}
                  fill="hsl(var(--primary))"
                  fillOpacity={0.06}
                  stroke="hsl(var(--primary))"
                  strokeOpacity={0.2}
                  strokeWidth={1}
                />
              )}

              <Bar yAxisId="cost" dataKey="laborCost" name="Mão de Obra" stackId="costs" fill={LABOR_COLOR} radius={[0, 0, 0, 0]} barSize={18}>
                {data.map((d) => (
                  <Cell key={d.monthIndex} fill={LABOR_COLOR} fillOpacity={d.isHighlighted ? 1 : 0.35} />
                ))}
              </Bar>

              <Bar yAxisId="cost" dataKey="supplierCost" name="Fornecedores" stackId="costs" fill={SUPPLIER_COLOR} radius={[0, 0, 0, 0]} barSize={18}>
                {data.map((d) => (
                  <Cell key={d.monthIndex} fill={SUPPLIER_COLOR} fillOpacity={d.isHighlighted ? 1 : 0.35} />
                ))}
              </Bar>

              <Bar yAxisId="cost" dataKey="materialCost" name="Materiais" stackId="costs" fill={MATERIAL_COLOR} radius={[3, 3, 0, 0]} barSize={18}>
                {data.map((d) => (
                  <Cell key={d.monthIndex} fill={MATERIAL_COLOR} fillOpacity={d.isHighlighted ? 1 : 0.35} />
                ))}
              </Bar>

              <Line
                yAxisId="cost"
                type="monotone"
                dataKey="taxesValue"
                name="Impostos"
                stroke={TAXES_COLOR}
                strokeWidth={2}
                dot={{ r: 3, fill: TAXES_COLOR }}
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
