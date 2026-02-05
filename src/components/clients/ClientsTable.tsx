import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2, MapPin, Building2 } from 'lucide-react';
import { Client } from '@/types/client';
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
import { formatCNPJ } from '@/lib/masks';
import { formatDate } from '@/lib/formatters';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ClientColumnsProps {
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  canManage: boolean;
}

export const createClientColumns = ({
  onEdit,
  onDelete,
  canManage,
}: ClientColumnsProps): ColumnDef<Client>[] => {
  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: 'companyName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Cliente" />
      ),
      cell: ({ row }) => {
        const client = row.original;
        const initials = client.companyName
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              {client.logoUrl && (
                <AvatarImage src={client.logoUrl} alt={client.companyName} className="object-cover" />
              )}
              <AvatarFallback className="bg-secondary/10 text-secondary text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{client.companyName}</span>
              {client.tradingName && (
                <span className="text-xs text-muted-foreground">{client.tradingName}</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'cnpj',
      header: 'CNPJ',
      cell: ({ row }) => {
        const cnpj = row.getValue('cnpj') as string | undefined;
        if (!cnpj) return <span className="text-muted-foreground">-</span>;
        return <span className="text-sm font-mono">{formatCNPJ(cnpj)}</span>;
      },
    },
    {
      accessorKey: 'cidade',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Localização" />
      ),
      cell: ({ row }) => {
        const client = row.original;
        if (!client.cidade && !client.estado) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <div className="flex items-center gap-1.5 text-sm">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              {client.cidade}
              {client.cidade && client.estado && '/'}
              {client.estado}
            </span>
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
        return (
          <Badge variant={status === 'active' ? 'default' : 'secondary'}>
            {status === 'active' ? 'Ativo' : 'Inativo'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Criado em" />
      ),
      cell: ({ row }) => {
        const date = row.getValue('createdAt') as string;
        if (!date) return <span className="text-muted-foreground">-</span>;
        return <span className="text-sm">{formatDate(date)}</span>;
      },
    },
  ];

  if (canManage) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => {
        const client = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(client)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(client)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    });
  }

  return columns;
};
