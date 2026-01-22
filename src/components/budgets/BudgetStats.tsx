import { Card, CardContent } from '@/components/ui/card';
import { FileText, Send, CheckCircle, XCircle, Clock } from 'lucide-react';
import { BudgetWithDetails } from '@/types/budget';
import { formatCurrency } from '@/lib/formatters';

interface BudgetStatsProps {
  budgets: BudgetWithDetails[];
}

export function BudgetStats({ budgets }: BudgetStatsProps) {
  const stats = {
    total: budgets.length,
    draft: budgets.filter((b) => b.status === 'draft').length,
    sent: budgets.filter((b) => b.status === 'sent').length,
    approved: budgets.filter((b) => b.status === 'approved').length,
    rejected: budgets.filter((b) => b.status === 'rejected').length,
    totalValue: budgets
      .filter((b) => b.status === 'approved')
      .reduce((acc, b) => acc + b.final_total, 0),
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-full bg-primary/10 p-3">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-full bg-muted p-3">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Rascunhos</p>
            <p className="text-2xl font-bold">{stats.draft}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
            <Send className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Enviados</p>
            <p className="text-2xl font-bold">{stats.sent}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Aprovados</p>
            <p className="text-2xl font-bold">{stats.approved}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="rounded-full bg-primary/10 p-3">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Valor Aprovado</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
