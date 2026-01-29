import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, Power, PowerOff, Archive } from 'lucide-react';
import { RoleRateDB, SENIORITY_OPTIONS, RoleRateStatus } from '@/types/roleRate';
import { formatCurrency } from '@/lib/formatters';

interface RoleRatesTableProps {
  roleRates: RoleRateDB[];
  onEdit: (roleRate: RoleRateDB) => void;
  onDelete: (roleRate: RoleRateDB) => void;
  onSetStatus: (roleRate: RoleRateDB, status: RoleRateStatus) => void;
  isLoading?: boolean;
}

export function RoleRatesTable({
  roleRates,
  onEdit,
  onDelete,
  onSetStatus,
  isLoading,
}: RoleRatesTableProps) {
  const getSeniorityLabel = (seniority: string) => {
    return SENIORITY_OPTIONS.find((opt) => opt.value === seniority)?.label || seniority;
  };


  const getStatusBadge = (status: RoleRateStatus) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-primary text-primary-foreground">Ativo</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inativo</Badge>;
      case 'archived':
        return <Badge variant="outline" className="text-muted-foreground">Arquivado</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (roleRates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <p className="text-muted-foreground mb-2">
          Nenhum papel cadastrado ainda.
        </p>
        <p className="text-sm text-muted-foreground">
          Clique em "Novo Papel" para começar.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Papel</TableHead>
            <TableHead>Senioridade</TableHead>
            <TableHead className="text-right">Valor/Hora</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roleRates.map((roleRate) => (
            <TableRow
              key={roleRate.id}
              className={roleRate.status !== 'active' ? 'opacity-60' : undefined}
            >
              <TableCell>
                <div>
                  <p className="font-medium">{roleRate.role_name}</p>
                  {roleRate.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {roleRate.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {getSeniorityLabel(roleRate.seniority)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(roleRate.hourly_rate)}
              </TableCell>
              <TableCell>
                {getStatusBadge(roleRate.status)}
              </TableCell>
              <TableCell>
                {roleRate.status !== 'archived' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Ações</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(roleRate)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      
                      {roleRate.status === 'active' && (
                        <DropdownMenuItem onClick={() => onSetStatus(roleRate, 'inactive')}>
                          <PowerOff className="mr-2 h-4 w-4" />
                          Inativar
                        </DropdownMenuItem>
                      )}
                      
                      {roleRate.status === 'inactive' && (
                        <>
                          <DropdownMenuItem onClick={() => onSetStatus(roleRate, 'active')}>
                            <Power className="mr-2 h-4 w-4" />
                            Reativar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onSetStatus(roleRate, 'archived')}>
                            <Archive className="mr-2 h-4 w-4" />
                            Arquivar
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      <DropdownMenuItem
                        onClick={() => onDelete(roleRate)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
