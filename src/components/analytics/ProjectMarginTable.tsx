import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { DimensionFinancialRow } from '@/hooks/useProjectFinancials';

interface Props {
  data: DimensionFinancialRow[];
  title: string;
  grossMarginTarget?: number | null;
  emptyLabel?: string;
}

export function ProjectMarginTable({ data, title, grossMarginTarget, emptyLabel = 'Sem dados no período.' }: Props) {
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
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{emptyLabel}</p>
        ) : (
          <div className="overflow-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2 pr-3 font-medium">Nome</th>
                  <th className="pb-2 pr-3 font-medium text-right">Receita</th>
                  <th className="pb-2 pr-3 font-medium text-right">Custos</th>
                  <th className="pb-2 pr-3 font-medium text-right">Impostos</th>
                  <th className="pb-2 font-medium text-right">Margem</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, idx) => (
                  <tr key={idx} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium truncate max-w-[160px]">{row.label}</td>
                    <td className="py-2 pr-3 text-right">{formatCurrency(row.revenue)}</td>
                    <td className="py-2 pr-3 text-right">{formatCurrency(row.costs)}</td>
                    <td className="py-2 pr-3 text-right">{formatCurrency(row.taxes)}</td>
                    <td className={cn('py-2 text-right font-semibold', marginColor(row.grossMargin))}>
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
