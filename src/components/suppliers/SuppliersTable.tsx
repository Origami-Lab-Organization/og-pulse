import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2, MapPin, Mail } from 'lucide-react';
import { Supplier, SUPPLIER_CATEGORIES } from '@/types/supplier';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SupplierColumnsProps {
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
  canManage: boolean;
}

const getCategoryLabel = (value: string | null): string => {
  if (!value) return '-';
  const category = SUPPLIER_CATEGORIES.find(c => c.value === value);
  return category?.label || value;
};

const getCategoryColor = (value: string | null): string => {
  switch (value) {
    case 'tecnologia':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'marketing':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    case 'consultoria':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'infraestrutura':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case 'recursos_humanos':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
    case 'juridico':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'contabilidade':
      return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

export const createSupplierColumns = ({
  onEdit,
  onDelete,
  canManage,
}: SupplierColumnsProps): ColumnDef<Supplier>[] => {
  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: 'companyName',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Fornecedor" />
      ),
      cell: ({ row }) => {
        const supplier = row.original;
        const initials = supplier.companyName
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-accent/20 text-accent text-sm font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{supplier.companyName}</span>
              {supplier.tradingName && (
                <span className="text-xs text-muted-foreground">{supplier.tradingName}</span>
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
      accessorKey: 'category',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Categoria" />
      ),
      cell: ({ row }) => {
        const category = row.getValue('category') as string | null;
        if (!category) return <span className="text-muted-foreground">-</span>;
        return (
          <Badge variant="outline" className={getCategoryColor(category)}>
            {getCategoryLabel(category)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'contactName',
      header: 'Contato',
      cell: ({ row }) => {
        const supplier = row.original;
        if (!supplier.contactName && !supplier.contactEmail) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <div className="flex flex-col">
            {supplier.contactName && (
              <span className="text-sm">{supplier.contactName}</span>
            )}
            {supplier.contactEmail && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {supplier.contactEmail}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'cidade',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Localização" />
      ),
      cell: ({ row }) => {
        const supplier = row.original;
        if (!supplier.cidade && !supplier.estado) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <div className="flex items-center gap-1.5 text-sm">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              {supplier.cidade}
              {supplier.cidade && supplier.estado && '/'}
              {supplier.estado}
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
  ];

  if (canManage) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => {
        const supplier = row.original;

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
              <DropdownMenuItem onClick={() => onEdit(supplier)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(supplier)}
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
