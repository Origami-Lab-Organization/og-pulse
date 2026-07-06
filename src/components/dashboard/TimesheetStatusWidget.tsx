import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWeekend, min } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useMyAllocationData } from '@/hooks/useMyAllocationData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MONTHS_SHORT_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const PROJECT_COLORS = [
  'bg-blue-400',
  'bg-violet-400',
  'bg-emerald-400',
  'bg-rose-400',
  'bg-cyan-400',
  'bg-amber-400',
  'bg-pink-400',
  'bg-indigo-400',
];

interface ProjectPeriod {
  projectId: string;
  projectName: string;
  actualHours: number;
  plannedHours?: number;
}

interface PeriodData {
  projects: ProjectPeriod[];
  totalActualHours: number;
  expectedHours: number;
}

function getWorkdaysElapsed(weekStart: Date, today: Date): number {
  if (today < weekStart) return 0;
  return eachDayOfInterval({ start: weekStart, end: today }).filter(d => !isWeekend(d)).length;
}

function StackedProgressBar({
  projects,
  totalActual,
  totalExpected,
}: {
  projects: ProjectPeriod[];
  totalActual: number;
  totalExpected: number;
}) {
  if (totalExpected <= 0 || projects.length === 0) {
    return <div className="h-3 w-full rounded-full bg-muted" />;
  }

  const filledRatio = Math.min(totalActual, totalExpected) / totalExpected;

  return (
    <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
      {projects.map((p, i) => {
        if (p.actualHours <= 0 || totalActual <= 0) return null;
        const segWidth = (p.actualHours / totalActual) * filledRatio * 100;
        if (segWidth <= 0) return null;
        return (
          <Tooltip key={p.projectId}>
            <TooltipTrigger asChild>
              <div
                role="presentation"
                className={cn(
                  'h-full transition-all duration-500 cursor-default',
                  PROJECT_COLORS[i % PROJECT_COLORS.length],
                )}
                style={{ width: `${segWidth}%` }}
              />
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs font-medium max-w-[200px] truncate">{p.projectName}</p>
              <p className="text-xs text-muted-foreground">{p.actualHours.toFixed(1)}h lançadas</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

export function TimesheetStatusWidget() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const [view, setView] = useState<'month' | 'week'>('month');

  const today = new Date();
  const monthKey = format(today, 'yyyy-MM');
  const monthName = MONTHS_PT[today.getMonth()];

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

  const weekLabel =
    weekStart.getMonth() === weekEnd.getMonth()
      ? `${format(weekStart, 'd')}–${format(weekEnd, 'd')} ${MONTHS_SHORT_PT[weekStart.getMonth()]}`
      : `${format(weekStart, 'd')} ${MONTHS_SHORT_PT[weekStart.getMonth()]}–${format(weekEnd, 'd')} ${MONTHS_SHORT_PT[weekEnd.getMonth()]}`;

  const { data: monthAllocation, isLoading: loadingMonth } = useMyAllocationData(employee?.id, monthKey);

  const { data: weekAllocation, isLoading: loadingWeek } = useQuery({
    queryKey: ['my-weekly-timesheet', employee?.id, weekStartStr, weekEndStr],
    queryFn: async (): Promise<PeriodData> => {
      if (!employee?.id) return { projects: [], totalActualHours: 0, expectedHours: 0 };

      const { data: members } = await supabase
        .from('project_members')
        .select('id, project_id, projects!inner(name)')
        .eq('employee_id', employee.id);

      if (!members?.length) return { projects: [], totalActualHours: 0, expectedHours: 0 };

      const memberIds = members.map((m) => m.id);

      const { data: entries } = await supabase
        .from('project_timesheets')
        .select('project_member_id, project_id, hours')
        .in('project_member_id', memberIds)
        .gte('work_date', weekStartStr)
        .lte('work_date', weekEndStr);

      const projectMap = new Map<string, ProjectPeriod>();
      (entries || []).forEach((entry) => {
        const member = members.find((m) => m.id === entry.project_member_id);
        if (!member) return;
        if (!projectMap.has(entry.project_id)) {
          projectMap.set(entry.project_id, {
            projectId: entry.project_id,
            projectName: (member.projects as { name: string }).name,
            actualHours: 0,
          });
        }
        projectMap.get(entry.project_id)!.actualHours += Number(entry.hours);
      });

      const projects = Array.from(projectMap.values()).sort((a, b) =>
        a.projectName.localeCompare(b.projectName),
      );
      const totalActualHours = projects.reduce((s, p) => s + p.actualHours, 0);
      const workdays = getWorkdaysElapsed(weekStart, min([today, weekEnd]));
      const expectedHours = (employee.jornada_diaria ?? 8) * workdays;

      return { projects, totalActualHours, expectedHours };
    },
    enabled: !!employee?.id,
  });

  const isLoading = view === 'month' ? loadingMonth : loadingWeek;

  if (isLoading) {
    return (
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Timesheet
            </CardTitle>
            <Skeleton className="h-5 w-32 rounded-full" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-3 w-full rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-9 w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  const periodData: PeriodData =
    view === 'month'
      ? {
          projects: (monthAllocation?.projects ?? []).map((p) => ({
            projectId: p.projectId,
            projectName: p.projectName,
            actualHours: p.actualHours,
            plannedHours: p.plannedHours,
          })),
          totalActualHours: monthAllocation?.totalActualHours ?? 0,
          expectedHours: monthAllocation?.expectedHours ?? 0,
        }
      : (weekAllocation ?? { projects: [], totalActualHours: 0, expectedHours: 0 });

  const { projects, totalActualHours: actual, expectedHours: expected } = periodData;
  const ratio = expected > 0 ? actual / expected : actual > 0 ? 1 : 0;

  const statusInfo =
    projects.length === 0 && actual === 0
      ? { label: 'Sem lançamentos', classes: 'bg-muted text-muted-foreground border-0' }
      : ratio >= 0.9
      ? { label: 'Em dia', classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-0' }
      : ratio >= 0.5
      ? { label: 'Atenção', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-0' }
      : { label: 'Pendente', classes: 'bg-destructive/10 text-destructive border-0' };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground min-w-0">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">
              Timesheet — {view === 'month' ? monthName : weekLabel}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex rounded-md border border-border overflow-hidden text-[11px]">
              <button
                className={cn(
                  'px-2.5 py-1 transition-colors',
                  view === 'week'
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50',
                )}
                onClick={() => setView('week')}
              >
                Semana
              </button>
              <button
                className={cn(
                  'px-2.5 py-1 border-l border-border transition-colors',
                  view === 'month'
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50',
                )}
                onClick={() => setView('month')}
              >
                Mês
              </button>
            </div>
            <Badge className={cn('text-xs', statusInfo.classes)}>{statusInfo.label}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1">
        <div className="space-y-1.5">
          <StackedProgressBar
            projects={projects}
            totalActual={actual}
            totalExpected={expected}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="tabular-nums">{actual.toFixed(1)}h lançadas</span>
            <span className="tabular-nums">{expected.toFixed(1)}h esperadas até hoje</span>
          </div>
        </div>

        {projects.length > 0 ? (
          <div className="space-y-1 flex-1">
            {projects.slice(0, 4).map((p, i) => (
              <div
                key={p.projectId}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 transition-colors"
              >
                <div
                  className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    PROJECT_COLORS[i % PROJECT_COLORS.length],
                  )}
                />
                <p className="flex-1 text-xs text-muted-foreground truncate">{p.projectName}</p>
                <span className="text-xs font-medium text-foreground tabular-nums shrink-0">
                  {p.actualHours.toFixed(0)}h
                  {p.plannedHours !== undefined && (
                    <span className="text-muted-foreground font-normal">
                      {' '}/ {p.plannedHours.toFixed(0)}h
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground flex-1">
            {view === 'week'
              ? 'Nenhuma hora lançada nesta semana.'
              : 'Nenhuma hora lançada este mês ainda.'}
          </p>
        )}

        <div className="border-t border-border/50 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/my-timesheet')}
            className="w-full gap-2"
          >
            <Clock className="h-3.5 w-3.5" />
            Lançar Horas
            <ArrowRight className="h-3.5 w-3.5 ml-auto" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
