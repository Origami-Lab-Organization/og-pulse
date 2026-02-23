import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Loader2, CheckCircle2, BarChart3, Clock, Send } from 'lucide-react';
import { MyTimesheetAllocation } from '@/components/timesheets/MyTimesheetAllocation';
import { TimesheetWeekSelector } from '@/components/timesheets/TimesheetWeekSelector';
import { TimesheetWeekRow } from '@/components/timesheets/TimesheetWeekRow';
import { TimesheetWeekStatus } from '@/components/timesheets/TimesheetWeekStatus';
import { SubmitProjectDialog, SubmitAllProjectsDialog } from '@/components/timesheets/SubmitWeekDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useMyProjectMemberships } from '@/hooks/useMyTimesheetData';
import { useTimesheetsByDateRange, getWeekStart, getWeekDays } from '@/hooks/useTimesheetData';
import { useProjectWeekSubmissions, useSubmitProjectWeek, useSubmitAllProjects } from '@/hooks/useTimesheetSubmissions';
import { useHolidays } from '@/hooks/useHolidays';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  const [activeSection, setActiveSection] = useState<string>('timesheet');

  // Dialog states
  const [showSubmitProjectDialog, setShowSubmitProjectDialog] = useState(false);
  const [showSubmitAllDialog, setShowSubmitAllDialog] = useState(false);
  const [selectedProjectForSubmit, setSelectedProjectForSubmit] = useState<{ projectId: string; projectName: string; totalHours: number } | null>(null);

  const weekStart = getWeekStart(selectedDate);
  const weekEnd = addDays(weekStart, 4);
  const weekDays = getWeekDays(weekStart);
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');
  const monthKey = format(weekStart, 'yyyy-MM');

  const { data: projects = [], isLoading: loadingProjects } = useMyProjectMemberships(employee?.id, startDate, endDate);
  const { data: timesheetEntries = [], isLoading: loadingEntries } = useTimesheetsByDateRange(startDate, endDate);

  const projectIds = useMemo(() => projects.map(p => p.projectId), [projects]);
  const { data: submissions = new Map() } = useProjectWeekSubmissions(startDate, projectIds);

  const { data: holidays = [] } = useHolidays();

  const submitProjectWeek = useSubmitProjectWeek();
  const submitAllProjects = useSubmitAllProjects();

  const isLoading = loadingProjects || loadingEntries;
  const canSubmit = !!(employee?.is_gerente || employee?.isAdmin);

  // Calculate per-project hours
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

  const pendingProjects = useMemo(() => {
    return projects.filter(p => {
      const submission = submissions.get(p.projectId);
      const hours = projectHoursMap.get(p.projectId) || 0;
      return submission?.status !== 'submitted' && hours > 0;
    });
  }, [projects, submissions, projectHoursMap]);

  const getHolidayForDate = (dateStr: string): Holiday | null => {
    const date = parseISO(dateStr);
    return isHoliday(date, holidays);
  };

  const handleSubmitProject = () => {
    if (!selectedProjectForSubmit) return;
    submitProjectWeek.mutate({
      projectId: selectedProjectForSubmit.projectId,
      weekStart: startDate,
      totalHours: selectedProjectForSubmit.totalHours,
    }, {
      onSuccess: () => setShowSubmitProjectDialog(false),
    });
  };

  const handleSubmitAll = () => {
    const projectsToSubmit = pendingProjects.map(p => ({
      projectId: p.projectId,
      totalHours: projectHoursMap.get(p.projectId) || 0,
    }));
    submitAllProjects.mutate({
      projects: projectsToSubmit,
      weekStart: startDate,
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
          <div className="flex items-center justify-between flex-wrap gap-3">
            <ToggleGroup
              type="single"
              value={activeSection}
              onValueChange={(val) => { if (val) setActiveSection(val); }}
              className="justify-start"
            >
              <ToggleGroupItem value="allocation" className="gap-1.5">
                <BarChart3 className="h-4 w-4" />
                Minha Alocação
              </ToggleGroupItem>
              <ToggleGroupItem value="timesheet" className="gap-1.5">
                <Clock className="h-4 w-4" />
                Lançar Horas
              </ToggleGroupItem>
            </ToggleGroup>
            <TimesheetWeekSelector selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </div>

          {activeSection === 'allocation' && (
            <MyTimesheetAllocation employeeId={employee?.id} monthKey={monthKey} />
          )}

          {activeSection === 'timesheet' && (
            <>
              <TimesheetWeekStatus
                submissions={submissions}
                totalProjects={projects.length}
                totalHours={totalHoursAllProjects}
                onSubmitAll={() => setShowSubmitAllDialog(true)}
                isSubmitting={submitAllProjects.isPending}
                canSubmit={canSubmit}
              />

              <Card>
                <CardContent className="pt-4">
                  {/* Header único */}
                  <div className="grid grid-cols-[1fr_repeat(5,60px)_80px_140px] gap-2 items-center py-2 px-3 border-b text-xs font-medium text-muted-foreground">
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
                    <div className="text-right pr-2">Status</div>
                  </div>

                  {/* Uma linha por projeto */}
                  {projects.map((project) => {
                    const submission = submissions.get(project.projectId);
                    const isLocked = submission?.status === 'submitted';
                    const projectTotalHours = projectHoursMap.get(project.projectId) || 0;
                    const member = project.members[0];

                    const actionContent = isLocked ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 whitespace-nowrap">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Enviado
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="secondary" className="whitespace-nowrap">Rascunho</Badge>
                        {canSubmit && projectTotalHours > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 h-6 px-2 text-xs"
                            onClick={() => {
                              setSelectedProjectForSubmit({
                                projectId: project.projectId,
                                projectName: project.projectName,
                                totalHours: projectTotalHours,
                              });
                              setShowSubmitProjectDialog(true);
                            }}
                          >
                            <Send className="h-3 w-3" />
                            Enviar
                          </Button>
                        )}
                      </div>
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
                        isLocked={isLocked}
                        isAdmin={false}
                        actionSlot={actionContent}
                      />
                    );
                  })}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Dialogs */}
      {selectedProjectForSubmit && (
        <SubmitProjectDialog
          open={showSubmitProjectDialog}
          onOpenChange={setShowSubmitProjectDialog}
          projectName={selectedProjectForSubmit.projectName}
          weekStart={weekStart}
          weekEnd={weekEnd}
          totalHours={selectedProjectForSubmit.totalHours}
          onConfirm={handleSubmitProject}
          isSubmitting={submitProjectWeek.isPending}
        />
      )}

      <SubmitAllProjectsDialog
        open={showSubmitAllDialog}
        onOpenChange={setShowSubmitAllDialog}
        pendingCount={pendingProjects.length}
        weekStart={weekStart}
        weekEnd={weekEnd}
        totalHours={pendingProjects.reduce((sum, p) => sum + (projectHoursMap.get(p.projectId) || 0), 0)}
        onConfirm={handleSubmitAll}
        isSubmitting={submitAllProjects.isPending}
      />
    </AppLayout>
  );
};

export default MyTimesheet;
