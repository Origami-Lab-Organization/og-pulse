import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';
import { useMyAllocationData } from '@/hooks/useMyAllocationData';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MyTimesheetAllocationProps {
  employeeId: string | undefined;
  monthKey: string; // yyyy-MM
}

const SegmentedBar = ({
  actualPercent,
  plannedRemainingPercent,
  tooltipContent,
  expectedPercent,
}: {
  actualPercent: number;
  plannedRemainingPercent: number;
  tooltipContent: string;
  expectedPercent?: number;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative w-full bg-muted rounded-full h-2 overflow-hidden">
          <div className="flex h-full">
            {actualPercent > 0 && (
              <div
                className="h-full bg-green-700 dark:bg-green-600 transition-all"
                style={{ width: `${Math.min(actualPercent, 100)}%` }}
              />
            )}
            {plannedRemainingPercent > 0 && (
              <div
                className="h-full bg-green-300 dark:bg-green-800 transition-all"
                style={{ width: `${Math.min(plannedRemainingPercent, 100 - Math.min(actualPercent, 100))}%` }}
              />
            )}
          </div>
          {expectedPercent !== undefined && expectedPercent > 0 && (
            <div
              className="absolute top-[-3px] bottom-[-3px] w-0.5 bg-foreground/70 z-10 rounded-full"
              style={{ left: `${Math.min(expectedPercent, 100)}%` }}
            />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{tooltipContent}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const MyTimesheetAllocation = ({ employeeId, monthKey }: MyTimesheetAllocationProps) => {
  const { data, isLoading } = useMyAllocationData(employeeId, monthKey);

  const monthLabel = format(parseISO(`${monthKey}-01`), "MMMM/yyyy", { locale: ptBR });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full mb-3" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.projects.length === 0) return null;

  const actualPercent = data.monthlyCapacity > 0
    ? (data.totalActualHours / data.monthlyCapacity) * 100
    : 0;
  const plannedRemainingHours = Math.max(data.totalPlannedHours - data.totalActualHours, 0);
  const plannedRemainingPercent = data.monthlyCapacity > 0
    ? (plannedRemainingHours / data.monthlyCapacity) * 100
    : 0;
  const freeHours = Math.max(data.monthlyCapacity - data.totalPlannedHours, 0);
  const expectedPercent = data.monthlyCapacity > 0
    ? (data.expectedHours / data.monthlyCapacity) * 100
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <span className="capitalize">Minha Alocação — {monthLabel}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Overall segmented bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Capacidade mensal</span>
            <span className="font-medium">
              {data.totalActualHours.toFixed(0)}h realizado de {data.monthlyCapacity}h (esperado: {data.expectedHours.toFixed(0)}h)
            </span>
          </div>
          <SegmentedBar
            actualPercent={actualPercent}
            plannedRemainingPercent={plannedRemainingPercent}
            expectedPercent={expectedPercent}
            tooltipContent={`Realizado: ${data.totalActualHours.toFixed(0)}h · Esperado: ${data.expectedHours.toFixed(0)}h · Planejado restante: ${plannedRemainingHours.toFixed(0)}h · Livre: ${freeHours.toFixed(0)}h`}
          />
          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-700 dark:bg-green-600" /> Realizado</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-300 dark:bg-green-800" /> Plan. restante</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-sm bg-muted border" /> Livre</span>
            <span className="flex items-center gap-1"><span className="inline-block w-[2px] h-3 rounded-full bg-foreground/70" /> Esperado</span>
          </div>
        </div>

        {/* Per-project table */}
        <div className="rounded-md border">
          <div className="grid grid-cols-[1fr_70px_70px_1fr_50px] gap-2 px-3 py-2 border-b text-xs font-medium text-muted-foreground">
            <div>Projeto</div>
            <div className="text-right">Plan.</div>
            <div className="text-right">Real.</div>
            <div>Progresso</div>
            <div className="text-right">%</div>
          </div>

          {data.projects.map((project) => {
            const pActual = project.plannedHours > 0
              ? (project.actualHours / project.plannedHours) * 100
              : project.actualHours > 0 ? 100 : 0;

            const pRemaining = project.plannedHours > 0
              ? (Math.max(project.plannedHours - project.actualHours, 0) / project.plannedHours) * 100
              : 0;

            const isOverPlan = project.actualHours > project.plannedHours && project.plannedHours > 0;

            return (
              <div
                key={project.projectId}
                className="grid grid-cols-[1fr_70px_70px_1fr_50px] gap-2 px-3 py-2 border-b last:border-b-0 items-center text-sm"
              >
                <div className="truncate">
                  <span className="text-muted-foreground">{project.clientName}</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="font-medium">{project.projectName}</span>
                </div>
                <div className="text-right tabular-nums">
                  {project.plannedHours > 0 ? `${project.plannedHours.toFixed(0)}h` : '—'}
                </div>
                <div className={cn("text-right tabular-nums font-medium", isOverPlan && "text-destructive")}>
                  {project.actualHours > 0 ? `${project.actualHours.toFixed(1)}h` : '—'}
                </div>
                <div className="flex items-center">
                  <SegmentedBar
                    actualPercent={Math.min(pActual, 100)}
                    plannedRemainingPercent={pRemaining}
                    tooltipContent={`Realizado: ${project.actualHours.toFixed(1)}h · Planejado: ${project.plannedHours.toFixed(0)}h`}
                  />
                </div>
                <div className={cn("text-right text-xs tabular-nums", isOverPlan && "text-destructive font-medium")}>
                  {project.plannedHours > 0 ? `${Math.min(pActual, 100).toFixed(0)}%` : '—'}
                </div>
              </div>
            );
          })}

          {/* Free hours row */}
          {freeHours > 0 && (
            <div className="grid grid-cols-[1fr_70px_70px_1fr_50px] gap-2 px-3 py-2 items-center text-sm text-muted-foreground bg-muted/30">
              <div className="italic">Sem alocação</div>
              <div className="text-right tabular-nums">{freeHours.toFixed(0)}h</div>
              <div className="text-right">—</div>
              <div></div>
              <div></div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
