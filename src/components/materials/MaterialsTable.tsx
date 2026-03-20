import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, Trash2, Package } from 'lucide-react';
import { Material, MATERIAL_CATEGORIES, MATERIAL_UNITS } from '@/types/material';
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
import { formatCurrency } from '@/lib/formatters';

interface MaterialColumnsProps {
  onEdit: (material: Material) => void;
  onDelete: (material: Material) => void;
  canManage: boolean;
}

const getCategoryLabel = (value: string | null): string => {
  if (!value) return '-';
  const category = MATERIAL_CATEGORIES.find(c => c.value === value);
  return category?.label || value;
};

const getCategoryColor = (value: string | null): string => {
  switch (value) {
    case 'equipamento':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'material_escritorio':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    case 'infraestrutura':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    case 'insumos':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
};

const getUnitLabel = (value: string | null): string => {
  if (!value) return '-';
  const unit = MATERIAL_UNITS.find(u => u.value === value);
  if (!unit) return value;
  // Extract label before parentheses, e.g. "Unidade (un)" → "Unidade"
  return unit.label.replace(/\s*\(.*\)$/, '').trim();
};

export const createMaterialColumns = ({
  onEdit,
  onDelete,
  canManage,
}: MaterialColumnsProps): ColumnDef<Material>[] => {
  const columns: ColumnDef<Material>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Material" />
      ),
      cell: ({ row }) => {
        const material = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{material.name}</span>
              {material.description && (
                <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {material.description}
                </span>
              )}
            </div>
          </div>
        );
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
      accessorKey: 'unit',
      header: 'Unidade',
      cell: ({ row }) => {
        const unit = row.getValue('unit') as string | null;
        if (!unit) return <span className="text-muted-foreground">-</span>;
        return <span className="text-sm">{getUnitLabel(unit)}</span>;
      },
    },
    {
      accessorKey: 'unitCost',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Custo Unitário" />
      ),
      cell: ({ row }) => {
        return (
          <div className="text-right font-medium">
            {formatCurrency(row.original.unitCost)}
          </div>
        );
      },
    },
    {
      accessorKey: 'sku',
      header: 'SKU',
      cell: ({ row }) => {
        const sku = row.getValue('sku') as string | null;
        if (!sku) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
            {sku}
          </span>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
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
        const material = row.original;

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
              <DropdownMenuItem onClick={() => onEdit(material)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(material)}
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
