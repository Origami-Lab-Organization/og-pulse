import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectWithMembers } from '@/hooks/useTimesheetData';
import { parseISO } from 'date-fns';

export const useMyProjectMemberships = (employeeId: string | undefined, weekStart?: string, weekEnd?: string) => {
  return useQuery({
    queryKey: ['my-project-memberships', employeeId, weekStart, weekEnd],
    queryFn: async () => {
      if (!employeeId) return [];

      const { data, error } = await supabase
        .from('project_members')
        .select(`
          id,
          role,
          project_id,
          employee_id,
          projects!inner (
            id, name, status, portfolio_stage, start_date, end_date, is_continuous,
            clients!inner (id, company_name)
          ),
          employees!inner (
            id, nome, foto_url
          )
        `)
        .eq('employee_id', employeeId)
        .neq('projects.portfolio_stage', 'completed');

      if (error) throw error;

      // Group by project, each project has only the current employee as member
      const projectMap = new Map<string, ProjectWithMembers>();

      (data || []).forEach((member: any) => {
        const project = member.projects;
        if (!projectMap.has(project.id)) {
          projectMap.set(project.id, {
            projectId: project.id,
            projectName: project.name,
            clientId: project.clients.id,
            clientName: project.clients.company_name,
            startDate: project.start_date,
            endDate: project.end_date,
            isContinuous: project.is_continuous,
            members: [],
          });
        }
        projectMap.get(project.id)!.members.push({
          memberId: member.id,
          employeeId: member.employee_id,
          employeeName: member.employees.nome,
          employeePhoto: member.employees.foto_url,
          role: member.role,
        });
      });

      let projects = Array.from(projectMap.values()).sort((a, b) =>
        a.projectName.localeCompare(b.projectName)
      );

      // Filter by week overlap
      if (weekStart && weekEnd) {
        const weekStartDate = parseISO(weekStart);
        const weekEndDate = parseISO(weekEnd);
        projects = projects.filter(p => {
          if (!p.startDate) return true;
          const projStart = parseISO(p.startDate);
          if (projStart > weekEndDate) return false;
          if (p.isContinuous) return true;
          if (!p.endDate) return true;
          const projEnd = parseISO(p.endDate);
          return projEnd >= weekStartDate;
        });
      }

      return projects;
    },
    enabled: !!employeeId,
  });
};
