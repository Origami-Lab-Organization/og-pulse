import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';

interface ProjectItem {
  projectId: string;
  projectName: string;
  revenue: number;
  costs: number;
  grossMargin: number | null;
}

interface Props {
  byProject: ProjectItem[];
  grossMarginTarget?: number | null;
}

function getBarColor(margin: number | null, target: number, contribution: number): string {
  if (contribution < 0) return 'hsl(0, 72%, 51%)';
  if (margin === null) return 'hsl(220, 10%, 70%)';
  if (margin >= target) return 'hsl(152, 55%, 45%)';
  if (margin >= target * 0.5) return 'hsl(38, 92%, 50%)';
  return 'hsl(0, 72%, 51%)';
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium mb-1">{d.name}</p>
      <p>Contribuição: {formatCurrency(d.contribution)}</p>
      <p>Receita: {formatCurrency(d.revenue)}</p>
      <p>Custos: {formatCurrency(d.costs)}</p>
      <p>Margem: {d.margin !== null ? `${d.margin.toFixed(1)}%` : '—'}</p>
    </div>
  );
}

export function ProjectContributionChart({ byProject, grossMarginTarget }: Props) {
  const target = grossMarginTarget ?? 30;

  const data = byProject
    .map((p) => ({
      name: p.projectName.length > 22 ? p.projectName.slice(0, 20) + '…' : p.projectName,
      fullName: p.projectName,
      contribution: p.revenue - p.costs,
      revenue: p.revenue,
      costs: p.costs,
      margin: p.grossMargin,
    }))
    .sort((a, b) => b.contribution - a.contribution);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Contribuição por Projeto</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
              <XAxis type="number" tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="contribution" radius={[0, 4, 4, 0]} barSize={18}>
                {data.map((d, i) => (
                  <Cell key={i} fill={getBarColor(d.margin, target, d.contribution)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
