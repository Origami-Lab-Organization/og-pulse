import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { DimensionFinancialRow } from '@/hooks/useProjectFinancials';

type Dimension = 'project' | 'client' | 'manager' | 'serviceLine';

const DIMENSION_OPTIONS: { key: Dimension; label: string }[] = [
  { key: 'project', label: 'Projeto' },
  { key: 'client', label: 'Cliente' },
  { key: 'manager', label: 'Gerente' },
  { key: 'serviceLine', label: 'Linha de Serviço' },
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

export function MarginDetailTable({ byProject, byClient, byManager, byServiceLine, grossMarginTarget }: Props) {
  const [dimension, setDimension] = useState<Dimension>('project');

  const data: DimensionFinancialRow[] =
    dimension === 'project' ? byProject.map((p) => ({ ...p, numProjetos: 1 }))
      : dimension === 'client' ? byClient
        : dimension === 'manager' ? byManager
          : byServiceLine;

  const sorted = [...data].sort((a, b) => {
    if (a.grossMargin === null && b.grossMargin === null) return 0;
    if (a.grossMargin === null) return 1;
    if (b.grossMargin === null) return -1;
    return b.grossMargin - a.grossMargin;
  });

  const marginColor = (margin: number | null) => {
    if (margin === null) return 'text-muted-foreground';
    const t = grossMarginTarget ?? 30;
    if (margin >= t) return 'text-emerald-600 dark:text-emerald-400';
    if (margin >= t * 0.5) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">Detalhamento de Margem</CardTitle>
            <CardDescription className="text-xs">Camada de aprofundamento após os gráficos</CardDescription>
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
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sem dados no período.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2.5 pr-3 font-medium text-xs uppercase tracking-wider">Nome</th>
                  <th className="pb-2.5 pr-3 font-medium text-xs uppercase tracking-wider text-right">Receita</th>
                  <th className="pb-2.5 pr-3 font-medium text-xs uppercase tracking-wider text-right">Custos</th>
                  <th className="pb-2.5 font-medium text-xs uppercase tracking-wider text-right">Margem</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, idx) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    <td className="py-2.5 pr-3 font-medium truncate max-w-[220px]">{row.label}</td>
                    <td className="py-2.5 pr-3 text-right whitespace-nowrap tabular-nums">{formatCurrency(row.revenue)}</td>
                    <td className="py-2.5 pr-3 text-right whitespace-nowrap tabular-nums">{formatCurrency(row.costs)}</td>
                    <td className={cn('py-2.5 text-right font-semibold whitespace-nowrap tabular-nums', marginColor(row.grossMargin))}>
                      {row.grossMargin !== null ? formatPercent(row.grossMargin) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
