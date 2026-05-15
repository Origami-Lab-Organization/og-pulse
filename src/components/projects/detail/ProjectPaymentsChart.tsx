import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectWithRelations } from '@/types/project';
import { useMaskedCurrency, useHideValues } from '@/contexts/HideValuesContext';

interface ProjectPaymentsChartProps {
  project: ProjectWithRelations;
}

export function ProjectPaymentsChart({ project }: ProjectPaymentsChartProps) {
  const formatCurrency = useMaskedCurrency();
  const hideValues = useHideValues();
  const paymentData = useMemo(() => {
    const installments = project.installments || [];
    const contractValue = Number(project.total_value || 0);
    
    const received = installments
      .filter((i) => i.status === 'received')
      .reduce((sum, i) => sum + Number(i.value), 0);
    
    const overdue = installments
      .filter((i) => i.status === 'overdue')
      .reduce((sum, i) => sum + Number(i.value), 0);
    
    const pending = installments
      .filter((i) => i.status === 'pending' || i.status === 'invoiced')
      .reduce((sum, i) => sum + Number(i.value), 0);

    const total = received + pending + overdue;
    
    return {
      received,
      pending,
      overdue,
      total: total > 0 ? total : contractValue,
      contractValue,
      receivedPercent: total > 0 ? (received / total) * 100 : 0,
      pendingPercent: total > 0 ? (pending / total) * 100 : 0,
      overduePercent: total > 0 ? (overdue / total) * 100 : 0,
    };
  }, [project.installments, project.total_value]);

  const hasInstallments = (project.installments?.length || 0) > 0;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Recebimentos</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        {!hasInstallments ? (
          <div className="h-[220px] flex items-center justify-center text-muted-foreground">
            Nenhuma parcela cadastrada
          </div>
        ) : (
          <div className="h-[220px] flex flex-col justify-center">
            {/* Progress summary */}
            <div className="text-center mb-4">
              <p className="text-2xl font-bold">
                {formatCurrency(paymentData.received)}
              </p>
              <p className="text-xs text-muted-foreground">
                de {formatCurrency(paymentData.total)} ({hideValues ? '•••' : `${paymentData.receivedPercent.toFixed(0)}%`})
              </p>
            </div>
            
            {/* Segmented Progress Bar */}
            <div className="h-4 rounded-full overflow-hidden flex bg-muted">
              {paymentData.receivedPercent > 0 && (
                <div 
                  className="bg-emerald-500 transition-all"
                  style={{ width: `${paymentData.receivedPercent}%` }}
                />
              )}
              {paymentData.pendingPercent > 0 && (
                <div 
                  className="bg-amber-400 transition-all"
                  style={{ width: `${paymentData.pendingPercent}%` }}
                />
              )}
              {paymentData.overduePercent > 0 && (
                <div 
                  className="bg-red-500 transition-all"
                  style={{ width: `${paymentData.overduePercent}%` }}
                />
              )}
            </div>
            
            {/* Legend with values */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-muted-foreground">Recebido:</span>
                <span className="font-medium">{formatCurrency(paymentData.received)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                <span className="text-muted-foreground">Pendente:</span>
                <span className="font-medium">{formatCurrency(paymentData.pending)}</span>
              </div>
              {paymentData.overdue > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                  <span className="text-muted-foreground">Atrasado:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(paymentData.overdue)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
