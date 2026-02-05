import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TimesheetWeekSelector } from '@/components/timesheets/TimesheetWeekSelector';
import { TimesheetByProject } from '@/components/timesheets/TimesheetByProject';
import { TimesheetByEmployee } from '@/components/timesheets/TimesheetByEmployee';
import { TimesheetWeekStatus } from '@/components/timesheets/TimesheetWeekStatus';
import { SubmitWeekDialog } from '@/components/timesheets/SubmitWeekDialog';
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
  useWeekSubmission, 
  useSubmitWeek, 
  useAdminBatchEditTimesheets 
} from '@/hooks/useTimesheetSubmissions';
import { BatchEditChange } from '@/types/timesheetSubmission';

type ViewMode = 'project' | 'employee';

export default function Timesheets() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('project');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showAdminEditDialog, setShowAdminEditDialog] = useState(false);
  
  const { employee } = useAuth();
  const isAdmin = employee?.isAdmin ?? false;

  const weekStart = getWeekStart(selectedDate);
  const weekEnd = getWeekEnd(selectedDate);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const startDateStr = format(weekStart, 'yyyy-MM-dd');
  const endDateStr = format(weekEnd, 'yyyy-MM-dd');

  const { data: projects, isLoading: isLoadingProjects } = useActiveProjectsWithMembers();
  const { data: timesheetEntries, isLoading: isLoadingTimesheets } = useTimesheetsByDateRange(
    startDateStr,
    endDateStr
  );
  const { data: holidays = [] } = useHolidays();
  const { data: submission, isLoading: isLoadingSubmission } = useWeekSubmission(
    startDateStr, 
    employee?.tenant_id
  );

  const submitWeek = useSubmitWeek();
  const adminBatchEdit = useAdminBatchEditTimesheets();

  const employees = useMemo(() => {
    if (!projects) return [];
    return groupByEmployee(projects);
  }, [projects]);

  const totalHours = useMemo(() => {
    return (timesheetEntries || []).reduce((sum, e) => sum + e.hours, 0);
  }, [timesheetEntries]);

  const isLocked = submission?.status === 'submitted';
  const isLoading = isLoadingProjects || isLoadingTimesheets || isLoadingSubmission;

  const handleSubmitWeek = () => {
    if (!employee?.tenant_id) return;
    
    submitWeek.mutate({
      weekStart: startDateStr,
      totalHours,
      tenantId: employee.tenant_id,
    }, {
      onSuccess: () => setShowSubmitDialog(false),
    });
  };

  const handleAdminBatchSave = (changes: BatchEditChange[], justification: string) => {
    adminBatchEdit.mutate({
      changes,
      justification,
    }, {
      onSuccess: () => setShowAdminEditDialog(false),
    });
  };

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
            submission={submission || null}
            totalHours={totalHours}
            onSubmit={() => setShowSubmitDialog(true)}
            isSubmitting={submitWeek.isPending}
            canSubmit={!isLocked && (employee?.is_gerente || isAdmin)}
            isAdmin={isAdmin}
            onAdminEdit={() => setShowAdminEditDialog(true)}
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
            isLocked={isLocked}
            isAdmin={isAdmin}
          />
        ) : (
          <TimesheetByEmployee
            employees={employees}
            weekDays={weekDays}
            timesheetEntries={timesheetEntries || []}
            holidays={holidays}
            isLocked={isLocked}
            isAdmin={isAdmin}
          />
        )}
      </div>

      {/* Submit Week Dialog */}
      <SubmitWeekDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        weekStart={weekStart}
        weekEnd={weekEnd}
        onConfirm={handleSubmitWeek}
        isSubmitting={submitWeek.isPending}
      />

      {/* Admin Week Edit Dialog */}
      <AdminWeekEditDialog
        open={showAdminEditDialog}
        onOpenChange={setShowAdminEditDialog}
        weekStart={weekStart}
        weekEnd={weekEnd}
        projects={projects || []}
        weekDays={weekDays}
        timesheetEntries={timesheetEntries || []}
        holidays={holidays}
        onSave={handleAdminBatchSave}
        isSaving={adminBatchEdit.isPending}
      />
    </AppLayout>
  );
}
