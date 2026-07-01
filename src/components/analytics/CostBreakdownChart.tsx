import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import type { FinancialMonthlyPoint } from '@/hooks/useFinancialEvolution';

interface Props {
  data: FinancialMonthlyPoint[];
  year: number;
}

const LABOR_COLOR = 'hsl(var(--chart-2))';
const SUPPLIER_COLOR = 'hsl(var(--chart-3))';
const MATERIAL_COLOR = 'hsl(var(--chart-4))';
const COMMISSION_COLOR = 'hsl(var(--chart-5))';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0);
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium capitalize">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
      <p className="mt-1 border-t pt-1 font-medium">Total: {formatCurrency(total)}</p>
    </div>
  );
}

const PLANNED_COLOR = 'hsl(220, 60%, 50%)';

export function CostBreakdownChart({ data, year }: Props) {
  const maxVal = Math.max(...data.map(d => Math.max(d.totalCosts, d.plannedTotalCosts)), 1);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Composição de Custos vs Custo Previsto</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
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

              <Bar dataKey="laborCost" name="Mão de Obra" stackId="costs" fill={LABOR_COLOR} radius={[0, 0, 0, 0]}>
                {data.map((d) => (
                  <Cell key={d.monthIndex} fill={LABOR_COLOR} fillOpacity={d.isHighlighted ? 1 : 0.35} />
                ))}
              </Bar>

              <Bar dataKey="supplierCost" name="Fornecedores" stackId="costs" fill={SUPPLIER_COLOR}>
                {data.map((d) => (
                  <Cell key={d.monthIndex} fill={SUPPLIER_COLOR} fillOpacity={d.isHighlighted ? 1 : 0.35} />
                ))}
              </Bar>

              <Bar dataKey="materialCost" name="Materiais" stackId="costs" fill={MATERIAL_COLOR}>
                {data.map((d) => (
                  <Cell key={d.monthIndex} fill={MATERIAL_COLOR} fillOpacity={d.isHighlighted ? 1 : 0.35} />
                ))}
              </Bar>

              <Bar dataKey="commissionCost" name="Comissões" stackId="costs" fill={COMMISSION_COLOR} radius={[3, 3, 0, 0]}>
                {data.map((d) => (
                  <Cell key={d.monthIndex} fill={COMMISSION_COLOR} fillOpacity={d.isHighlighted ? 1 : 0.35} />
                ))}
              </Bar>

              <Line
                type="monotone"
                dataKey="plannedTotalCosts"
                name="Custo Previsto"
                stroke={PLANNED_COLOR}
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={{ r: 2, fill: PLANNED_COLOR }}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
