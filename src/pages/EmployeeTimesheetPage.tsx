import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, isBefore, startOfWeek, addDays, addWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TimesheetWeekSelector } from '@/components/timesheets/TimesheetWeekSelector';
import { TimesheetByEmployee } from '@/components/timesheets/TimesheetByEmployee';
import { TimesheetWeekStatus } from '@/components/timesheets/TimesheetWeekStatus';
import { SubmitProjectDialog, SubmitAllProjectsDialog } from '@/components/timesheets/SubmitWeekDialog';
import { AdminWeekEditDialog } from '@/components/timesheets/AdminWeekEditDialog';
import {
  useActiveProjectsWithMembers,
  useTimesheetsByDateRange,
  getWeekStart,
  getWeekEnd,
  getWeekDays,
  groupByEmployee,
  EmployeeWithProjects,
} from '@/hooks/useTimesheetData';
import { useHolidays } from '@/hooks/useHolidays';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  useProjectWeekSubmissions,
  useSubmitProjectWeek,
  useSubmitAllProjects,
  useAdminBatchEditTimesheets,
} from '@/hooks/useTimesheetSubmissions';
import { BatchEditChange } from '@/types/timesheetSubmission';

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function EmployeeTimesheetPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const monthParam = searchParams.get('month');

  // Initialize week to the first Monday of the month param, or current week
  const [selectedDate, setSelectedDate] = useState(() => {
    if (monthParam) {
      const [y, m] = monthParam.split('-').map(Number);
      const monthStart = new Date(y, m - 1, 1);
      return startOfWeek(monthStart, { weekStartsOn: 1 });
    }
    return new Date();
  });
  const hasInitialized = useRef(false);

  const [showSubmitProjectDialog, setShowSubmitProjectDialog] = useState(false);
  const [showSubmitAllDialog, setShowSubmitAllDialog] = useState(false);
  const [showAdminEditDialog, setShowAdminEditDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string; hours: number } | null>(null);
  const [adminEditProjectId, setAdminEditProjectId] = useState<string | null>(null);

  const { employee: authEmployee } = useAuth();
  const isAdmin = authEmployee?.isAdmin ?? false;
  const canSubmit = authEmployee?.is_gerente || isAdmin;

  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const startDateStr = format(weekStart, 'yyyy-MM-dd');
  const endDateStr = format(weekEnd, 'yyyy-MM-dd');

  // Fetch employee info
  const { data: employeeInfo } = useQuery({
    queryKey: ['employee-info', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const { data, error } = await supabase
        .from('employees')
        .select('id, nome, cargo, data_admissao, jornada_mensal')
        .eq('id', employeeId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!employeeId,
  });

  const { data: projects, isLoading: isLoadingProjects } = useActiveProjectsWithMembers({
    isAdmin,
    employeeId: authEmployee?.id,
  });

  const { data: timesheetEntries, isLoading: isLoadingTimesheets } = useTimesheetsByDateRange(
    startDateStr,
    endDateStr
  );

  const { data: holidays = [] } = useHolidays();

  // Filter to only this employee's data
  const employeeData = useMemo((): EmployeeWithProjects[] => {
    if (!projects || !employeeId) return [];
    const allEmployees = groupByEmployee(projects);
    return allEmployees.filter(e => e.employeeId === employeeId);
  }, [projects, employeeId]);

  // Project IDs for this employee
  const projectIds = useMemo(() => {
    if (employeeData.length === 0) return [];
    return employeeData[0].projects.map(p => p.projectId);
  }, [employeeData]);

  const { data: submissions = new Map(), isLoading: isLoadingSubmissions } = useProjectWeekSubmissions(
    startDateStr,
    projectIds
  );

  const submitProjectWeek = useSubmitProjectWeek();
  const submitAllProjects = useSubmitAllProjects();
  const adminBatchEdit = useAdminBatchEditTimesheets();

  const totalHours = useMemo(() => {
    if (!timesheetEntries || employeeData.length === 0) return 0;
    const memberIds = new Set(employeeData[0].projects.map(p => p.memberId));
    return timesheetEntries
      .filter(e => memberIds.has(e.projectMemberId))
      .reduce((sum, e) => sum + e.hours, 0);
  }, [timesheetEntries, employeeData]);

  const pendingProjects = useMemo(() => {
    if (employeeData.length === 0 || !timesheetEntries) return [];
    return employeeData[0].projects
      .filter(p => {
        const submission = submissions.get(p.projectId);
        return !submission || submission.status !== 'submitted';
      })
      .map(p => {
        const projectHours = timesheetEntries
          .filter(e => e.projectMemberId === p.memberId)
          .reduce((sum, e) => sum + e.hours, 0);
        return { projectId: p.projectId, totalHours: projectHours };
      })
      .filter(p => p.totalHours > 0);
  }, [employeeData, timesheetEntries, submissions]);

  const isLoading = isLoadingProjects || isLoadingTimesheets || isLoadingSubmissions;

  // Navigate to first unsubmitted week on initial load
  useEffect(() => {
    if (hasInitialized.current || isLoading || !monthParam || projectIds.length === 0) return;
    hasInitialized.current = true;

    const [y, m] = monthParam.split('-').map(Number);
    const monthStart = startOfMonth(new Date(y, m - 1, 1));
    const monthEnd = endOfMonth(monthStart);

    // Generate all week starts (Mondays) in the month
    let weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const weeks: Date[] = [];
    while (weekStart <= monthEnd) {
      if (addDays(weekStart, 4) >= monthStart) {
        weeks.push(weekStart);
      }
      weekStart = addWeeks(weekStart, 1);
    }

    // Find first week where not all projects are submitted
    for (const week of weeks) {
      const weekStr = format(week, 'yyyy-MM-dd');
      const allSubmitted = projectIds.every(pid => {
        const sub = submissions.get(pid);
        return sub && sub.status === 'submitted';
      });
      // Check submissions for this specific week - we need per-week check
      // Since submissions state is for the currently selected week, 
      // we just pick the first week and let it load
      if (!allSubmitted) {
        setSelectedDate(week);
        return;
      }
    }
    // All submitted, stay on current week
    setSelectedDate(new Date());
  }, [isLoading, monthParam, projectIds, submissions]);

  // Check if week is before admission
  const isWeekBeforeAdmission = useMemo(() => {
    if (!employeeInfo?.data_admissao) return false;
    const admDate = parseLocalDate(employeeInfo.data_admissao);
    return isBefore(weekEnd, admDate);
  }, [employeeInfo?.data_admissao, weekEnd]);

  const handleSubmitProject = (projectId: string, projectName: string, totalHours: number) => {
    setSelectedProject({ id: projectId, name: projectName, hours: totalHours });
    setShowSubmitProjectDialog(true);
  };

  const handleConfirmSubmitProject = () => {
    if (!selectedProject) return;
    submitProjectWeek.mutate({
      projectId: selectedProject.id,
      weekStart: startDateStr,
      totalHours: selectedProject.hours,
    }, {
      onSuccess: () => {
        setShowSubmitProjectDialog(false);
        setSelectedProject(null);
      },
    });
  };

  const handleSubmitAll = () => setShowSubmitAllDialog(true);

  const handleConfirmSubmitAll = () => {
    submitAllProjects.mutate({
      projects: pendingProjects,
      weekStart: startDateStr,
    }, {
      onSuccess: () => setShowSubmitAllDialog(false),
    });
  };

  const handleAdminEditProject = (projectId: string) => {
    setAdminEditProjectId(projectId);
    setShowAdminEditDialog(true);
  };

  const handleAdminBatchSave = (changes: BatchEditChange[], justification: string) => {
    adminBatchEdit.mutate({ changes, justification }, {
      onSuccess: () => {
        setShowAdminEditDialog(false);
        setAdminEditProjectId(null);
      },
    });
  };

  const projectsForAdminEdit = useMemo(() => {
    if (!projects) return [];
    if (adminEditProjectId) return projects.filter(p => p.projectId === adminEditProjectId);
    return projects;
  }, [projects, adminEditProjectId]);

  return (
    <AppLayout
      title={employeeInfo?.nome || 'Funcionário'}
      description={employeeInfo ? `${employeeInfo.cargo} · Jornada: ${employeeInfo.jornada_mensal}h/mês` : ''}
      breadcrumbs={[
        { label: 'Alocação', href: '/alocacao' },
        { label: employeeInfo?.nome || '...' },
      ]}
    >
      <div className="space-y-6">
        {/* Header with back button and week selector */}
        <div className="flex items-center justify-between gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate('/alocacao')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <TimesheetWeekSelector
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
            />
        </div>

        {isWeekBeforeAdmission ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Funcionário ainda não admitido neste período.</p>
            {employeeInfo?.data_admissao && (
              <p className="text-sm mt-1">
                Data de admissão: {format(parseLocalDate(employeeInfo.data_admissao), 'dd/MM/yyyy')}
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Week Status */}
            {!isLoading && (
              <TimesheetWeekStatus
                submissions={submissions}
                totalProjects={projectIds.length}
                totalHours={totalHours}
                onSubmitAll={handleSubmitAll}
                isSubmitting={submitAllProjects.isPending}
                canSubmit={canSubmit}
              />
            )}

            {/* Content */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            ) : (
              <TimesheetByEmployee
                employees={employeeData}
                weekDays={weekDays}
                timesheetEntries={timesheetEntries || []}
                holidays={holidays}
                submissions={submissions}
                isAdmin={isAdmin}
              />
            )}
          </>
        )}
      </div>

      {/* Submit Project Dialog */}
      <SubmitProjectDialog
        open={showSubmitProjectDialog}
        onOpenChange={setShowSubmitProjectDialog}
        projectName={selectedProject?.name || ''}
        weekStart={weekStart}
        weekEnd={weekEnd}
        totalHours={selectedProject?.hours || 0}
        onConfirm={handleConfirmSubmitProject}
        isSubmitting={submitProjectWeek.isPending}
      />

      {/* Submit All Projects Dialog */}
      <SubmitAllProjectsDialog
        open={showSubmitAllDialog}
        onOpenChange={setShowSubmitAllDialog}
        pendingCount={pendingProjects.length}
        weekStart={weekStart}
        weekEnd={weekEnd}
        totalHours={pendingProjects.reduce((sum, p) => sum + p.totalHours, 0)}
        onConfirm={handleConfirmSubmitAll}
        isSubmitting={submitAllProjects.isPending}
      />

      {/* Admin Week Edit Dialog */}
      <AdminWeekEditDialog
        open={showAdminEditDialog}
        onOpenChange={(open) => {
          setShowAdminEditDialog(open);
          if (!open) setAdminEditProjectId(null);
        }}
        weekStart={weekStart}
        weekEnd={weekEnd}
        projects={projectsForAdminEdit}
        weekDays={weekDays}
        timesheetEntries={timesheetEntries || []}
        holidays={holidays}
        onSave={handleAdminBatchSave}
        isSaving={adminBatchEdit.isPending}
      />
    </AppLayout>
  );
}
