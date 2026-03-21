import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MyProjectSummary {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  durationMonths: number;
  status: string;
  portfolioStage: string;
  serviceLine: string | null;
  isContinuous: boolean;
  client: { companyName: string; tradingName: string | null };
  manager: { nome: string; cargo: string };
  myRole: string;
  myHoursPerMonth: number;
  membersCount: number;
  totalHoursPlanned: number;
  totalHoursActual: number;
}

export const useMyProjects = () => {
  const { employee } = useAuth();
  const employeeId = employee?.id;
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['my-projects', tenantId, employeeId],
    queryFn: async (): Promise<MyProjectSummary[]> => {
      if (!employeeId || !tenantId) return [];

      // 1. Buscar memberships do employee com joins em projetos, clientes e gerente
      const { data: myMemberships, error } = await supabase
        .from('project_members')
        .select(`
          id,
          role,
          hours_per_month,
          project_id,
          projects!inner (
            id, name, description, start_date, end_date, is_continuous,
            duration_months, status, portfolio_stage, service_line,
            clients!inner (company_name, trading_name),
            employees!projects_manager_id_fkey (nome, cargo)
          )
        `)
        .eq('employee_id', employeeId)
        .not('projects.portfolio_stage', 'in', '("completed")');

      if (error) throw error;
      if (!myMemberships || myMemberships.length === 0) return [];

      const projectIds = [...new Set((myMemberships as any[]).map((m) => m.project_id))];

      // 2. Buscar todos os membros desses projetos (para contagem e IDs de horas planejadas)
      const { data: allMembers } = await supabase
        .from('project_members')
        .select('id, project_id, employee_id')
        .in('project_id', projectIds);

      const allMemberIds = (allMembers || []).map((m: any) => m.id);

      // 3. Buscar horas planejadas e executadas em paralelo
      const [{ data: memberMonths }, { data: timesheets }] = await Promise.all([
        supabase
          .from('project_member_months')
          .select('project_member_id, hours')
          .in('project_member_id', allMemberIds),
        supabase
          .from('project_timesheets')
          .select('project_id, hours')
          .in('project_id', projectIds),
      ]);

      // Mapas de agregação por projeto
      const membersByProject = new Map<string, any[]>();
      (allMembers || []).forEach((m: any) => {
        if (!membersByProject.has(m.project_id)) membersByProject.set(m.project_id, []);
        membersByProject.get(m.project_id)!.push(m);
      });

      const plannedHoursByProject = new Map<string, number>();
      (allMembers || []).forEach((m: any) => {
        const hours = (memberMonths || [])
          .filter((mm: any) => mm.project_member_id === m.id)
          .reduce((sum: number, mm: any) => sum + Number(mm.hours), 0);
        plannedHoursByProject.set(
          m.project_id,
          (plannedHoursByProject.get(m.project_id) || 0) + hours
        );
      });

      const actualHoursByProject = new Map<string, number>();
      (timesheets || []).forEach((ts: any) => {
        actualHoursByProject.set(
          ts.project_id,
          (actualHoursByProject.get(ts.project_id) || 0) + Number(ts.hours)
        );
      });

      // 4. Mapear para MyProjectSummary (deduplica por projeto — um funcionário pode ter um único role por projeto)
      const projectMap = new Map<string, MyProjectSummary>();

      (myMemberships as any[]).forEach((membership) => {
        const project = membership.projects;
        if (projectMap.has(project.id)) return;

        const client = project.clients;
        const manager = project.employees || { nome: '', cargo: '' };
        const projectMembers = membersByProject.get(project.id) || [];
        const membersCount = projectMembers.filter((m: any) => !!m.employee_id).length;

        projectMap.set(project.id, {
          id: project.id,
          name: project.name,
          description: project.description ?? null,
          startDate: project.start_date,
          endDate: project.end_date ?? null,
          durationMonths: project.duration_months ?? 0,
          status: project.status,
          portfolioStage: project.portfolio_stage,
          serviceLine: project.service_line ?? null,
          isContinuous: project.is_continuous,
          client: {
            companyName: client.company_name,
            tradingName: client.trading_name ?? null,
          },
          manager: {
            nome: manager.nome,
            cargo: manager.cargo,
          },
          myRole: membership.role,
          myHoursPerMonth: membership.hours_per_month ?? 0,
          membersCount,
          totalHoursPlanned: plannedHoursByProject.get(project.id) || 0,
          totalHoursActual: actualHoursByProject.get(project.id) || 0,
        });
      });

      return Array.from(projectMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR')
      );
    },
    enabled: !!employeeId && !!tenantId,
  });
};
