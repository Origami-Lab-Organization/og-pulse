import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addMonths, format, parseISO, startOfMonth, endOfMonth, min, eachDayOfInterval, isWeekend } from 'date-fns';
import { isHoliday } from '@/hooks/useHolidays';
import { Holiday } from '@/types/holiday';

export interface ProjectAllocation {
  projectId: string;
  projectName: string;
  clientName: string;
  plannedHours: number;
  actualHours: number;
}

export interface MyAllocationData {
  projects: ProjectAllocation[];
  totalPlannedHours: number;
  totalActualHours: number;
  totalActivityHours: number;
  monthlyCapacity: number;
  expectedHours: number;
}

function countWorkingDays(start: Date, end: Date, holidays: Holiday[]): number {
  const days = eachDayOfInterval({ start, end });
  let count = 0;
  for (const day of days) {
    if (isWeekend(day)) continue;
    if (isHoliday(day, holidays)) continue;
    count++;
  }
  return count;
}

function calculateExpectedHours(monthKey: string, jornada_diaria: number, holidays: Holiday[]): number {
  const monthStart = parseISO(`${monthKey}-01`);
  const upperLimit = min([new Date(), endOfMonth(monthStart)]);
  return countWorkingDays(monthStart, upperLimit, holidays) * jornada_diaria;
}

function calculateMonthlyCapacity(monthKey: string, jornada_diaria: number, holidays: Holiday[]): number {
  const monthStart = parseISO(`${monthKey}-01`);
  return countWorkingDays(monthStart, endOfMonth(monthStart), holidays) * jornada_diaria;
}

export const useMyAllocationData = (employeeId: string | undefined, monthKey: string) => {
  return useQuery({
    queryKey: ['my-allocation-data', employeeId, monthKey],
    queryFn: async (): Promise<MyAllocationData> => {
      if (!employeeId || !monthKey) {
        return { projects: [], totalPlannedHours: 0, totalActualHours: 0, totalActivityHours: 0, monthlyCapacity: 0, expectedHours: 0 };
      }

      // 1. Get employee's monthly capacity and daily hours
      const [{ data: empData }, { data: holidays }] = await Promise.all([
        supabase
          .from('employees')
          .select('jornada_diaria')
          .eq('id', employeeId)
          .single(),
        supabase
          .from('company_holidays')
          .select('*')
          .eq('is_active', true),
      ]);

      const jornada_diaria = empData?.jornada_diaria ?? 8;
      const typedHolidays = (holidays || []) as Holiday[];
      const monthlyCapacity = calculateMonthlyCapacity(monthKey, jornada_diaria, typedHolidays);

      // 2. Get project_members for this employee with project details
      const { data: members, error: membersError } = await supabase
        .from('project_members')
        .select(`
          id,
          project_id,
          projects!inner (
            id, name, start_date, portfolio_stage,
            clients!inner (id, company_name)
          )
        `)
        .eq('employee_id', employeeId);

      if (membersError) throw membersError;
      const memberIds = (members || []).map((m: any) => m.id);

      // 3. Get project_member_months for all member IDs
      const { data: memberMonths } = memberIds.length > 0
        ? await supabase
          .from('project_member_months')
          .select('project_member_id, month_number, hours')
          .in('project_member_id', memberIds)
        : { data: [] };

      // 4. Get timesheets and activity timesheets for the month
      const monthStart = `${monthKey}-01`;
      const monthDate = parseISO(monthStart);
      const nextMonth = addMonths(monthDate, 1);
      const monthEnd = format(nextMonth, 'yyyy-MM-dd');

      const [{ data: timesheets }, { data: activityTimesheets }] = await Promise.all([
        supabase
          .from('project_timesheets')
          .select(`
            project_id, project_member_id, hours,
            project_members!inner (
              employee_id,
              projects!inner (
                id, name, start_date, portfolio_stage,
                clients!inner (id, company_name)
              )
            )
          `)
          .eq('project_members.employee_id', employeeId)
          .gte('work_date', monthStart)
          .lt('work_date', monthEnd),
        supabase
          .from('activity_timesheets')
          .select('hours')
          .eq('employee_id', employeeId)
          .gte('work_date', monthStart)
          .lt('work_date', monthEnd),
      ]);

      // 5. Build allocation per project
      const projectMap = new Map<string, ProjectAllocation>();

      (members || []).forEach((member: any) => {
        const project = member.projects;
        const projectId = project.id;

        if (!projectMap.has(projectId)) {
          projectMap.set(projectId, {
            projectId,
            projectName: project.name,
            clientName: project.clients.company_name,
            plannedHours: 0,
            actualHours: 0,
          });
        }

        // Convert month_number to calendar month using project start_date
        const projectStart = parseISO(project.start_date);
        const relevantMonths = (memberMonths || []).filter(
          (mm: any) => mm.project_member_id === member.id
        );

        relevantMonths.forEach((mm: any) => {
          const calendarMonth = addMonths(projectStart, mm.month_number - 1);
          const calendarMonthKey = format(calendarMonth, 'yyyy-MM');
          if (calendarMonthKey === monthKey) {
            projectMap.get(projectId)!.plannedHours += Number(mm.hours);
          }
        });
      });

      // Aggregate actual hours from timesheets
      (timesheets || []).forEach((ts: any) => {
        const project = ts.project_members?.projects;
        const projectId = project?.id || ts.project_id;
        if (project && projectId && !projectMap.has(projectId)) {
          projectMap.set(projectId, {
            projectId,
            projectName: project.name,
            clientName: project.clients?.company_name || 'Sem cliente',
            plannedHours: 0,
            actualHours: 0,
          });
        }

        const entry = projectId ? projectMap.get(projectId) : undefined;
        if (entry) {
          entry.actualHours += Number(ts.hours);
        }
      });

      const projects = Array.from(projectMap.values()).sort((a, b) =>
        a.projectName.localeCompare(b.projectName)
      );

      const totalPlannedHours = projects.reduce((sum, p) => sum + p.plannedHours, 0);
      const totalActualHours = projects.reduce((sum, p) => sum + p.actualHours, 0);
      const totalActivityHours = (activityTimesheets || []).reduce((sum, r: any) => sum + Number(r.hours), 0);

      const expectedHours = calculateExpectedHours(monthKey, jornada_diaria, typedHolidays);

      return { projects, totalPlannedHours, totalActualHours, totalActivityHours, monthlyCapacity, expectedHours };
    },
    enabled: !!employeeId && !!monthKey,
  });
};
