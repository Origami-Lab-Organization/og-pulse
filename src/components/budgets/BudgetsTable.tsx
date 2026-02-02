import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Eye, Edit, Copy, Trash2, Send, CheckCircle, XCircle } from 'lucide-react';
import { BudgetWithDetails, BudgetStatus } from '@/types/budget';
import { BudgetStatusBadge } from './BudgetStatusBadge';
import { formatCurrency, formatShortDate } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BudgetsTableProps {
  budgets: BudgetWithDetails[];
  onView: (budget: BudgetWithDetails) => void;
  onEdit: (budget: BudgetWithDetails) => void;
  onDuplicate: (budget: BudgetWithDetails) => void;
  onDelete: (budget: BudgetWithDetails) => void;
  onStatusChange: (budget: BudgetWithDetails, status: BudgetStatus) => void;
}

export function BudgetsTable({
  budgets,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
}: BudgetsTableProps) {
  const getClientName = (budget: BudgetWithDetails) => {
    if (budget.client) {
      return budget.client.trading_name || budget.client.company_name;
    }
    return budget.lead_name || '-';
  };

  const isLead = (budget: BudgetWithDetails) => !budget.client_id;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Cliente/Lead</TableHead>
            <TableHead>Validade</TableHead>
            <TableHead className="text-right">Valor Final</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {budgets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center">
                Nenhum orçamento encontrado.
              </TableCell>
            </TableRow>
          ) : (
            budgets.map((budget) => (
              <TableRow key={budget.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onView(budget)}>
                <TableCell className="font-mono text-sm">{budget.budget_number}</TableCell>
                <TableCell className="font-medium">{budget.title}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{getClientName(budget)}</span>
                    {isLead(budget) && (
                      <span className="text-xs text-muted-foreground">Lead</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {budget.valid_until ? (
                    <span className="text-sm">
                      {formatShortDate(budget.start_date)} - {formatShortDate(budget.valid_until)}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      A partir de {formatShortDate(budget.start_date)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(budget.final_total)}
                </TableCell>
                <TableCell>
                  <BudgetStatusBadge status={budget.status} />
                </TableCell>
                <TableCell>
                  {format(new Date(budget.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onView(budget)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(budget)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(budget)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {budget.status === 'draft' && (
                        <DropdownMenuItem onClick={() => onStatusChange(budget, 'sent')}>
                          <Send className="mr-2 h-4 w-4" />
                          Marcar como Enviado
                        </DropdownMenuItem>
                      )}
                      {budget.status === 'sent' && (
                        <>
                          <DropdownMenuItem onClick={() => onStatusChange(budget, 'approved')}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Marcar como Aprovado
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onStatusChange(budget, 'rejected')}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Marcar como Rejeitado
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(budget)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
