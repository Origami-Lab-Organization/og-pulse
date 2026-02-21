import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addMonths, format, parseISO } from 'date-fns';

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
  monthlyCapacity: number;
}

export const useMyAllocationData = (employeeId: string | undefined, monthKey: string) => {
  return useQuery({
    queryKey: ['my-allocation-data', employeeId, monthKey],
    queryFn: async (): Promise<MyAllocationData> => {
      if (!employeeId || !monthKey) {
        return { projects: [], totalPlannedHours: 0, totalActualHours: 0, monthlyCapacity: 0 };
      }

      // 1. Get employee's monthly capacity (jornada_mensal)
      const { data: empData } = await supabase
        .from('employees')
        .select('jornada_mensal')
        .eq('id', employeeId)
        .single();

      const monthlyCapacity = empData?.jornada_mensal ?? 176;

      // 2. Get project_members for this employee with project details
      const { data: members, error: membersError } = await supabase
        .from('project_members')
        .select(`
          id,
          project_id,
          projects!inner (
            id, name, start_date,
            clients!inner (id, company_name)
          )
        `)
        .eq('employee_id', employeeId);

      if (membersError) throw membersError;
      if (!members || members.length === 0) {
        return { projects: [], totalPlannedHours: 0, totalActualHours: 0, monthlyCapacity };
      }

      const memberIds = members.map((m: any) => m.id);

      // 3. Get project_member_months for all member IDs
      const { data: memberMonths } = await supabase
        .from('project_member_months')
        .select('project_member_id, month_number, hours')
        .in('project_member_id', memberIds);

      // 4. Get timesheets for the month
      const monthStart = `${monthKey}-01`;
      const monthDate = parseISO(monthStart);
      const nextMonth = addMonths(monthDate, 1);
      const monthEnd = format(nextMonth, 'yyyy-MM-dd');

      const { data: timesheets } = await supabase
        .from('project_timesheets')
        .select('project_id, project_member_id, hours')
        .in('project_member_id', memberIds)
        .gte('work_date', monthStart)
        .lt('work_date', monthEnd);

      // 5. Build allocation per project
      const projectMap = new Map<string, ProjectAllocation>();

      members.forEach((member: any) => {
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
        const entry = projectMap.get(ts.project_id);
        if (entry) {
          entry.actualHours += Number(ts.hours);
        }
      });

      const projects = Array.from(projectMap.values()).sort((a, b) =>
        a.projectName.localeCompare(b.projectName)
      );

      const totalPlannedHours = projects.reduce((sum, p) => sum + p.plannedHours, 0);
      const totalActualHours = projects.reduce((sum, p) => sum + p.actualHours, 0);

      return { projects, totalPlannedHours, totalActualHours, monthlyCapacity };
    },
    enabled: !!employeeId && !!monthKey,
  });
};
