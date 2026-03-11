import { useState, useMemo, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Loader2, CheckCircle2, Send, Check, AlertCircle, Info, CircleAlert } from 'lucide-react';
import { MyTimesheetAllocation } from '@/components/timesheets/MyTimesheetAllocation';
import { useMyAllocationData } from '@/hooks/useMyAllocationData';
import { TimesheetWeekSelector } from '@/components/timesheets/TimesheetWeekSelector';
import { TimesheetWeekRow } from '@/components/timesheets/TimesheetWeekRow';
import type { SaveStatusInfo } from '@/components/timesheets/TimesheetWeekRow';
import { ActivityTimesheetRow } from '@/components/timesheets/ActivityTimesheetRow';
import { SubmitAllProjectsDialog } from '@/components/timesheets/SubmitWeekDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProjectMemberships } from '@/hooks/useMyTimesheetData';
import { useTimesheetsByDateRange, getWeekStart, getWeekDays } from '@/hooks/useTimesheetData';
import { useSubmitAllProjects } from '@/hooks/useTimesheetSubmissions';
import { useHolidays } from '@/hooks/useHolidays';
import { useMyActivityTypes } from '@/hooks/useMyActivityTypes';
import { useActivityTimesheetsByRange } from '@/hooks/useActivityTimesheets';
import { Badge } from '@/components/ui/badge';
import { format, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { isHoliday } from '@/hooks/useHolidays';
import { Holiday } from '@/types/holiday';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const MyTimesheet = () => {
  const { employee } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Dialog states
  const [showSubmitAllDialog, setShowSubmitAllDialog] = useState(false);

  const weekStart = getWeekStart(selectedDate);
  const weekEnd = addDays(weekStart, 4);
  const weekDays = getWeekDays(weekStart);
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');
  const monthKey = format(weekStart, 'yyyy-MM');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = getWeekStart(new Date());
  const isFutureWeek = weekStart > currentWeekStart;
  const allWeekDaysReady = weekEnd <= today;

  const { data: projects = [], isLoading: loadingProjects } = useMyProjectMemberships(employee?.id, startDate, endDate);
  const { data: timesheetEntries = [], isLoading: loadingEntries } = useTimesheetsByDateRange(startDate, endDate);
  const { data: myActivityTypes = [] } = useMyActivityTypes(employee?.id, endDate);
  const { data: activityEntries = [] } = useActivityTimesheetsByRange(employee?.id, startDate, endDate);

  const projectIds = useMemo(() => projects.map(p => p.projectId), [projects]);
  const myMemberIds = useMemo(() => projects.flatMap(p => p.members.map(m => m.memberId)), [projects]);

  const { data: holidays = [] } = useHolidays();
  const { data: allocationData } = useMyAllocationData(employee?.id, monthKey);

  // Set of project IDs that have no planned hours
  const unplannedProjectIds = useMemo(() => {
    const set = new Set<string>();
    if (allocationData) {
      for (const p of allocationData.projects) {
        if (p.plannedHours <= 0) set.add(p.projectId);
      }
    }
    return set;
  }, [allocationData]);

  const submitAllProjects = useSubmitAllProjects();

  const isLoading = loadingProjects || loadingEntries;
  const canSubmit = !!(employee?.is_gerente || employee?.isAdmin);

  const projectHoursMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const project of projects) {
      const memberIds = project.members.map(m => m.memberId);
      const hours = timesheetEntries
        .filter(e => memberIds.includes(e.projectMemberId))
        .reduce((sum, e) => sum + e.hours, 0);
      map.set(project.projectId, hours);
    }
    return map;
  }, [projects, timesheetEntries]);

  const totalHoursAllProjects = useMemo(() => {
    let total = 0;
    projectHoursMap.forEach(h => total += h);
    return total;
  }, [projectHoursMap]);

  // Compute daily totals across all projects + activities for soft limit validation
  const allDailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const entry of timesheetEntries) {
      if (myMemberIds.includes(entry.projectMemberId)) {
        totals[entry.workDate] = (totals[entry.workDate] ?? 0) + entry.hours;
      }
    }
    for (const entry of activityEntries) {
      totals[entry.work_date] = (totals[entry.work_date] ?? 0) + entry.hours;
    }
    return totals;
  }, [timesheetEntries, myMemberIds, activityEntries]);

  // Track local (unsaved) totals per member for real-time footer
  const [localTotals, setLocalTotals] = useState<Record<string, number>>({});

  // Track per-day hours from each member row for daily totals footer
  const [localDayHours, setLocalDayHours] = useState<Record<string, Record<string, number>>>({});

  // Track local totals for activity rows
  const [localActivityTotals, setLocalActivityTotals] = useState<Record<string, number>>({});
  const [localActivityDayHours, setLocalActivityDayHours] = useState<Record<string, Record<string, number>>>({});

  // Track save status from all rows
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatusInfo>>({});

  const handleLocalTotalChange = useCallback((memberId: string, total: number) => {
    setLocalTotals(prev => {
      if (prev[memberId] === total) return prev;
      return { ...prev, [memberId]: total };
    });
  }, []);

  const handleLocalDayHoursChange = useCallback((memberId: string, dayHours: Record<string, number>) => {
    setLocalDayHours(prev => ({ ...prev, [memberId]: dayHours }));
  }, []);

  const handleSaveStatusChange = useCallback((memberId: string, info: SaveStatusInfo) => {
    setSaveStatuses(prev => ({ ...prev, [memberId]: info }));
  }, []);

  const handleActivityLocalTotalChange = useCallback((activityTypeId: string, total: number) => {
    setLocalActivityTotals(prev => {
      if (prev[activityTypeId] === total) return prev;
      return { ...prev, [activityTypeId]: total };
    });
  }, []);

  const handleActivityLocalDayHoursChange = useCallback((activityTypeId: string, dayHours: Record<string, number>) => {
    setLocalActivityDayHours(prev => ({ ...prev, [activityTypeId]: dayHours }));
  }, []);

  // Aggregate save status across all rows
  const aggregatedSaveStatus = useMemo((): SaveStatusInfo => {
    const statuses = Object.values(saveStatuses);
    if (statuses.length === 0) return { status: 'idle' };
    if (statuses.some(s => s.status === 'error')) return { status: 'error' };
    if (statuses.some(s => s.status === 'saving')) return { status: 'saving' };
    if (statuses.some(s => s.status === 'unsaved')) return { status: 'unsaved' };
    const savedStatuses = statuses.filter(s => s.status === 'saved' && s.lastSavedAt);
    if (savedStatuses.length > 0) {
      const latest = savedStatuses.reduce((a, b) => 
        (a.lastSavedAt! > b.lastSavedAt!) ? a : b
      );
      return { status: 'saved', lastSavedAt: latest.lastSavedAt };
    }
    return { status: 'idle' };
  }, [saveStatuses]);

  // Real-time total: use local totals when available, fall back to server data (projects + activities)
  const realTimeTotalHours = useMemo(() => {
    let total = 0;
    for (const project of projects) {
      const member = project.members[0];
      if (!member) continue;
      if (localTotals[member.memberId] !== undefined) {
        total += localTotals[member.memberId];
      } else {
        total += projectHoursMap.get(project.projectId) || 0;
      }
    }
    for (const at of myActivityTypes) {
      if (localActivityTotals[at.id] !== undefined) {
        total += localActivityTotals[at.id];
      } else {
        total += activityEntries
          .filter(e => e.activity_type_id === at.id)
          .reduce((s, e) => s + e.hours, 0);
      }
    }
    return total;
  }, [projects, localTotals, projectHoursMap, myActivityTypes, localActivityTotals, activityEntries]);

  // Compute real-time daily totals across all projects + activities using local day hours
  const realTimeDailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const day of weekDays) {
      let dayTotal = 0;
      for (const project of projects) {
        const member = project.members[0];
        if (!member) continue;
        const memberDayHours = localDayHours[member.memberId];
        if (memberDayHours && memberDayHours[day.date] !== undefined) {
          dayTotal += memberDayHours[day.date];
        } else {
          const entry = timesheetEntries.find(
            e => e.projectMemberId === member.memberId && e.workDate === day.date
          );
          dayTotal += entry?.hours ?? 0;
        }
      }
      for (const at of myActivityTypes) {
        const atDayHours = localActivityDayHours[at.id];
        if (atDayHours && atDayHours[day.date] !== undefined) {
          dayTotal += atDayHours[day.date];
        } else {
          const entry = activityEntries.find(e => e.activity_type_id === at.id && e.work_date === day.date);
          dayTotal += entry?.hours ?? 0;
        }
      }
      totals[day.date] = dayTotal;
    }
    return totals;
  }, [weekDays, projects, localDayHours, timesheetEntries, myActivityTypes, localActivityDayHours, activityEntries]);

  const allProjectsLocked = useMemo(() => {
    return projects.every(p => {
      const member = p.members[0];
      if (!member) return false;
      const memberEntries = timesheetEntries.filter(
        e => e.projectMemberId === member.memberId
      );
      return memberEntries.length > 0 && memberEntries.every(e => e.isLocked);
    });
  }, [projects, timesheetEntries]);

  const getHolidayForDate = (dateStr: string): Holiday | null => {
    const date = parseISO(dateStr);
    return isHoliday(date, holidays);
  };

  const handleSubmitAll = () => {
    const projectsToSubmit = projects.map(p => ({
      projectId: p.projectId,
      totalHours: projectHoursMap.get(p.projectId) || 0,
      memberIds: p.members.map(m => m.memberId),
    }));
    submitAllProjects.mutate({
      projects: projectsToSubmit,
      weekStart: startDate,
      weekDays: weekDays.map(d => d.date),
    }, {
      onSuccess: () => setShowSubmitAllDialog(false),
    });
  };

  return (
    <AppLayout
      title="Minha Timesheet"
      description="Lance suas horas nos projetos em que você está alocado"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <TimesheetWeekSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />

              {projects.length === 0 && myActivityTypes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Você não está alocado em nenhum projeto ativo nesta semana.</p>
                  <p className="text-sm">Navegue para outra semana ou aguarde ser incluído em um projeto.</p>
                </div>
              ) : (<>
              {/* Header único */}
              <div className="grid grid-cols-[1fr_1fr_repeat(5,60px)_80px_120px] gap-2 items-center py-2 px-3 border-b text-xs font-medium text-muted-foreground">
                <div>Projeto</div>
                <div>Cliente</div>
                {weekDays.map((day) => {
                  const holiday = getHolidayForDate(day.date);
                  const isHolidayDay = !!holiday;
                  return (
                    <TooltipProvider key={day.date}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={cn(
                            "text-center rounded-md py-1",
                            isHolidayDay && "bg-destructive/10 text-destructive"
                          )}>
                            {format(new Date(day.date + 'T12:00:00'), 'EEE', { locale: ptBR })}
                            <br />
                            <span className="text-[10px]">
                              {format(new Date(day.date + 'T12:00:00'), 'dd/MM', { locale: ptBR })}
                            </span>
                            {isHolidayDay && <span className="text-[8px] block">*</span>}
                          </div>
                        </TooltipTrigger>
                        {isHolidayDay && (
                          <TooltipContent>
                            <p>{holiday.name}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
                <div className="text-right pr-2">Total</div>
                <div className="text-center">Status</div>
              </div>

              {/* Future week info banner */}
              {isFutureWeek && (
                <div className="flex items-start gap-2.5 mx-3 mt-2 px-3 py-2.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-500">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Esta semana ainda não começou. Você poderá lançar horas a partir de {format(weekStart, 'dd/MM/yyyy')}.
                  </p>
                </div>
              )}

              {/* Uma linha por projeto */}
              {projects.map((project) => {
              const member = project.members[0];
                const memberEntries = timesheetEntries.filter(
                  e => e.projectMemberId === member.memberId
                );
                const isLocked = memberEntries.length > 0 && memberEntries.every(e => e.isLocked);
                const actionContent = isLocked ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 whitespace-nowrap">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Enviado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="whitespace-nowrap">Rascunho</Badge>
                );

                return (
                  <TimesheetWeekRow
                    key={member.memberId}
                    label={project.projectName}
                    clientName={project.clientName}
                    labelExtra={unplannedProjectIds.has(project.projectId) ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <CircleAlert className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Este projeto não possui alocação planejada para o mês.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : undefined}
                    projectId={project.projectId}
                    memberId={member.memberId}
                    weekDays={weekDays}
                    existingEntries={timesheetEntries}
                    holidays={holidays}
                    isLocked={isLocked || isFutureWeek}
                    isAdmin={false}
                    actionSlot={actionContent}
                    allDailyTotals={allDailyTotals}
                    dailyWorkHours={employee?.jornada_diaria ?? 8}
                    onLocalTotalChange={handleLocalTotalChange}
                    onLocalDayHoursChange={handleLocalDayHoursChange}
                    onSaveStatusChange={handleSaveStatusChange}
                  />
                );
              })}

              {/* Atividades Internas */}
              {myActivityTypes.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-3 pt-3 pb-1">
                    <div className="flex-1 border-t" />
                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap px-2">
                      Atividades Internas
                    </span>
                    <div className="flex-1 border-t" />
                  </div>
                  {myActivityTypes.map(at => (
                    <ActivityTimesheetRow
                      key={at.id}
                      activityTypeId={at.id}
                      activityName={at.name}
                      color={at.color}
                      employeeId={employee!.id}
                      weekDays={weekDays}
                      existingEntries={activityEntries}
                      holidays={holidays}
                      allDailyTotals={allDailyTotals}
                      dailyWorkHours={employee?.jornada_diaria ?? 8}
                      onLocalTotalChange={handleActivityLocalTotalChange}
                      onLocalDayHoursChange={handleActivityLocalDayHoursChange}
                      onSaveStatusChange={handleSaveStatusChange}
                    />
                  ))}
                </>
              )}

              {/* Daily totals row */}
              <div className="grid grid-cols-[1fr_1fr_repeat(5,60px)_80px_120px] gap-2 items-center py-2 px-3 border-t bg-muted/30">
                <div className="text-xs italic text-muted-foreground">Total/dia</div>
                <div />
                {weekDays.map((day) => {
                  const dayTotal = realTimeDailyTotals[day.date] ?? 0;
                  const jornada = employee?.jornada_diaria ?? 8;
                  const diff = dayTotal - jornada;
                  let colorClass = 'text-muted-foreground'; // 0h
                  if (dayTotal > 0) {
                    if (dayTotal === jornada) {
                      colorClass = 'text-emerald-700 dark:text-emerald-400'; // exact jornada
                    } else if (dayTotal < jornada) {
                      colorClass = 'text-amber-600 dark:text-amber-400'; // under-allocated
                    } else if (diff <= 2) {
                      colorClass = 'text-amber-600 dark:text-amber-400'; // slightly over (1-2h)
                    } else {
                      colorClass = 'text-red-600 dark:text-red-400'; // way over (>2h)
                    }
                  }
                  return (
                    <div key={day.date} className={cn("text-center text-sm font-semibold tabular-nums", colorClass)}>
                      {dayTotal > 0 ? `${dayTotal.toFixed(1)}` : '0'}
                    </div>
                  );
                })}
                <div />
                <div />
              </div>

              {/* Footer: total + enviar */}
              <div className="border-t mt-2 pt-3 px-3 flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  Total da Semana: <span className="text-foreground font-semibold">{realTimeTotalHours.toFixed(1)}h</span>
                </p>
                <div className="flex items-center gap-3">
                  {/* Save status indicator */}
                  {aggregatedSaveStatus.status === 'unsaved' && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      Alterações não salvas
                    </span>
                  )}
                  {aggregatedSaveStatus.status === 'saving' && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Salvando...
                    </span>
                  )}
                  {aggregatedSaveStatus.status === 'saved' && aggregatedSaveStatus.lastSavedAt && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                      <Check className="h-3 w-3" />
                      Salvo automaticamente às {aggregatedSaveStatus.lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                  {aggregatedSaveStatus.status === 'error' && (
                    <span className="flex items-center gap-1.5 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      Erro ao salvar. Tentando novamente...
                    </span>
                  )}
                  {canSubmit && !isFutureWeek && (
                    <Button
                      size="sm"
                      onClick={() => setShowSubmitAllDialog(true)}
                      disabled={!allWeekDaysReady || allProjectsLocked || submitAllProjects.isPending}
                    >
                      <Send className="h-4 w-4 mr-1.5" />
                      Enviar
                    </Button>
                  )}
                </div>
              </div>
              </>)}
            </CardContent>
          </Card>

          <MyTimesheetAllocation employeeId={employee?.id} monthKey={monthKey} />
        </div>
      )}

      <SubmitAllProjectsDialog
        open={showSubmitAllDialog}
        onOpenChange={setShowSubmitAllDialog}
        pendingCount={projects.length}
        weekStart={weekStart}
        weekEnd={weekEnd}
        totalHours={totalHoursAllProjects}
        onConfirm={handleSubmitAll}
        isSubmitting={submitAllProjects.isPending}
      />
    </AppLayout>
  );
};

export default MyTimesheet;
