import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';

export interface RankingItem {
  label: string;
  value: number;
}

interface Props {
  data: RankingItem[];
  title: string;
  color?: string;
  formatValue?: (v: number) => string;
  maxItems?: number;
  emptyLabel?: string;
}

function CustomTooltip({ active, payload, label, formatValue }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <p style={{ color: payload[0].fill }}>{formatValue(payload[0].value)}</p>
    </div>
  );
}

export function RankingBarChart({
  data,
  title,
  color = 'hsl(220, 70%, 50%)',
  formatValue = formatCurrency,
  maxItems = 8,
  emptyLabel = 'Sem dados no período.',
}: Props) {
  const items = data.slice(0, maxItems);
  const barHeight = 28;
  const chartHeight = Math.max(items.length * barHeight + 20, 80);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyLabel}</p>
        ) : (
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={items} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  width={110}
                  tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 15) + '…' : v}
                />
                <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={18}>
                  {items.map((_, idx) => (
                    <Cell key={idx} fill={color} fillOpacity={1 - idx * 0.08} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
