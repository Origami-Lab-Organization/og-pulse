import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectWithMembers } from '@/hooks/useTimesheetData';

export const useMyProjectMemberships = (employeeId: string | undefined) => {
  return useQuery({
    queryKey: ['my-project-memberships', employeeId],
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
            id, name, status, portfolio_stage,
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

      return Array.from(projectMap.values()).sort((a, b) =>
        a.projectName.localeCompare(b.projectName)
      );
    },
    enabled: !!employeeId,
  });
};
