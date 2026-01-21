import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import { ProjectWithRelations, PROJECT_STATUS_LABELS, ProjectStatus } from '@/types/project';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader';

interface ProjectColumnsProps {
  onView: (project: ProjectWithRelations) => void;
  onEdit: (project: ProjectWithRelations) => void;
  onDelete: (project: ProjectWithRelations) => void;
}

const statusColors: Record<ProjectStatus, string> = {
  planning: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export function createProjectColumns({
  onView,
  onEdit,
  onDelete,
}: ProjectColumnsProps): ColumnDef<ProjectWithRelations>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Projeto" />,
      cell: ({ row }) => {
        const project = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{project.name}</span>
            {project.description && (
              <span className="text-sm text-muted-foreground truncate max-w-[300px]">
                {project.description}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'client',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
      cell: ({ row }) => {
        const client = row.original.client;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{client?.company_name || '-'}</span>
            {client?.trading_name && (
              <span className="text-sm text-muted-foreground">{client.trading_name}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'manager',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Gerente" />,
      cell: ({ row }) => {
        const manager = row.original.manager;
        return (
          <div className="flex flex-col">
            <span>{manager?.nome || '-'}</span>
            {manager?.cargo && (
              <span className="text-sm text-muted-foreground">{manager.cargo}</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => {
        const status = row.original.status as ProjectStatus;
        return (
          <Badge className={statusColors[status]} variant="outline">
            {PROJECT_STATUS_LABELS[status]}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'start_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Início" />,
      cell: ({ row }) => formatDate(row.original.start_date),
    },
    {
      accessorKey: 'end_date',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Fim" />,
      cell: ({ row }) => {
        if (row.original.is_continuous) {
          return <Badge variant="secondary">Contínuo</Badge>;
        }
        return formatDate(row.original.end_date);
      },
    },
    {
      accessorKey: 'total_value',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Valor" />,
      cell: ({ row }) => formatCurrency(Number(row.original.total_value)),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const project = row.original;
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
              <DropdownMenuItem onClick={() => onView(project)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(project)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(project)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
