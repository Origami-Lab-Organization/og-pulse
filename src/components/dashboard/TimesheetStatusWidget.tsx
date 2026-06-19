import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyAllocationData } from '@/hooks/useMyAllocationData';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function TimesheetStatusWidget() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const today = new Date();
  const monthKey = format(today, 'yyyy-MM');
  const monthName = MONTHS_PT[today.getMonth()];

  const { data: allocation, isLoading } = useMyAllocationData(employee?.id, monthKey);

  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Timesheet
            </CardTitle>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-2.5 w-full rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-9 w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  const actual = allocation?.totalActualHours ?? 0;
  const expected = allocation?.expectedHours ?? 0;
  const planned = allocation?.totalPlannedHours ?? 0;
  const projects = allocation?.projects ?? [];
  const hasAllocation = planned > 0;

  const ratio = expected > 0 ? actual / expected : 0;
  const percent = Math.min(100, Math.round(ratio * 100));

  const statusInfo = !hasAllocation
    ? { label: 'Sem alocação', classes: 'bg-muted text-muted-foreground border-0' }
    : ratio >= 0.9
    ? { label: 'Em dia', classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-0' }
    : ratio >= 0.5
    ? { label: 'Atenção', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0' }
    : { label: 'Pendente', classes: 'bg-destructive/10 text-destructive border-0' };

  const barClass = !hasAllocation
    ? 'bg-muted-foreground/30'
    : ratio >= 0.9
    ? 'bg-emerald-500'
    : ratio >= 0.5
    ? 'bg-amber-500'
    : 'bg-destructive';

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Timesheet — {monthName}
          </CardTitle>
          <Badge className={cn('text-xs', statusInfo.classes)}>
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1">
        <div className="space-y-1.5">
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              className={cn('h-full rounded-full transition-all', barClass)}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{actual.toFixed(1)}h lançadas</span>
            <span>{expected.toFixed(1)}h esperadas até hoje</span>
          </div>
        </div>

        {projects.length > 0 ? (
          <div className="space-y-2 flex-1">
            {projects.slice(0, 4).map((p) => (
              <div key={p.projectId} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                <p className="flex-1 text-xs text-muted-foreground truncate">{p.projectName}</p>
                <span className="text-xs font-medium text-foreground shrink-0">
                  {p.actualHours.toFixed(0)}h / {p.plannedHours.toFixed(0)}h
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground flex-1">
            {hasAllocation
              ? 'Nenhuma hora lançada este mês ainda.'
              : 'Sem projetos alocados para este mês.'}
          </p>
        )}

        <Button size="sm" onClick={() => navigate('/my-timesheet')} className="w-full gap-2">
          <Clock className="h-3.5 w-3.5" />
          Lançar Horas
          <ArrowRight className="h-3.5 w-3.5 ml-auto" />
        </Button>
      </CardContent>
    </Card>
  );
}
