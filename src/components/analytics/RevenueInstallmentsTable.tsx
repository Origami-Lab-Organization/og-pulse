import { useState } from 'react';
import { parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { PeriodInstallmentItem, OverdueItem } from '@/hooks/useRevenueAnalytics';

const STATUS_CONFIG = {
  received: { label: 'Recebida', variant: 'default' as const },
  invoiced: { label: 'Emitida', variant: 'secondary' as const },
};

interface Props {
  periodNFs: PeriodInstallmentItem[];
  periodReceivables: PeriodInstallmentItem[];
  overdueNFs: OverdueItem[];
  overdueReceipts: OverdueItem[];
}

export function RevenueInstallmentsTable({ periodNFs, periodReceivables, overdueNFs, overdueReceipts }: Props) {
  const navigate = useNavigate();
  const [type, setType] = useState<'nf' | 'receivable'>('nf');
  const [view, setView] = useState<'period' | 'overdue'>('period');

  const isNF = type === 'nf';
  const isOverdue = view === 'overdue';

  const periodData = isNF ? periodNFs : periodReceivables;
  const overdueData = isNF ? overdueNFs : overdueReceipts;
  const activeData = isOverdue ? overdueData : periodData;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border bg-card p-0.5 gap-0.5 text-sm">
            <button
              className={cn('px-3 py-1.5 font-medium rounded-md transition-colors',
                isNF ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
              onClick={() => setType('nf')}
            >
              NFs Emitidas
            </button>
            <button
              className={cn('px-3 py-1.5 font-medium rounded-md transition-colors',
                !isNF ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
              onClick={() => setType('receivable')}
            >
              Receitas
            </button>
          </div>

          <div className="inline-flex rounded-lg border bg-card p-0.5 gap-0.5 text-sm">
            <button
              className={cn('flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-md transition-colors',
                !isOverdue ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
              onClick={() => setView('period')}
            >
              No período
              <Badge variant="outline" className="font-normal text-xs px-1.5">{periodData.length}</Badge>
            </button>
            <button
              className={cn('flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-md transition-colors',
                isOverdue ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
              onClick={() => setView('overdue')}
            >
              {overdueData.length > 0 && <AlertTriangle className="h-3 w-3 text-amber-500" />}
              Atrasadas
              <Badge
                variant={overdueData.length > 0 ? 'destructive' : 'outline'}
                className="font-normal text-xs px-1.5"
              >
                {overdueData.length}
              </Badge>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {activeData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {isOverdue
              ? (isNF ? 'Nenhuma NF em atraso.' : 'Nenhuma receita em atraso.')
              : (isNF ? 'Nenhuma NF emitida no período.' : 'Nenhuma receita no período.')}
          </p>
        ) : (
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2 pr-3 font-medium">Projeto</th>
                  <th className="pb-2 pr-3 font-medium">Cliente</th>
                  <th className="pb-2 pr-3 font-medium">Gerente</th>
                  <th className="pb-2 pr-3 font-medium text-right">Valor</th>
                  <th className="pb-2 pr-3 font-medium">
                    {isOverdue ? 'Vencimento' : isNF ? 'Data Emissão' : 'Vencimento'}
                  </th>
                  <th className="pb-2 font-medium text-right">
                    {isOverdue ? 'Atraso' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isOverdue
                  ? (overdueData as OverdueItem[]).map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/projects/${item.projectId}?tab=financial`)}
                      >
                        <td className="py-2 pr-3 font-medium">{item.projectName}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{item.clientName}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{item.managerName}</td>
                        <td className="py-2 pr-3 text-right font-medium">{formatCurrency(item.value)}</td>
                        <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                          {format(parseISO(item.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                        </td>
                        <td className="py-2 text-right">
                          <Badge variant="destructive">{item.daysOverdue}d</Badge>
                        </td>
                      </tr>
                    ))
                  : (periodData as PeriodInstallmentItem[]).map((item, idx) => {
                      const dateStr = isNF ? item.invoiceDate : item.dueDate;
                      const statusCfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] ?? { label: 'Pendente', variant: 'outline' as const };
                      return (
                        <tr
                          key={idx}
                          className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => navigate(`/projects/${item.projectId}?tab=financial`)}
                        >
                          <td className="py-2 pr-3 font-medium">{item.projectName}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{item.clientName}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{item.managerName}</td>
                          <td className="py-2 pr-3 text-right font-medium">{formatCurrency(item.value)}</td>
                          <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                            {dateStr ? format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                          </td>
                          <td className="py-2 text-right">
                            <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
