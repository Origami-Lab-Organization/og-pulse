import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
import { useMyAllocationData } from '@/hooks/useMyAllocationData';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MyTimesheetAllocationProps {
  employeeId: string | undefined;
  monthKey: string; // yyyy-MM
}

export const MyTimesheetAllocation = ({ employeeId, monthKey }: MyTimesheetAllocationProps) => {
  const [isOpen, setIsOpen] = useState(true);
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

  const capacityPercent = data.monthlyCapacity > 0
    ? Math.min((data.totalActualHours / data.monthlyCapacity) * 100, 100)
    : 0;

  const freeHours = Math.max(data.monthlyCapacity - data.totalPlannedHours, 0);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="capitalize">Minha Alocação — {monthLabel}</span>
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {data.totalActualHours.toFixed(0)}h / {data.monthlyCapacity}h
                </span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Overall progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Capacidade mensal</span>
                <span className="font-medium">
                  {data.totalActualHours.toFixed(0)}h realizado de {data.monthlyCapacity}h ({capacityPercent.toFixed(0)}%)
                </span>
              </div>
              <Progress value={capacityPercent} className="h-2.5" />
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
                const percent = project.plannedHours > 0
                  ? Math.min((project.actualHours / project.plannedHours) * 100, 100)
                  : project.actualHours > 0 ? 100 : 0;

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
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            isOverPlan ? "bg-destructive" : "bg-primary"
                          )}
                          style={{ width: `${Math.min(percent, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className={cn("text-right text-xs tabular-nums", isOverPlan && "text-destructive font-medium")}>
                      {project.plannedHours > 0 ? `${percent.toFixed(0)}%` : '—'}
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
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
