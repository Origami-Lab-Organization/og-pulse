import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Ban, Unlock, Archive, Mail, Phone, Clock, Send, UserMinus, Eye } from 'lucide-react';
import { Employee } from '@/hooks/useEmployees';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader';
import { formatCurrency } from '@/lib/masks';
import { formatDate } from '@/lib/formatters';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EmployeeColumnsProps {
  onEdit: (employee: Employee) => void;
  onBlock: (employee: Employee) => void;
  onUnblock: (employee: Employee) => void;
  onArchive: (employee: Employee) => void;
  onResendInvite: (employee: Employee) => void;
  onTerminate?: (employee: Employee) => void;
  onViewTermination?: (employee: Employee) => void;
  isResendingInvite?: boolean;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ativo':
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-600/80">
          Ativo
        </Badge>
      );
    case 'aguardando_confirmacao':
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">
          <Clock className="h-3 w-3 mr-1" />
          Aguardando
        </Badge>
      );
    case 'bloqueado':
      return (
        <Badge variant="destructive">
          <Ban className="h-3 w-3 mr-1" />
          Bloqueado
        </Badge>
      );
    case 'desligado':
      return (
        <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-50">
          <UserMinus className="h-3 w-3 mr-1" />
          Desligado
        </Badge>
      );
    case 'em_desligamento':
      return (
        <Badge variant="outline" className="border-yellow-500 text-yellow-600 bg-yellow-50">
          <Clock className="h-3 w-3 mr-1" />
          Desligamento Pendente
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export const createEmployeeColumns = ({
  onEdit,
  onBlock,
  onUnblock,
  onArchive,
  onResendInvite,
  onTerminate,
  onViewTermination,
  isResendingInvite,
}: EmployeeColumnsProps): ColumnDef<Employee>[] => [
  {
    accessorKey: 'nome',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Funcionário" />
    ),
    cell: ({ row }) => {
      const employee = row.original;
      const initials = employee.nome
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            {employee.fotoUrl ? (
              <AvatarImage src={employee.fotoUrl} alt={employee.nome} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{employee.nome}</span>
            </div>
            <span className="text-xs text-muted-foreground">{employee.cargo}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'email',
    header: 'Contato',
    cell: ({ row }) => {
      const employee = row.original;
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-sm">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{employee.email}</span>
          </div>
          {employee.telefone && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <span>{employee.telefone}</span>
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return getStatusBadge(status);
    },
  },
  {
    accessorKey: 'totalMonthlyCostEstimated',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Custo Mensal" />
    ),
    cell: ({ row }) => {
      const employee = row.original;
      const custoTotal = (() => {
        const estimated = employee.totalMonthlyCostEstimated;
        const benefitsFromQuery = employee.totalBenefitsCost || 0;
        const toolsFromQuery = employee.totalToolsCost || 0;
        if (estimated > 0) {
          const breakdown = employee.breakdownJson;
          const storedBenefits = breakdown && typeof breakdown === 'object' && 'benefitsAmount' in breakdown
            ? Number((breakdown as any).benefitsAmount) : 0;
          const storedTools = breakdown && typeof breakdown === 'object' && 'toolsAmount' in breakdown
            ? Number((breakdown as any).toolsAmount) : 0;
          return estimated + (benefitsFromQuery - storedBenefits) + (toolsFromQuery - storedTools);
        }
        return employee.salarioMensal + employee.beneficios + employee.encargos + benefitsFromQuery + toolsFromQuery;
      })();
      const custoHora = custoTotal / (employee.jornadaMensal || 176);
      return (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {formatCurrency(custoTotal)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatCurrency(custoHora)}/h
          </span>
        </div>
      );
    },
    sortingFn: (rowA, rowB) => {
      const calcCost = (emp: typeof rowA.original) => {
        const estimated = emp.totalMonthlyCostEstimated;
        const benefitsFromQuery = emp.totalBenefitsCost || 0;
        const toolsFromQuery = emp.totalToolsCost || 0;
        if (estimated > 0) {
          const breakdown = emp.breakdownJson;
          const storedBenefits = breakdown && typeof breakdown === 'object' && 'benefitsAmount' in breakdown
            ? Number((breakdown as any).benefitsAmount) : 0;
          const storedTools = breakdown && typeof breakdown === 'object' && 'toolsAmount' in breakdown
            ? Number((breakdown as any).toolsAmount) : 0;
          return estimated + (benefitsFromQuery - storedBenefits) + (toolsFromQuery - storedTools);
        }
        return emp.salarioMensal + emp.beneficios + emp.encargos + benefitsFromQuery + toolsFromQuery;
      };
      return calcCost(rowA.original) - calcCost(rowB.original);
    },
  },
  {
    accessorKey: 'dataAdmissao',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Admissão" />
    ),
    cell: ({ row }) => {
      const date = row.getValue('dataAdmissao') as string;
      if (!date) return <span className="text-muted-foreground">-</span>;
      return <span className="text-sm">{formatDate(date)}</span>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const employee = row.original;
      const isBlocked = employee.status === 'bloqueado';
      const isAwaiting = employee.status === 'aguardando_confirmacao';
      const isActive = employee.status === 'ativo';
      const hasTermination = !!employee.terminationId;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="h-8 w-8 p-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(employee)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            
            {/* Resend invite - only for awaiting confirmation */}
            {isAwaiting && (
              <DropdownMenuItem 
                onClick={() => onResendInvite(employee)}
                disabled={isResendingInvite}
                className="text-blue-600 focus:text-blue-600"
              >
                <Send className="mr-2 h-4 w-4" />
                {isResendingInvite ? 'Enviando...' : 'Reenviar Convite'}
              </DropdownMenuItem>
            )}
            
            {/* Block - for active or awaiting */}
            {(isActive || isAwaiting) && (
              <DropdownMenuItem
                onClick={() => onBlock(employee)}
                className="text-destructive focus:text-destructive"
              >
                <Ban className="mr-2 h-4 w-4" />
                Bloquear
              </DropdownMenuItem>
            )}
            
            {/* Unblock - only for blocked */}
            {isBlocked && (
              <DropdownMenuItem
                onClick={() => onUnblock(employee)}
                className="text-green-600 focus:text-green-600"
              >
                <Unlock className="mr-2 h-4 w-4" />
                Desbloquear
              </DropdownMenuItem>
            )}
            
            {/* Archive - for blocked or awaiting */}
            {(isBlocked || isAwaiting) && (
              <DropdownMenuItem
                onClick={() => onArchive(employee)}
                className="text-muted-foreground focus:text-muted-foreground"
              >
                <Archive className="mr-2 h-4 w-4" />
                Arquivar
              </DropdownMenuItem>
            )}

            {/* Terminate - only for active employees without existing termination */}
            {isActive && !hasTermination && onTerminate && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onTerminate(employee)}
                  className="text-destructive focus:text-destructive"
                >
                  <UserMinus className="mr-2 h-4 w-4" />
                  Desligar Funcionário
                </DropdownMenuItem>
              </>
            )}

            {/* View termination - for employees with pending termination */}
            {hasTermination && onViewTermination && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onViewTermination(employee)}
                  className="text-yellow-600 focus:text-yellow-600"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Desligamento
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
