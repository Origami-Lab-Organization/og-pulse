import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { DimensionFinancialRow } from '@/hooks/useProjectFinancials';

type Dimension = 'project' | 'client' | 'manager' | 'serviceLine';

const DIMENSION_OPTIONS: { key: Dimension; label: string }[] = [
  { key: 'project', label: 'Projeto' },
  { key: 'client', label: 'Cliente' },
  { key: 'manager', label: 'Gerente' },
  { key: 'serviceLine', label: 'Serviço' },
];

interface ProjectRow {
  id: string;
  label: string;
  revenue: number;
  costs: number;
  grossMargin: number | null;
}

interface Props {
  byProject: ProjectRow[];
  byClient: DimensionFinancialRow[];
  byManager: DimensionFinancialRow[];
  byServiceLine: DimensionFinancialRow[];
  grossMarginTarget?: number | null;
}

function getBarColor(margin: number | null, target?: number | null): string {
  if (margin === null) return 'hsl(var(--muted-foreground))';
  const t = target ?? 30;
  if (margin >= t) return 'hsl(152, 55%, 40%)';
  if (margin >= t * 0.5) return 'hsl(38, 85%, 52%)';
  return 'hsl(0, 70%, 58%)';
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium mb-1">{d.name}</p>
      <p>Margem: <span className="font-semibold">{d.margin !== null ? formatPercent(d.margin) : '—'}</span></p>
    </div>
  );
}

export function MarginRankingChart({ byProject, byClient, byManager, byServiceLine, grossMarginTarget }: Props) {
  const [dimension, setDimension] = useState<Dimension>('project');

  const rawData: DimensionFinancialRow[] = useMemo(() => {
    switch (dimension) {
      case 'project': return byProject.map((p) => ({ ...p, numProjetos: 1 }));
      case 'client': return byClient;
      case 'manager': return byManager;
      case 'serviceLine': return byServiceLine;
    }
  }, [dimension, byProject, byClient, byManager, byServiceLine]);

  const chartData = useMemo(() => {
    return rawData
      .filter(d => d.grossMargin !== null)
      .sort((a, b) => (b.grossMargin ?? 0) - (a.grossMargin ?? 0))
      .slice(0, 12)
      .map(d => ({
        name: d.label.length > 25 ? d.label.slice(0, 22) + '...' : d.label,
        fullName: d.label,
        margin: d.grossMargin,
        fill: getBarColor(d.grossMargin, grossMarginTarget),
      }));
  }, [rawData, grossMarginTarget]);

  const barHeight = Math.max(chartData.length * 36, 120);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">Ranking de Margem</CardTitle>
            <CardDescription className="text-xs">Ordenado por margem bruta</CardDescription>
          </div>
          <div className="flex rounded-md border text-xs overflow-hidden">
            {DIMENSION_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                className={cn(
                  'px-2.5 py-1 transition-colors',
                  key !== 'project' && 'border-l',
                  dimension === key
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted',
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
              <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }}>
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                {grossMarginTarget && (
                  <ReferenceLine x={grossMarginTarget} stroke="hsl(var(--foreground))" strokeDasharray="4 4" strokeOpacity={0.4} label={{ value: 'Meta', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                )}
                <Bar dataKey="margin" radius={[0, 4, 4, 0]} barSize={16}>
                  {chartData.map((entry, idx) => (
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
