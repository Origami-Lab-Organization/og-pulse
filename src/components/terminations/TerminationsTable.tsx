import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, Pencil, FileText, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { TerminationWithEmployee } from '@/services/terminationService';
import { TerminationStatusBadge } from './TerminationStatusBadge';
import { TerminationTypeBadge } from './TerminationTypeBadge';
import { TerminationStatus, TerminationType } from '@/types/termination';

interface CreateColumnsOptions {
  onView: (t: TerminationWithEmployee) => void;
  onEdit: (t: TerminationWithEmployee) => void;
  onDocuments: (t: TerminationWithEmployee) => void;
  onPayroll: (t: TerminationWithEmployee) => void;
}

export const createTerminationColumns = ({
  onView,
  onEdit,
  onDocuments,
  onPayroll,
}: CreateColumnsOptions): ColumnDef<TerminationWithEmployee>[] => [
  {
    accessorKey: 'employees.nome',
    header: 'Nome',
    cell: ({ row }) => {
      const emp = row.original.employees;
      return (
        <div className="flex items-center gap-3">
          {emp.foto_url ? (
            <img src={emp.foto_url} alt={emp.nome} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
              {emp.nome.charAt(0)}
            </div>
          )}
          <div>
            <p className="font-medium text-foreground">{emp.nome}</p>
            <p className="text-xs text-muted-foreground">{emp.email}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: 'employees.cargo',
    header: 'Cargo',
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.employees.cargo}</span>,
  },
  {
    accessorKey: 'employees.tipo_contratacao',
    header: 'Contratação',
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.employees.tipo_contratacao}</span>,
  },
  {
    accessorKey: 'termination_date',
    header: 'Data Desligamento',
    cell: ({ row }) => format(new Date(row.original.termination_date), 'dd/MM/yyyy', { locale: ptBR }),
  },
  {
    accessorKey: 'termination_type',
    header: 'Tipo',
    cell: ({ row }) => <TerminationTypeBadge type={row.original.termination_type as TerminationType} />,
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <TerminationStatusBadge status={row.original.status as TerminationStatus} />,
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: 'actions',
    header: 'Ações',
    cell: ({ row }) => {
      const t = row.original;
      return (
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(t)}>
                <Eye className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ver detalhes</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(t)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDocuments(t)}>
                <FileText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Documentos</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPayroll(t)}>
                <Calculator className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ajustes de folha</TooltipContent>
          </Tooltip>
        </div>
      );
    },
  },
];
