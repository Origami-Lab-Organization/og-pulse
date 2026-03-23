import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { CostByProject } from '@/hooks/useAnalyticsData';

interface CostByProjectTableProps {
  data: CostByProject[];
}

export function CostByProjectTable({ data }: CostByProjectTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custos por Projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem dados de custos no período.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totals = data.reduce(
    (acc, row) => ({
      labor: acc.labor + row.laborCost,
      supplier: acc.supplier + row.supplierCost,
      material: acc.material + row.materialCost,
      total: acc.total + row.totalCost,
    }),
    { labor: 0, supplier: 0, material: 0, total: 0 }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Custos por Projeto</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Projeto</TableHead>
              <TableHead className="text-right">Mão de Obra</TableHead>
              <TableHead className="text-right">Fornecedores</TableHead>
              <TableHead className="text-right">Materiais</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">% do Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.projectId}>
                <TableCell className="font-medium">{row.projectName}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.laborCost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.supplierCost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.materialCost)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(row.totalCost)}</TableCell>
                <TableCell className="text-right">
                  {totals.total > 0 ? formatPercent((row.totalCost / totals.total) * 100) : '—'}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-2 font-bold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{formatCurrency(totals.labor)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totals.supplier)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totals.material)}</TableCell>
              <TableCell className="text-right">{formatCurrency(totals.total)}</TableCell>
              <TableCell className="text-right">100%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
