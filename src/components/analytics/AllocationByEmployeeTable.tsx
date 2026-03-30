import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatPercent } from '@/lib/formatters';
import type { AllocationEmployee } from '@/hooks/useAllocationAnalytics';

interface AllocationByEmployeeTableProps {
  employees: AllocationEmployee[];
}

const statusConfig: Record<AllocationEmployee['status'], { label: string; className: string }> = {
  overallocated: { label: 'Sobrealocado', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  adequate: { label: 'Adequado', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  underallocated: { label: 'Subalocado', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  idle: { label: 'Ocioso', className: 'bg-muted text-muted-foreground' },
};

export function AllocationByEmployeeTable({ employees }: AllocationByEmployeeTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (employees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alocação por Colaborador</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem colaboradores alocados no período.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alocação por Colaborador</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead className="text-right">Planejado (h)</TableHead>
              <TableHead className="text-right">Realizado (h)</TableHead>
              <TableHead className="text-right">Execução</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => {
              const cfg = statusConfig[emp.status];
              const isExpanded = expandedIds.has(emp.employeeId);
              const hasProjects = emp.projects.length > 1;

              return (
                <>
                  <TableRow
                    key={emp.employeeId}
                    className={hasProjects ? 'cursor-pointer hover:bg-muted/50' : ''}
                    onClick={hasProjects ? () => toggleExpand(emp.employeeId) : undefined}
                  >
                    <TableCell className="w-8 px-2">
                      {hasProjects && (
                        isExpanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{emp.employeeName}</TableCell>
                    <TableCell>{emp.cargo}</TableCell>
                    <TableCell className="text-right">{emp.plannedHours.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{emp.actualHours.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{formatPercent(emp.executionPercent)}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={cfg.className}>{cfg.label}</Badge>
                    </TableCell>
                  </TableRow>
                  {isExpanded && emp.projects.map((proj) => (
                    <TableRow key={`${emp.employeeId}-${proj.projectId}`} className="bg-muted/30">
                      <TableCell></TableCell>
                      <TableCell colSpan={2} className="pl-8 text-sm text-muted-foreground">
                        {proj.projectName}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {proj.plannedHours.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {proj.actualHours.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {proj.plannedHours > 0 ? formatPercent((proj.actualHours / proj.plannedHours) * 100) : '—'}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))}
                </>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
