import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface ProjectRow {
  projectId: string;
  projectName: string;
  revenue: number;
  costs: number;
  grossMargin: number | null;
}

interface DimensionRow {
  label: string;
  revenue: number;
  costs: number;
  grossMargin: number | null;
}

interface Props {
  byProject: ProjectRow[];
  byClient: DimensionRow[];
  byManager: DimensionRow[];
  byServiceLine: DimensionRow[];
  faturadoByProject?: { projectId: string; faturado: number }[];
}

type Dimension = 'project' | 'client' | 'manager' | 'serviceLine';

const DIMENSION_OPTIONS: { value: Dimension; label: string }[] = [
  { value: 'project', label: 'Projeto' },
  { value: 'client', label: 'Cliente' },
  { value: 'manager', label: 'Gerente' },
  { value: 'serviceLine', label: 'Linha de Serviço' },
];

function MarginBadge({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-xs text-muted-foreground">—</span>;
  const color = margin >= 40
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    : margin >= 15
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return (
    <span className={cn('px-2 py-0.5 text-xs font-semibold rounded-full', color)}>
      {formatPercent(margin)}
    </span>
  );
}

export function OverviewPerformanceTable({ byProject, byClient, byManager, byServiceLine }: Props) {
  const [dimension, setDimension] = useState<Dimension>('project');

  const rows: { label: string; revenue: number; costs: number; margin: number | null }[] = (() => {
    switch (dimension) {
      case 'client':
        return byClient.map(r => ({ label: r.label, revenue: r.revenue, costs: r.costs, margin: r.grossMargin }));
      case 'manager':
        return byManager.map(r => ({ label: r.label, revenue: r.revenue, costs: r.costs, margin: r.grossMargin }));
      case 'serviceLine':
        return byServiceLine.map(r => ({ label: r.label, revenue: r.revenue, costs: r.costs, margin: r.grossMargin }));
      default:
        return byProject.map(p => ({ label: p.projectName, revenue: p.revenue, costs: p.costs, margin: p.grossMargin }));
    }
  })();

  const sorted = [...rows].sort((a, b) => b.revenue - a.revenue);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Performance Consolidada</CardTitle>
          <div className="flex gap-1">
            {DIMENSION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDimension(opt.value)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                  dimension === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>{dimension === 'project' ? 'Projeto' : dimension === 'client' ? 'Cliente' : dimension === 'manager' ? 'Gerente' : 'Linha de Serviço'}</TableHead>
              <TableHead className="text-right">Recebido</TableHead>
              <TableHead className="text-right">Custos</TableHead>
              <TableHead className="text-right">Margem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.costs)}</TableCell>
                <TableCell className="text-right"><MarginBadge margin={row.margin} /></TableCell>
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum dado disponível
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
