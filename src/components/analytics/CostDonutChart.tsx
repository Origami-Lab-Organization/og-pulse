import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatPercent } from '@/lib/formatters';

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

export function CostDonutChart({ byProject, byClient, byManager, byServiceLine }: Props) {
  const [filter, setFilter] = useState<FilterType>('project');

  const dataMap: Record<FilterType, DataItem[]> = {
    project: byProject,
    client: byClient,
    manager: byManager,
    serviceLine: byServiceLine,
  };

  const rawData = dataMap[filter];
  const items = rawData
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
    .map((d, i) => ({ name: d.label, value: d.value, fill: COLORS[i % COLORS.length] }));

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
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  cx="50%"
                  cy="50%"
                  innerRadius="40%"
                  outerRadius="65%"
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
