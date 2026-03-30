import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/formatters';

export interface DonutItem {
  label: string;
  value: number;
}

interface Props {
  data: DonutItem[];
  title: string;
  emptyLabel?: string;
}

const COLORS = [
  'hsl(220, 70%, 50%)',
  'hsl(152, 55%, 40%)',
  'hsl(38, 85%, 52%)',
  'hsl(280, 55%, 55%)',
  'hsl(0, 70%, 58%)',
  'hsl(195, 70%, 45%)',
  'hsl(30, 80%, 50%)',
  'hsl(340, 65%, 50%)',
];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium">{entry.name}</p>
      <p style={{ color: entry.payload.fill }}>{formatCurrency(entry.value)}</p>
    </div>
  );
}

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {formatPercent(percent * 100)}
    </text>
  );
}

export function DonutChart({ data, title, emptyLabel = 'Sem dados no período.' }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const items = data
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map((d, i) => ({ name: d.label, value: d.value, fill: COLORS[i % COLORS.length] }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyLabel}</p>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  cx="50%"
                  cy="50%"
                  innerRadius="45%"
                  outerRadius="70%"
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                  label={CustomLabel}
                >
                  {items.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value: string) => (
                    <span className="text-xs text-foreground">{value}</span>
                  )}
                  iconSize={10}
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
