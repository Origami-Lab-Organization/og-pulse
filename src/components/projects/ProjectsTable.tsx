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
import { ProjectWithRelations } from '@/types/project';
import { PORTFOLIO_STAGE_LABELS, PortfolioStage } from '@/types/portfolio';
import { SERVICE_LINE_LABELS } from '@/types/lead';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader';

interface ProjectColumnsProps {
  onView: (project: ProjectWithRelations) => void;
  onEdit: (project: ProjectWithRelations) => void;
  onDelete?: (project: ProjectWithRelations) => void;
}

const stageColors: Record<PortfolioStage, string> = {
  planning: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  value_delivery: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  results_presentation: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  learning_case: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
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
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'client',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
      cell: ({ row }) => {
        const client = row.original.client;
        return (
          <span className="font-medium">{client?.trading_name || client?.company_name || '-'}</span>
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
      accessorKey: 'portfolio_stage',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estágio" />,
      cell: ({ row }) => {
        const stage = (row.original.portfolio_stage || 'planning') as PortfolioStage;
        return (
          <Badge className={`whitespace-nowrap ${stageColors[stage]}`} variant="outline">
            {PORTFOLIO_STAGE_LABELS[stage]}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'service_line',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Linha de Serviço" />,
      cell: ({ row }) => {
        const sl = row.original.service_line;
        return sl ? (
          <span className="text-sm">{SERVICE_LINE_LABELS[sl] || sl}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
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
      cell: ({ row }) => {
        const project = row.original;
        if (project.service_line === 'financiamento_inovacao') {
          const invoicedTotal = (project.installments || [])
            .filter(i => i.status === 'invoiced' || i.status === 'received')
            .reduce((sum, i) => sum + Number(i.value || 0), 0);
          return formatCurrency(invoicedTotal);
        }
        return formatCurrency(Number(project.total_value));
      },
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
