import { useState, useMemo, useCallback } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Loader2, CheckCircle2, Send, Check, AlertCircle } from 'lucide-react';
import { MyTimesheetAllocation } from '@/components/timesheets/MyTimesheetAllocation';
import { TimesheetWeekSelector } from '@/components/timesheets/TimesheetWeekSelector';
import { TimesheetWeekRow } from '@/components/timesheets/TimesheetWeekRow';
import type { SaveStatusInfo } from '@/components/timesheets/TimesheetWeekRow';
import { SubmitAllProjectsDialog } from '@/components/timesheets/SubmitWeekDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProjectMemberships } from '@/hooks/useMyTimesheetData';
import { useTimesheetsByDateRange, getWeekStart, getWeekDays } from '@/hooks/useTimesheetData';
import { useProjectWeekSubmissions, useSubmitAllProjects } from '@/hooks/useTimesheetSubmissions';
import { useHolidays } from '@/hooks/useHolidays';
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

  const projectIds = useMemo(() => projects.map(p => p.projectId), [projects]);
  const { data: submissions = new Map() } = useProjectWeekSubmissions(startDate, projectIds);

  const { data: holidays = [] } = useHolidays();

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

  // Compute daily totals across all projects for soft limit validation
  const allDailyTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const entry of timesheetEntries) {
      totals[entry.workDate] = (totals[entry.workDate] ?? 0) + entry.hours;
    }
    return totals;
  }, [timesheetEntries]);

  // Track local (unsaved) totals per member for real-time footer
  const [localTotals, setLocalTotals] = useState<Record<string, number>>({});

  // Track save status from all rows
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatusInfo>>({});

  const handleLocalTotalChange = useCallback((memberId: string, total: number) => {
    setLocalTotals(prev => {
      if (prev[memberId] === total) return prev;
      return { ...prev, [memberId]: total };
    });
  }, []);

  const handleSaveStatusChange = useCallback((memberId: string, info: SaveStatusInfo) => {
    setSaveStatuses(prev => ({ ...prev, [memberId]: info }));
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

  // Real-time total: use local totals when available, fall back to server data
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
    return total;
  }, [projects, localTotals, projectHoursMap]);

  const allProjectsLocked = useMemo(() => {
    return projects.every(p => {
      const submission = submissions.get(p.projectId);
      if (submission?.status === 'submitted') return true;
      const member = p.members[0];
      if (!member) return false;
      const memberEntries = timesheetEntries.filter(
        e => e.projectMemberId === member.memberId
      );
      return memberEntries.length > 0 && memberEntries.every(e => e.isLocked);
    });
  }, [projects, timesheetEntries, submissions]);

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
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Você não está alocado em nenhum projeto ativo.</p>
          <p className="text-sm">Quando for incluído em um projeto, ele aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <TimesheetWeekSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
              {/* Header único */}
              <div className="grid grid-cols-[1fr_repeat(5,60px)_80px_120px] gap-2 items-center py-2 px-3 border-b text-xs font-medium text-muted-foreground">
                <div>Projeto</div>
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

              {/* Uma linha por projeto */}
              {projects.map((project) => {
                const member = project.members[0];
                const submission = submissions.get(project.projectId);
                const isSubmitted = submission?.status === 'submitted';
                const memberEntries = timesheetEntries.filter(
                  e => e.projectMemberId === member.memberId
                );
                const isLocked = isSubmitted || (memberEntries.length > 0 && memberEntries.every(e => e.isLocked));
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
                    subLabel={project.clientName}
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
                    onSaveStatusChange={handleSaveStatusChange}
                  />
                );
              })}

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
