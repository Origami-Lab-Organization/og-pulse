import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TimesheetWeekSelector } from '@/components/timesheets/TimesheetWeekSelector';
import { TimesheetByProject } from '@/components/timesheets/TimesheetByProject';
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
} from '@/hooks/useTimesheetData';
import { useHolidays } from '@/hooks/useHolidays';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useProjectWeekSubmissions, 
  useSubmitProjectWeek, 
  useSubmitAllProjects,
  useAdminBatchEditTimesheets 
} from '@/hooks/useTimesheetSubmissions';
import { BatchEditChange } from '@/types/timesheetSubmission';

type ViewMode = 'project' | 'employee';

export default function Timesheets() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('project');
  const [showSubmitProjectDialog, setShowSubmitProjectDialog] = useState(false);
  const [showSubmitAllDialog, setShowSubmitAllDialog] = useState(false);
  const [showAdminEditDialog, setShowAdminEditDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string; hours: number } | null>(null);
  const [adminEditProjectId, setAdminEditProjectId] = useState<string | null>(null);
  
  const { employee } = useAuth();
  const isAdmin = employee?.isAdmin ?? false;
  const canSubmit = employee?.is_gerente || isAdmin;

  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const startDateStr = format(weekStart, 'yyyy-MM-dd');
  const endDateStr = format(weekEnd, 'yyyy-MM-dd');

  const { data: projects, isLoading: isLoadingProjects } = useActiveProjectsWithMembers({
    isAdmin,
    employeeId: employee?.id,
  });
  const { data: timesheetEntries, isLoading: isLoadingTimesheets } = useTimesheetsByDateRange(
    startDateStr,
    endDateStr
  );
  const { data: holidays = [] } = useHolidays();
  
  // Get all project IDs for fetching submissions
  const projectIds = useMemo(() => {
    return (projects || []).map(p => p.projectId);
  }, [projects]);
  
  const { data: submissions = new Map(), isLoading: isLoadingSubmissions } = useProjectWeekSubmissions(
    startDateStr, 
    projectIds
  );

  const submitProjectWeek = useSubmitProjectWeek();
  const submitAllProjects = useSubmitAllProjects();
  const adminBatchEdit = useAdminBatchEditTimesheets();

  const employees = useMemo(() => {
    if (!projects) return [];
    return groupByEmployee(projects);
  }, [projects]);

  const totalHours = useMemo(() => {
    return (timesheetEntries || []).reduce((sum, e) => sum + e.hours, 0);
  }, [timesheetEntries]);

  // Calculate pending projects (those not yet submitted)
  const pendingProjects = useMemo(() => {
    if (!projects || !timesheetEntries) return [];
    
    return projects
      .filter(p => {
        const submission = submissions.get(p.projectId);
        return !submission || submission.status !== 'submitted';
      })
      .map(p => {
        const projectHours = timesheetEntries
          .filter(e => e.projectId === p.projectId)
          .reduce((sum, e) => sum + e.hours, 0);
        return {
          projectId: p.projectId,
          totalHours: projectHours,
        };
      })
      .filter(p => p.totalHours > 0);
  }, [projects, timesheetEntries, submissions]);

  const isLoading = isLoadingProjects || isLoadingTimesheets || isLoadingSubmissions;

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

  const handleSubmitAll = () => {
    setShowSubmitAllDialog(true);
  };

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
    adminBatchEdit.mutate({
      changes,
      justification,
    }, {
      onSuccess: () => {
        setShowAdminEditDialog(false);
        setAdminEditProjectId(null);
      },
    });
  };

  // Filter projects for admin edit dialog if a specific project is selected
  const projectsForAdminEdit = useMemo(() => {
    if (!projects) return [];
    if (adminEditProjectId) {
      return projects.filter(p => p.projectId === adminEditProjectId);
    }
    return projects;
  }, [projects, adminEditProjectId]);

  return (
    <AppLayout 
      title="Timesheets"
      description="Registre as horas trabalhadas pelos funcionários nos projetos"
      breadcrumbs={[{ label: 'Timesheets' }]}
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TimesheetWeekSelector
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
          />

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="project">Por Projeto</TabsTrigger>
              <TabsTrigger value="employee">Por Funcionário</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

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
        ) : viewMode === 'project' ? (
          <TimesheetByProject
            projects={projects || []}
            weekDays={weekDays}
            timesheetEntries={timesheetEntries || []}
            holidays={holidays}
            submissions={submissions}
            isAdmin={isAdmin}
            canSubmit={canSubmit}
            onSubmitProject={handleSubmitProject}
            onAdminEditProject={handleAdminEditProject}
            isSubmitting={submitProjectWeek.isPending}
          />
        ) : (
          <TimesheetByEmployee
            employees={employees}
            weekDays={weekDays}
            timesheetEntries={timesheetEntries || []}
            holidays={holidays}
            submissions={submissions}
            isAdmin={isAdmin}
          />
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
