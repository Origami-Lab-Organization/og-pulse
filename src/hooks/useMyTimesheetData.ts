import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectWithMembers } from '@/hooks/useTimesheetData';
import { parseISO } from 'date-fns';

/** Conjunto de meses (`ano-mês`, mês 1–12) cobertos pela semana; mês vigente se ausente. */
function monthsInRange(weekStart?: string, weekEnd?: string): Set<string> {
  const set = new Set<string>();
  if (!weekStart || !weekEnd) {
    const now = new Date();
    set.add(`${now.getFullYear()}-${now.getMonth() + 1}`);
    return set;
  }
  const start = parseISO(weekStart);
  const end = parseISO(weekEnd);
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= last) {
    set.add(`${cursor.getFullYear()}-${cursor.getMonth() + 1}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return set;
}

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

      // ── §5.3: unir com o MODELO DE ALOCAÇÃO (project_role_allocations) ──────
      // O timesheet deve refletir a mesma fonte da alocação. Traz projetos onde
      // o funcionário tem alocação ativa com plan > 0 no(s) mês(es) visível(is),
      // mesmo sem linha em project_members. Materializa o vínculo (RPC definer)
      // para haver project_member_id contra o qual lançar. Dedup por projeto —
      // nunca duas linhas do mesmo projeto (uma pessoa = uma linha por projeto).
      const visibleMonths = monthsInRange(weekStart, weekEnd);

      const [{ data: allocRows }, { data: deallocRows }, { data: me }] = await Promise.all([
        (supabase.from('project_role_allocations' as any) as any)
          .select(`
            project_id, year, month, planned_hours, custom_role_name,
            budget_role:budget_roles(role_name),
            projects!inner (
              id, name, status, portfolio_stage, start_date, end_date, is_continuous,
              clients!inner (id, company_name)
            )
          `)
          .eq('employee_id', employeeId)
          .neq('projects.portfolio_stage', 'completed'),
        (supabase.from('project_team_rows' as any) as any)
          .select('project_id')
          .eq('employee_id', employeeId)
          .eq('row_type', 'member_status')
          .eq('status', 'deallocated'),
        supabase.from('employees').select('nome, foto_url').eq('id', employeeId).maybeSingle(),
      ]);

      const deallocatedProjectIds = new Set<string>((deallocRows || []).map((r: any) => r.project_id));

      // Projetos com plan > 0 no período visível, não desalocados, ainda sem
      // linha em project_members (os que já têm caem em `projectMap`).
      const allocByProject = new Map<string, { role: string; project: any }>();
      (allocRows || []).forEach((row: any) => {
        const project = row.projects;
        if (!project) return;
        if (deallocatedProjectIds.has(project.id)) return;
        if (projectMap.has(project.id)) return; // já veio de project_members
        if (visibleMonths.size > 0 && !visibleMonths.has(`${row.year}-${row.month}`)) return;
        if (Number(row.planned_hours || 0) <= 0) return;
        const role = row.budget_role?.role_name ?? row.custom_role_name ?? 'Colaborador';
        if (!allocByProject.has(project.id)) allocByProject.set(project.id, { role, project });
      });

      // Materializa o vínculo (RLS-safe) e injeta na lista com o memberId real.
      for (const [projectId, { role, project }] of allocByProject) {
        const { data: memberId, error: ensureError } = await (supabase.rpc as any)('ensure_project_membership', {
          p_project_id: projectId,
          p_employee_id: employeeId,
        });
        if (ensureError || !memberId) continue;
        projectMap.set(project.id, {
          projectId: project.id,
          projectName: project.name,
          clientId: project.clients.id,
          clientName: project.clients.company_name,
          startDate: project.start_date,
          endDate: project.end_date,
          isContinuous: project.is_continuous,
          members: [{
            memberId: memberId as string,
            employeeId,
            employeeName: me?.nome ?? '',
            employeePhoto: me?.foto_url ?? null,
            role,
          }],
        });
      }

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
    refetchOnWindowFocus: true,
  });
};
