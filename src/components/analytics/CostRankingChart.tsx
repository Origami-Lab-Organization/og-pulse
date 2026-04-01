import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ProjectFinancialRow, DimensionFinancialRow } from '@/hooks/useProjectFinancials';

type Dimension = 'project' | 'client' | 'manager' | 'serviceLine';

const DIMENSION_OPTIONS: { key: Dimension; label: string }[] = [
  { key: 'project', label: 'Projeto' },
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
  byProject: ProjectFinancialRow[];
  byClient: DimensionFinancialRow[];
  byManager: DimensionFinancialRow[];
  byServiceLine: DimensionFinancialRow[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium mb-1">{d.fullName}</p>
      <p>Custo: <span className="font-semibold">{formatCurrency(d.value)}</span></p>
    </div>
  );
}

export function CostRankingChart({ byProject, byClient, byManager, byServiceLine }: Props) {
  const [dimension, setDimension] = useState<Dimension>('project');

  const chartData = useMemo(() => {
    let raw: { label: string; costs: number }[];
    switch (dimension) {
      case 'project':
        raw = byProject.map(d => ({ label: d.projectName, costs: d.costs }));
        break;
      case 'client':
        raw = byClient.map(d => ({ label: d.label, costs: d.costs }));
        break;
      case 'manager':
        raw = byManager.map(d => ({ label: d.label, costs: d.costs }));
        break;
      case 'serviceLine':
        raw = byServiceLine.map(d => ({ label: d.label, costs: d.costs }));
        break;
    }
    return raw
      .filter(d => d.costs > 0)
      .sort((a, b) => b.costs - a.costs)
      .slice(0, 10)
      .map((d, i) => ({
        name: d.label.length > 22 ? d.label.slice(0, 19) + '...' : d.label,
        fullName: d.label,
        value: d.costs,
        fill: COLORS[i % COLORS.length],
      }));
  }, [dimension, byProject, byClient, byManager, byServiceLine]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">Ranking de Custos</CardTitle>
            <CardDescription className="text-xs">Onde o dinheiro está sendo consumido</CardDescription>
          </div>
          <div className="flex rounded-md border text-xs overflow-hidden">
            {DIMENSION_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                className={cn(
                  'px-2.5 py-1 transition-colors',
                  key !== 'project' && 'border-l',
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
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
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
