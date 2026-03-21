import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock } from 'lucide-react';
import { useMyAllocationData } from '@/hooks/useMyAllocationData';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MyTimesheetAllocationProps {
  employeeId: string | undefined;
  monthKey: string; // yyyy-MM
}

const RADIUS = 48;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function getRingColorClass(percent: number) {
  if (percent > 120) return 'stroke-destructive';
  if (percent < 80 || percent > 100) return 'stroke-amber-500';
  return 'stroke-primary';
}

function getTextColorClass(percent: number) {
  if (percent > 120) return 'text-destructive';
  if (percent < 80 || percent > 100) return 'text-amber-500';
  return 'text-primary';
}

function DonutRing({ percent }: { percent: number }) {
  const clamped = Math.min(percent, 100);
  const dashOffset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90" aria-hidden>
        <circle
          cx="60" cy="60" r={RADIUS}
          fill="none"
          strokeWidth="10"
          className="stroke-muted"
        />
        <circle
          cx="60" cy="60" r={RADIUS}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          className={cn('transition-all duration-700', getRingColorClass(percent))}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className={cn('text-3xl font-bold leading-none tabular-nums', getTextColorClass(percent))}>
          {Math.round(percent)}%
        </span>
      </div>
    </div>
  );
}

export const MyTimesheetAllocation = ({ employeeId, monthKey }: MyTimesheetAllocationProps) => {
  const { data, isLoading } = useMyAllocationData(employeeId, monthKey);

  const monthLabel = format(parseISO(`${monthKey}-01`), "MMMM yyyy", { locale: ptBR });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3"><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pt-0">
            <Skeleton className="w-36 h-36 rounded-full" />
            <div className="flex gap-4 w-full">
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 flex-1" />
              <Skeleton className="h-12 flex-1" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3"><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent className="space-y-3 pt-0">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const utilizationPercent = data.monthlyCapacity > 0
    ? (data.totalActualHours / data.monthlyCapacity) * 100
    : 0;

  const freeHours = Math.max(data.monthlyCapacity - data.totalPlannedHours, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Coluna esquerda — indicador de utilização */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Utilização do Mês</CardTitle>
          <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
        </CardHeader>
        <CardContent className="pt-0 flex flex-col items-center gap-5">
          <div
            className="flex flex-col items-center gap-1"
            role="img"
            aria-label={`Utilização mensal: ${Math.round(utilizationPercent)}%`}
          >
            <DonutRing percent={utilizationPercent} />
            <p className="text-xs text-muted-foreground tabular-nums">
              {data.totalActualHours.toFixed(1)}h / {data.monthlyCapacity}h
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full">
            <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/50 px-3 py-2.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Planejado</span>
              <span className="text-sm font-semibold tabular-nums">{data.totalPlannedHours.toFixed(0)}h</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/50 px-3 py-2.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Realizado</span>
              <span className="text-sm font-semibold tabular-nums">{data.totalActualHours.toFixed(1)}h</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/50 px-3 py-2.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Capacidade</span>
              <span className="text-sm font-semibold tabular-nums">{data.monthlyCapacity}h</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coluna direita — lista de projetos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Projetos do Mês</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {data.projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
              <Clock className="h-8 w-8 opacity-40" />
              <p className="text-sm">Sem alocação neste mês</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.projects.map((project) => {
                const isOverPlan = project.plannedHours > 0 && project.actualHours > project.plannedHours;
                const progressPercent = project.plannedHours > 0
                  ? Math.min((project.actualHours / project.plannedHours) * 100, 100)
                  : 0;

                return (
                  <div key={project.projectId} className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p className="text-sm font-medium truncate">{project.projectName}</p>
                          {isOverPlan && (
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{project.clientName}</p>
                      </div>
                      <div className={cn(
                        'text-sm tabular-nums shrink-0 font-medium',
                        isOverPlan ? 'text-destructive' : 'text-foreground',
                      )}>
                        {project.actualHours.toFixed(1)}h
                        {project.plannedHours > 0 && (
                          <span className="text-muted-foreground font-normal">
                            {' / '}{project.plannedHours.toFixed(0)}h
                          </span>
                        )}
                      </div>
                    </div>
                    {project.plannedHours > 0 ? (
                      <div
                        className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
                        role="progressbar"
                        aria-valuenow={Math.round(progressPercent)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${project.projectName}: ${project.actualHours.toFixed(1)}h de ${project.plannedHours.toFixed(0)}h planejadas`}
                      >
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            isOverPlan ? 'bg-destructive' : 'bg-primary',
                          )}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">Sem horas planejadas</p>
                    )}
                  </div>
                );
              })}

              {freeHours > 0 && (
                <div className="flex items-center gap-2 pt-1 border-t text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-sm flex-1">Horas livres</span>
                  <span className="text-sm tabular-nums font-medium">{freeHours.toFixed(0)}h</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
