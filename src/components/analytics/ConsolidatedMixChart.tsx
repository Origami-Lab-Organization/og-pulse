import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/formatters';

interface Props {
  faturado: number;
  revenueActual: number;
  totalCosts: number;
  grossMargin: number;
}

const COLORS = [
  'hsl(152, 55%, 35%)',
  'hsl(210, 60%, 50%)',
  'hsl(0, 70%, 60%)',
  'hsl(220, 70%, 50%)',
];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p style={{ color: d.payload.fill }}>{d.name}: {formatCurrency(d.value)}</p>
    </div>
  );
}

export function ConsolidatedMixChart({ faturado, revenueActual, totalCosts, grossMargin }: Props) {
  const marginValue = revenueActual - totalCosts;

  const data = [
    { name: 'Faturamento', value: faturado, pct: 100 },
    { name: 'Receita Recebida', value: revenueActual, pct: faturado > 0 ? (revenueActual / faturado) * 100 : 0 },
    { name: 'Custos', value: totalCosts, pct: faturado > 0 ? (totalCosts / faturado) * 100 : 0 },
    { name: 'Margem', value: Math.max(marginValue, 0), pct: grossMargin },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Leitura Consolidada</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius="40%"
                outerRadius="70%"
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-bold">{formatPercent(grossMargin)}</span>
            <span className="text-[10px] text-muted-foreground">margem</span>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {data.map((item, i) => (
            <div key={item.name} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatCurrency(item.value)} · {item.pct.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
