import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ProjectFinancialRow, DimensionFinancialRow } from '@/hooks/useProjectFinancials';

type Dimension = 'project' | 'client' | 'manager' | 'serviceLine';

const DIMENSION_OPTIONS: { key: Dimension; label: string }[] = [
  { key: 'project', label: 'Projeto' },
  { key: 'client', label: 'Cliente' },
  { key: 'manager', label: 'Gerente' },
  { key: 'serviceLine', label: 'Serviço' },
];

interface Props {
  byProject: ProjectFinancialRow[];
  byClient: DimensionFinancialRow[];
  byManager: DimensionFinancialRow[];
  byServiceLine: DimensionFinancialRow[];
  plannedCosts: number;
}

function getStatus(costs: number, revenue: number) {
  if (revenue <= 0) return { label: 'Sem receita', variant: 'outline' as const };
  const ratio = costs / revenue;
  if (ratio <= 0.6) return { label: 'Controlado', variant: 'default' as const };
  if (ratio <= 0.85) return { label: 'Em linha', variant: 'secondary' as const };
  return { label: 'Atenção', variant: 'destructive' as const };
}

export function CostDetailTable({ byProject, byClient, byManager, byServiceLine, plannedCosts }: Props) {
  const [dimension, setDimension] = useState<Dimension>('project');

  const rows = useMemo(() => {
    let data: { label: string; costs: number; revenue: number }[];
    switch (dimension) {
      case 'project':
        data = byProject.map(d => ({ label: d.projectName, costs: d.costs, revenue: d.revenue }));
        break;
      case 'client':
        data = byClient.map(d => ({ label: d.label, costs: d.costs, revenue: d.revenue }));
        break;
      case 'manager':
        data = byManager.map(d => ({ label: d.label, costs: d.costs, revenue: d.revenue }));
        break;
      case 'serviceLine':
        data = byServiceLine.map(d => ({ label: d.label, costs: d.costs, revenue: d.revenue }));
        break;
    }
    return data
      .filter(d => d.costs > 0)
      .sort((a, b) => b.costs - a.costs);
  }, [dimension, byProject, byClient, byManager, byServiceLine]);

  const totalCosts = rows.reduce((s, r) => s + r.costs, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base">Detalhamento de Custos</CardTitle>
            <CardDescription className="text-xs">Camada de aprofundamento por dimensão</CardDescription>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{DIMENSION_OPTIONS.find(d => d.key === dimension)?.label}</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">% do Total</TableHead>
              <TableHead className="text-right">Receita</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const pct = totalCosts > 0 ? (row.costs / totalCosts) * 100 : 0;
              const status = getStatus(row.costs, row.revenue);
              return (
                <TableRow key={row.label}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.costs)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{formatPercent(pct)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(row.revenue)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
