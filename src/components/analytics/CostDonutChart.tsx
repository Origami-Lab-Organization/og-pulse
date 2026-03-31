import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/formatters';

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

type FilterType = 'project' | 'client' | 'manager' | 'serviceLine';

interface DataItem {
  label: string;
  value: number;
}

interface Props {
  byProject: DataItem[];
  byClient: DataItem[];
  byManager: DataItem[];
  byServiceLine: DataItem[];
}

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'project', label: 'Projeto' },
  { value: 'client', label: 'Cliente' },
  { value: 'manager', label: 'Gerente' },
  { value: 'serviceLine', label: 'Linha de Serviço' },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      <p style={{ color: payload[0].fill }}>{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export function CostDonutChart({ byProject, byClient, byManager, byServiceLine }: Props) {
  const [filter, setFilter] = useState<FilterType>('project');

  const dataMap: Record<FilterType, DataItem[]> = {
    project: byProject,
    client: byClient,
    manager: byManager,
    serviceLine: byServiceLine,
  };

  const items = dataMap[filter]
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((d, i) => ({ label: d.label, value: d.value, fill: COLORS[i % COLORS.length] }));

  const maxLabelLen = Math.max(...items.map(d => d.label.length), 1);
  const labelWidth = Math.min(Math.max(maxLabelLen * 7, 80), 180);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Distribuição de Custos</CardTitle>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList className="h-8">
              {FILTERS.map(f => (
                <TabsTrigger key={f.value} value={f.value} className="text-xs px-3 h-7">
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Sem dados no período.</p>
        ) : (
          <div style={{ height: Math.max(items.length * 36 + 20, 120) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={items} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={labelWidth}
                  tickFormatter={(v: string) => v.length > 22 ? v.slice(0, 21) + '…' : v}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                  {items.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
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
