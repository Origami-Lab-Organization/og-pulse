import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { RevenueByDimension } from '@/hooks/useRevenueAnalytics';

type Dimension = 'client' | 'manager' | 'serviceLine' | 'project';

const DIMENSION_OPTIONS: { key: Dimension; label: string }[] = [
  { key: 'client', label: 'Cliente' },
  { key: 'manager', label: 'Gerente' },
  { key: 'serviceLine', label: 'Serviço' },
];

const BAR_COLOR = 'hsl(220, 70%, 50%)';

interface Props {
  byClient: RevenueByDimension[];
  byManager: RevenueByDimension[];
  byServiceLine: RevenueByDimension[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium mb-1">{d.fullName}</p>
      <p>Receita: <span className="font-semibold">{formatCurrency(d.value)}</span></p>
    </div>
  );
}

export function RevenueRankingChart({ byClient, byManager, byServiceLine }: Props) {
  const [dimension, setDimension] = useState<Dimension>('client');

  const rawData = useMemo(() => {
    switch (dimension) {
      case 'client': return byClient;
      case 'manager': return byManager;
      case 'serviceLine': return byServiceLine;
      default: return byClient;
    }
  }, [dimension, byClient, byManager, byServiceLine]);

  const chartData = useMemo(() =>
    rawData
      .filter(d => d.received > 0)
      .sort((a, b) => b.received - a.received)
      .slice(0, 10)
      .map(d => ({
        name: d.label.length > 22 ? d.label.slice(0, 19) + '...' : d.label,
        fullName: d.label,
        value: d.received,
      })),
    [rawData],
  );

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">Ranking de Receita</CardTitle>
            <CardDescription className="text-xs">Receita recebida por dimensão</CardDescription>
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
      <CardContent className="flex-1 min-h-0">
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sem dados no período.</p>
        ) : (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                <XAxis type="number" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill={BAR_COLOR} radius={[0, 4, 4, 0]} barSize={18}>
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={BAR_COLOR} />
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
