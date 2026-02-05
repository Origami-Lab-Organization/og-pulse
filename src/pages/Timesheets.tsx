import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { TimesheetWeekSelector } from '@/components/timesheets/TimesheetWeekSelector';
import { TimesheetByProject } from '@/components/timesheets/TimesheetByProject';
import { TimesheetByEmployee } from '@/components/timesheets/TimesheetByEmployee';
import {
  useActiveProjectsWithMembers,
  useTimesheetsByDateRange,
  getWeekStart,
  getWeekEnd,
  getWeekDays,
  groupByEmployee,
} from '@/hooks/useTimesheetData';

type ViewMode = 'project' | 'employee';

export default function Timesheets() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('project');

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

  const employees = useMemo(() => {
    if (!projects) return [];
    return groupByEmployee(projects);
  }, [projects]);

  const isLoading = isLoadingProjects || isLoadingTimesheets;

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
          />
        ) : (
          <TimesheetByEmployee
            employees={employees}
            weekDays={weekDays}
            timesheetEntries={timesheetEntries || []}
          />
        )}
      </div>
    </AppLayout>
  );
}
