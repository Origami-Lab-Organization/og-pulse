import { Clock, CheckCircle, Percent, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPercent } from '@/lib/formatters';
import type { AllocationSummary } from '@/hooks/useAllocationAnalytics';

interface AllocationKPIsProps {
  summary: AllocationSummary;
}

export function AllocationKPIs({ summary }: AllocationKPIsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Horas Planejadas
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalPlannedHours.toFixed(0)}h</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.employeeCount} colaborador(es)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Horas Realizadas
          </CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.totalActualHours.toFixed(0)}h</div>
          <p className="mt-1 text-xs text-muted-foreground">no período</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Execução
          </CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            summary.executionPercent >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
            summary.executionPercent >= 70 ? 'text-amber-600 dark:text-amber-400' :
            'text-red-600 dark:text-red-400'
          }`}>
            {formatPercent(summary.executionPercent)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">realizado / planejado</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Utilização Média
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${
            summary.avgUtilization >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
            summary.avgUtilization >= 60 ? 'text-amber-600 dark:text-amber-400' :
            'text-red-600 dark:text-red-400'
          }`}>
            {formatPercent(summary.avgUtilization)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">realizado / capacidade</p>
        </CardContent>
      </Card>
    </div>
  );
}
