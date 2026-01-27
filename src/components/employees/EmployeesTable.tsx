import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, UserX, Crown, Mail, Phone, Clock } from 'lucide-react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface EmployeeColumnsProps {
  onEdit: (employee: Employee) => void;
  onInactivate: (employee: Employee) => void;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ativo':
      return <Badge variant="default">Ativo</Badge>;
    case 'inativo':
      return <Badge variant="secondary">Inativo</Badge>;
    case 'aguardando_confirmacao':
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">
          <Clock className="h-3 w-3 mr-1" />
          Aguardando
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export const createEmployeeColumns = ({
  onEdit,
  onInactivate,
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
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{employee.nome}</span>
              {employee.isGerente && (
                <Crown className="h-3.5 w-3.5 text-amber-500" />
              )}
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
    accessorKey: 'custoHora',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Custo/Hora" />
    ),
    cell: ({ row }) => {
      const employee = row.original;
      const custoTotal = employee.salarioMensal + employee.beneficios + employee.encargos + (employee.totalToolsCost || 0);
      const custoHora = custoTotal / 176;
      return (
        <div className="flex flex-col">
          <span className="font-medium text-foreground">
            {formatCurrency(custoHora)}/h
          </span>
          <span className="text-xs text-muted-foreground">
            Total: {formatCurrency(custoTotal)}
          </span>
        </div>
      );
    },
    sortingFn: (rowA, rowB) => {
      const custoA = rowA.original.salarioMensal + rowA.original.beneficios + rowA.original.encargos + (rowA.original.totalToolsCost || 0);
      const custoB = rowB.original.salarioMensal + rowB.original.beneficios + rowB.original.encargos + (rowB.original.totalToolsCost || 0);
      return custoA - custoB;
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
      return (
        <span className="text-sm">
          {new Date(date).toLocaleDateString('pt-BR')}
        </span>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const employee = row.original;
      const isInactive = employee.status === 'inativo';

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
            {!isInactive && (
              <DropdownMenuItem
                onClick={() => onInactivate(employee)}
                className="text-destructive focus:text-destructive"
              >
                <UserX className="mr-2 h-4 w-4" />
                Inativar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
