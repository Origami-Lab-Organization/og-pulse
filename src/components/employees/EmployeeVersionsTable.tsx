import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, Check } from 'lucide-react';
import { EmployeeVersionDB } from '@/services/employeeVersionService';
import { formatCurrency } from '@/lib/formatters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface EmployeeVersionsTableProps {
  versions: EmployeeVersionDB[];
  isLoading?: boolean;
}

export function EmployeeVersionsTable({ versions, isLoading }: EmployeeVersionsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <History className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Nenhum histórico de versões disponível.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vigência</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead className="text-right">Salário Bruto</TableHead>
            <TableHead className="text-right">Encargos</TableHead>
            <TableHead className="text-right">Jornada</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {versions.map((version) => {
            const isActive = !version.effective_until;
            const effectiveFrom = format(new Date(version.effective_from), 'dd/MM/yyyy', { locale: ptBR });
            const effectiveUntil = version.effective_until 
              ? format(new Date(version.effective_until), 'dd/MM/yyyy', { locale: ptBR })
              : 'Atual';

            return (
              <TableRow key={version.id}>
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <span>{effectiveFrom}</span>
                    <span className="text-xs text-muted-foreground">até {effectiveUntil}</span>
                  </div>
                </TableCell>
                <TableCell>{version.cargo}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(version.salario_mensal)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(version.encargos)}
                </TableCell>
                <TableCell className="text-right">
                  {version.jornada_mensal}h
                </TableCell>
                <TableCell>
                  {isActive ? (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Histórico</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
