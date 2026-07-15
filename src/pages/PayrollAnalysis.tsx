import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePayrollHistory } from '@/hooks/usePayrollHistory';
import { PayrollEvolutionChart } from '@/components/payroll/PayrollEvolutionChart';
import { PayrollAnalysisTable } from '@/components/payroll/PayrollAnalysisTable';
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
    <AppLayout
      title="Folha de Pagamento"
      description="Evolução mensal e custo por colaborador ativo, para conferência com a folha, os impostos, as ferramentas e os benefícios pagos."
      breadcrumbs={[{ label: 'Análises' }, { label: 'Folha de Pagamento' }]}
      actions={
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
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[340px] rounded-lg" />
          <Skeleton className="h-5 w-72" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : (
        <div className="space-y-4">
          <PayrollEvolutionChart history={history} selectedMonth={activeMonth} onSelectMonth={setSelectedMonth} />

          <div className="flex flex-wrap items-center gap-3">
            <Select value={activeMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {history.map((h) => (
                  <SelectItem key={h.key} value={h.key}>
                    {h.label}
                    {h.isCurrent ? ' (atual)' : ''}
                    {h.isFuture ? ' (projeção)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedPoint && (
              <p className="text-sm text-muted-foreground">
                {selectedPoint.headcount} colaborador{selectedPoint.headcount === 1 ? '' : 'es'} · Total {formatCurrency(selectedPoint.totalMonthlyCost)}
              </p>
            )}
          </div>

          <PayrollAnalysisTable
            rows={selectedPoint?.rows ?? []}
            monthLabel={selectedPoint?.label ?? ''}
            estimated={selectedPoint?.estimated}
            projected={selectedPoint?.projected}
          />
        </div>
      )}
    </AppLayout>
  );
}
