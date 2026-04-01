import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  emptyLabel?: string;
}

export function ProjectMarginTable({
  byProject,
  byClient,
  byManager,
  byServiceLine,
  grossMarginTarget,
  emptyLabel = 'Sem dados no período.',
}: Props) {
  const [dimension, setDimension] = useState<Dimension>('project');

  const data: DimensionFinancialRow[] =
    dimension === 'project'
      ? byProject
      : dimension === 'client'
        ? byClient
        : dimension === 'manager'
          ? byManager
          : byServiceLine;

  const sorted = [...data].sort((a, b) => {
    if (a.grossMargin === null && b.grossMargin === null) return 0;
    if (a.grossMargin === null) return 1;
    if (b.grossMargin === null) return -1;
    return b.grossMargin - a.grossMargin;
  });

  const marginColor = (margin: number | null) => {
    if (margin === null) return 'text-muted-foreground';
    if (grossMarginTarget) {
      if (margin >= grossMarginTarget) return 'text-emerald-600 dark:text-emerald-400';
      if (margin >= grossMarginTarget * 0.5) return 'text-amber-600 dark:text-amber-400';
      return 'text-red-600 dark:text-red-400';
    }
    if (margin >= 30) return 'text-emerald-600 dark:text-emerald-400';
    if (margin >= 15) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Margem por</CardTitle>
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
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyLabel}</p>
        ) : (
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2 pr-3 font-medium">Nome</th>
                  <th className="pb-2 pr-3 font-medium text-right">Receita</th>
                  <th className="pb-2 pr-3 font-medium text-right">Custos</th>
                  <th className="pb-2 font-medium text-right">Margem</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium truncate max-w-[200px]">{row.label}</td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">{formatCurrency(row.revenue)}</td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">{formatCurrency(row.costs)}</td>
                    <td className={cn('py-2 text-right font-semibold whitespace-nowrap', marginColor(row.grossMargin))}>
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
