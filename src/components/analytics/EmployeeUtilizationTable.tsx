import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatPercent } from '@/lib/formatters';
import { EmployeeUtilization } from '@/hooks/useAnalyticsData';

interface EmployeeUtilizationTableProps {
  data: EmployeeUtilization[];
}

const statusConfig: Record<EmployeeUtilization['status'], { label: string; variant: 'destructive' | 'default' | 'secondary' | 'outline' }> = {
  overallocated: { label: 'Sobrealocado', variant: 'destructive' },
  adequate: { label: 'Adequado', variant: 'default' },
  underallocated: { label: 'Subalocado', variant: 'secondary' },
  idle: { label: 'Ocioso', variant: 'outline' },
};

export function EmployeeUtilizationTable({ data }: EmployeeUtilizationTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Utilização de Funcionários</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem funcionários alocados no período.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Utilização de Funcionários</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-right">Jornada Diária</TableHead>
              <TableHead className="text-right">Capacidade (h)</TableHead>
              <TableHead className="text-right">Horas Alocadas</TableHead>
              <TableHead className="text-right">Utilização</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const cfg = statusConfig[row.status];
              return (
                <TableRow key={row.employeeId}>
                  <TableCell className="font-medium">{row.employeeName}</TableCell>
                  <TableCell>{row.cargo}</TableCell>
                  <TableCell className="text-right">{row.jornadaDiaria}h</TableCell>
                  <TableCell className="text-right">{row.capacity}h</TableCell>
                  <TableCell className="text-right">{row.allocatedHours.toFixed(1)}h</TableCell>
                  <TableCell className="text-right">{formatPercent(row.utilization)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
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
