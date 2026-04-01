import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { DimensionFinancialRow } from '@/hooks/useProjectFinancials';

type Dimension = 'client' | 'manager' | 'serviceLine';

const DIMENSION_OPTIONS: { key: Dimension; label: string }[] = [
  { key: 'client', label: 'Cliente' },
  { key: 'manager', label: 'Gerente' },
  { key: 'serviceLine', label: 'Serviço' },
];

const COLORS = [
  'hsl(152, 55%, 40%)',
  'hsl(220, 70%, 50%)',
  'hsl(38, 85%, 52%)',
  'hsl(280, 55%, 55%)',
  'hsl(0, 70%, 58%)',
  'hsl(195, 70%, 45%)',
  'hsl(30, 80%, 50%)',
  'hsl(340, 65%, 50%)',
];

interface Props {
  byClient: DimensionFinancialRow[];
  byManager: DimensionFinancialRow[];
  byServiceLine: DimensionFinancialRow[];
}

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: entry.payload.fill }} />
        <span className="text-muted-foreground">{entry.name}</span>
        <span className="font-mono font-medium tabular-nums">{formatCurrency(entry.value)}</span>
      </div>
    </div>
  );
}

function SliceLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
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

export function RevenueCompositionDonut({ byClient, byManager, byServiceLine }: Props) {
  const [dimension, setDimension] = useState<Dimension>('client');

  const rawData = useMemo(() => {
    switch (dimension) {
      case 'client': return byClient;
      case 'manager': return byManager;
      case 'serviceLine': return byServiceLine;
    }
  }, [dimension, byClient, byManager, byServiceLine]);

  const items = useMemo(() =>
    rawData
      .filter(d => d.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map((d, i) => ({ name: d.label, value: d.revenue, fill: COLORS[i % COLORS.length] })),
    [rawData],
  );

  const total = useMemo(() => items.reduce((s, i) => s + i.value, 0), [items]);

  const chartConfig = useMemo(
    () => items.reduce((acc, item) => { acc[item.name] = { label: item.name, color: item.fill }; return acc; }, {} as ChartConfig),
    [items],
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">Composição da Receita</CardTitle>
            <CardDescription className="text-xs">Concentração e dependência</CardDescription>
          </div>
          <div className="flex rounded-md border text-xs overflow-hidden">
            {DIMENSION_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                className={cn(
                  'px-2.5 py-1 transition-colors',
                  key !== 'client' && 'border-l',
                  dimension === key ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                )}
                onClick={() => setDimension(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sem dados no período.</p>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <PieChart>
                <Pie
                  data={items}
                  cx="50%"
                  cy="50%"
                  innerRadius="42%"
                  outerRadius="72%"
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                  label={SliceLabel}
                >
                  {items.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<DonutTooltip />} />
                {/* Center total */}
                <text x="50%" y="48%" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-sm font-semibold">
                  {formatCurrency(total)}
                </text>
                <text x="50%" y="55%" textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground text-[10px]">
                  Total
                </text>
              </PieChart>
            </ChartContainer>
            <div className="mt-3 grid grid-cols-1 gap-1.5">
              {items.map((item, i) => {
                const pct = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.fill }} />
                      <span className="truncate text-muted-foreground">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 tabular-nums">
                      <span className="text-muted-foreground">{formatPercent(pct)}</span>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
