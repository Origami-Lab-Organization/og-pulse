import { useState } from 'react';
import { CalendarDays, FileDown, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePayrollHistory } from '@/hooks/usePayrollHistory';
import { PayrollEvolutionChart } from '@/components/payroll/PayrollEvolutionChart';
import { PayrollAnalysisTable } from '@/components/payroll/PayrollAnalysisTable';
import { PayrollStatsCards } from '@/components/payroll/PayrollStatsCards';
import { formatCurrency } from '@/lib/formatters';
import { exportPayrollHistoryToExcel } from '@/lib/payrollHistoryExport';

export default function PayrollAnalysis() {
  const { history, isLoading } = usePayrollHistory();
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined);
  const [isExporting, setIsExporting] = useState(false);

  const currentMonthKey = history.find((h) => h.isCurrent)?.key;
  const activeMonth = selectedMonth ?? currentMonthKey;
  const selectedPoint = history.find((h) => h.key === activeMonth);

  async function handleExportExcel() {
    setIsExporting(true);
    try {
      await exportPayrollHistoryToExcel({ history, selectedMonthKey: activeMonth });
    } catch (err) {
      console.error('Falha ao exportar folha de pagamento para Excel', err);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <AppLayout title="Folha de Pagamento" hideHeader>
      <div className="-mx-4 -mt-4 mb-4 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 sm:-mx-6 sm:-mt-6 sm:mb-6">
        {/* Row A — título + mês + Excel */}
        <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-4 py-2.5 sm:px-6">
          <h1 className="text-lg font-bold tracking-tight text-foreground">Folha de Pagamento</h1>
          <span className="hidden border-l pl-3 text-xs text-muted-foreground md:inline">
            Custo por colaborador, impostos, ferramentas e benefícios
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select value={activeMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 w-auto gap-2 px-3">
                <CalendarDays className="h-4 w-4 text-primary" />
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent align="end">
                {history.map((h) => (
                  <SelectItem key={h.key} value={h.key}>
                    {h.label}
                    {h.isCurrent ? ' (atual)' : ''}
                    {h.isFuture ? ' (projeção)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              disabled={isExporting || isLoading || history.length === 0}
              onClick={handleExportExcel}
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              Excel
            </Button>
          </div>
        </div>

        {/* Row B — situação do mês selecionado + resumo */}
        <div className="flex min-h-[52px] flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
          <span className="ol-label shrink-0 text-muted-foreground">Situação</span>
          {selectedPoint && (
            <Badge variant="outline">
              {selectedPoint.isCurrent ? 'Atual' : selectedPoint.projected ? 'Projeção' : 'Estimado'}
            </Badge>
          )}

          <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-40" />
            ) : selectedPoint ? (
              <>
                {selectedPoint.headcount} colaborador{selectedPoint.headcount === 1 ? '' : 'es'} · Total{' '}
                {formatCurrency(selectedPoint.totalMonthlyCost)}
              </>
            ) : null}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <PayrollStatsCards point={selectedPoint} isLoading={isLoading} />

        {isLoading ? (
          <>
            <Skeleton className="h-[340px] rounded-lg" />
            <Skeleton className="h-96 rounded-lg" />
          </>
        ) : (
          <>
            <PayrollEvolutionChart history={history} selectedMonth={activeMonth} onSelectMonth={setSelectedMonth} />

            <PayrollAnalysisTable
              rows={selectedPoint?.rows ?? []}
              monthLabel={selectedPoint?.label ?? ''}
              estimated={selectedPoint?.estimated}
              projected={selectedPoint?.projected}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}
