import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, addDays } from 'date-fns';

export interface ProjectMemberWithDetails {
  memberId: string;
  employeeId: string;
  employeeName: string;
  employeePhoto: string | null;
  role: string;
}

export interface ProjectWithMembers {
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  members: ProjectMemberWithDetails[];
}

export interface TimesheetEntry {
  id: string;
  projectId: string;
  projectMemberId: string;
  workDate: string;
  hours: number;
  description: string | null;
}

export interface WeekDay {
  date: string;
  dayOfWeek: number;
  label: string;
}

export const getWeekDays = (weekStart: Date): WeekDay[] => {
  // Get Monday to Friday
  const days: WeekDay[] = [];
  for (let i = 0; i < 5; i++) {
    const date = addDays(weekStart, i);
    days.push({
      date: format(date, 'yyyy-MM-dd'),
      dayOfWeek: i + 1, // 1 = Monday, 5 = Friday
      label: format(date, 'EEE', { locale: undefined }),
    });
  }
  return days;
};

export const getWeekStart = (date: Date): Date => {
  return startOfWeek(date, { weekStartsOn: 1 }); // Start on Monday
};

export const getWeekEnd = (date: Date): Date => {
  const start = getWeekStart(date);
  return addDays(start, 4); // Friday
};

export interface ActiveProjectsFilterOptions {
  isAdmin?: boolean;
  employeeId?: string;
}

export const useActiveProjectsWithMembers = (options?: ActiveProjectsFilterOptions) => {
  return useQuery({
    queryKey: ['active-projects-with-members', options?.isAdmin, options?.employeeId],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          id,
          name,
          client_id,
          manager_id,
          clients!inner (
            id,
            company_name
          ),
          project_members (
            id,
            employee_id,
            role,
            employees!inner (
              id,
              nome,
              foto_url
            )
          )
        `)
        .or('status.eq.active,portfolio_stage.neq.planning')
        .neq('portfolio_stage', 'completed');

      // Se não é admin, filtra apenas projetos onde é gerente
      if (!options?.isAdmin && options?.employeeId) {
        query = query.eq('manager_id', options.employeeId);
      }

      const { data, error } = await query.order('name');

      if (error) throw error;

      const projects: ProjectWithMembers[] = (data || []).map((project: any) => ({
        projectId: project.id,
        projectName: project.name,
        clientId: project.clients.id,
        clientName: project.clients.company_name,
        members: (project.project_members || []).map((member: any) => ({
          memberId: member.id,
          employeeId: member.employee_id,
          employeeName: member.employees.nome,
          employeePhoto: member.employees.foto_url,
          role: member.role,
        })),
      }));

      return projects;
    },
  });
};

export const useTimesheetsByDateRange = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['timesheets-by-date-range', startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) return [];

      const { data, error } = await supabase
        .from('project_timesheets')
        .select('*')
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .order('work_date', { ascending: true });

      if (error) throw error;

      return (data || []).map((entry) => ({
        id: entry.id,
        projectId: entry.project_id,
        projectMemberId: entry.project_member_id,
        workDate: entry.work_date,
        hours: entry.hours,
        description: entry.description,
      })) as TimesheetEntry[];
    },
    enabled: !!startDate && !!endDate,
  });
};

export interface EmployeeWithProjects {
  employeeId: string;
  employeeName: string;
  employeePhoto: string | null;
  projects: {
    projectId: string;
    projectName: string;
    clientName: string;
    memberId: string;
    role: string;
  }[];
}

export const groupByEmployee = (projects: ProjectWithMembers[]): EmployeeWithProjects[] => {
  const employeeMap = new Map<string, EmployeeWithProjects>();

  projects.forEach((project) => {
    project.members.forEach((member) => {
      if (!employeeMap.has(member.employeeId)) {
        employeeMap.set(member.employeeId, {
          employeeId: member.employeeId,
          employeeName: member.employeeName,
          employeePhoto: member.employeePhoto,
          projects: [],
        });
      }
      
      employeeMap.get(member.employeeId)!.projects.push({
        projectId: project.projectId,
        projectName: project.projectName,
        clientName: project.clientName,
        memberId: member.memberId,
        role: member.role,
      });
    });
  });

  return Array.from(employeeMap.values()).sort((a, b) => 
    a.employeeName.localeCompare(b.employeeName)
  );
};
