import { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DataTable } from '@/components/data-table/DataTable';
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { PortfolioProject } from '@/hooks/usePortfolioProjects';
import { PORTFOLIO_STAGE_LABELS, PortfolioStage } from '@/types/portfolio';

interface PortfolioTableProps {
  projects: PortfolioProject[];
  hideValues?: boolean;
}

const stageColors: Record<PortfolioStage, string> = {
  planning:               'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  value_delivery:         'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  results_presentation:   'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  learning_case:          'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  completed:              'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

const createColumns = (hideValues: boolean): ColumnDef<PortfolioProject>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Projeto" />,
    cell: ({ row }) => (
      <span className="font-medium text-foreground">{row.original.name}</span>
    ),
  },
  {
    id: 'client',
    accessorFn: row => row.client?.trading_name || row.client?.company_name || '',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Cliente" />,
    cell: ({ getValue }) => <span>{getValue() as string || '—'}</span>,
  },
  {
    id: 'manager',
    accessorFn: row => row.manager?.nome || '',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Gerente" />,
    cell: ({ getValue }) => <span>{getValue() as string || '—'}</span>,
  },
  {
    id: 'service',
    accessorFn: row => row.service?.name || '',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Serviço" />,
    cell: ({ getValue }) => <span>{getValue() as string || '—'}</span>,
  },
  {
    accessorKey: 'portfolio_stage',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estágio" />,
    cell: ({ row }) => {
      const stage = (row.original.portfolio_stage || 'planning') as PortfolioStage;
      return (
        <Badge className={stageColors[stage]}>
          {PORTFOLIO_STAGE_LABELS[stage]}
        </Badge>
      );
    },
  },
  {
    id: 'total_value',
    accessorFn: row => {
      const installments = row.installments || [];
      const sum = installments.reduce((s, i) => s + Number(i.value), 0);
      return sum > 0 ? sum : (row.total_value || 0);
    },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Valor Total" />,
    cell: ({ getValue }) => (
      <span className="font-medium">{hideValues ? '•••••' : formatCurrency(getValue() as number)}</span>
    ),
  },
  {
    id: 'receipt_percent',
    accessorFn: row => {
      const installments = row.installments || [];
      const sum = installments.reduce((s, i) => s + Number(i.value), 0);
      const total = sum > 0 ? sum : (row.total_value || 0);
      const received = installments.filter(i => i.status === 'received').reduce((s, i) => s + Number(i.value), 0);
      return total > 0 ? Math.round((received / total) * 100) : 0;
    },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Recebimento" />,
    cell: ({ getValue }) => {
      const pct = getValue() as number;
      if (hideValues) {
        return (
          <div className="flex items-center gap-2 min-w-[100px]">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden" />
            <span className="text-xs text-muted-foreground w-8 text-right">•••</span>
          </div>
        );
      }
      return (
        <div className="flex items-center gap-2 min-w-[100px]">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'start_date',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Início" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {row.original.start_date
          ? format(parseISO(row.original.start_date), 'dd MMM yyyy', { locale: ptBR })
          : '—'}
      </span>
    ),
  },
];

export function PortfolioTable({ projects, hideValues = false }: PortfolioTableProps) {
  const navigate = useNavigate();
  const columns = useMemo(() => createColumns(hideValues), [hideValues]);

  return (
    <div className="overflow-auto">
      <DataTable
        columns={columns}
        data={projects}
        onRowClick={row => navigate(`/projects/${row.id}`)}
      />
    </div>
  );
}
