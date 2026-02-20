import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { TimesheetWeekSelector } from '@/components/timesheets/TimesheetWeekSelector';
import { TimesheetByProject } from '@/components/timesheets/TimesheetByProject';
import { TimesheetByEmployee } from '@/components/timesheets/TimesheetByEmployee';
import { TimesheetWeekStatus } from '@/components/timesheets/TimesheetWeekStatus';
import { SubmitProjectDialog, SubmitAllProjectsDialog } from '@/components/timesheets/SubmitWeekDialog';
import { AdminWeekEditDialog } from '@/components/timesheets/AdminWeekEditDialog';
import { AllocationOverview } from '@/components/timesheets/AllocationOverview';
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

type ViewMode = 'project' | 'employee' | 'allocation';

export default function Timesheets() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('project');
  const [searchQuery, setSearchQuery] = useState('');
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

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (!searchQuery) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(p =>
      p.projectName.toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q)
    );
  }, [projects, searchQuery]);
  
  // Get all project IDs for fetching submissions
  const projectIds = useMemo(() => {
    return filteredProjects.map(p => p.projectId);
  }, [filteredProjects]);
  
  const { data: submissions = new Map(), isLoading: isLoadingSubmissions } = useProjectWeekSubmissions(
    startDateStr, 
    projectIds
  );

  const submitProjectWeek = useSubmitProjectWeek();
  const submitAllProjects = useSubmitAllProjects();
  const adminBatchEdit = useAdminBatchEditTimesheets();

  const employees = useMemo(() => {
    return groupByEmployee(filteredProjects);
  }, [filteredProjects]);

  const totalHours = useMemo(() => {
    return (timesheetEntries || []).reduce((sum, e) => sum + e.hours, 0);
  }, [timesheetEntries]);

  // Calculate pending projects (those not yet submitted)
  const pendingProjects = useMemo(() => {
    if (!filteredProjects || !timesheetEntries) return [];
    
    return filteredProjects
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
  }, [filteredProjects, timesheetEntries, submissions]);

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
      title="Alocação"
      description="Gerencie alocação de horas e lançamentos dos projetos"
      breadcrumbs={[{ label: 'Alocação' }]}
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            {viewMode !== 'allocation' && (
              <TimesheetWeekSelector
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar projeto ou cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[250px]"
              />
            </div>
          </div>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="project">Por Projeto</TabsTrigger>
              <TabsTrigger value="employee">Por Funcionário</TabsTrigger>
              <TabsTrigger value="allocation">Visão de Alocação</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Week Status */}
        {!isLoading && viewMode !== 'allocation' && (
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
        {viewMode === 'allocation' ? (
          <AllocationOverview searchQuery={searchQuery} />
        ) : isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : viewMode === 'project' ? (
          <TimesheetByProject
            projects={filteredProjects}
            weekDays={weekDays}
            timesheetEntries={timesheetEntries || []}
            holidays={holidays}
            submissions={submissions}
            isAdmin={isAdmin}
            canSubmit={canSubmit}
            onSubmitProject={handleSubmitProject}
            onAdminEditProject={handleAdminEditProject}
            canEdit={canSubmit}
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
