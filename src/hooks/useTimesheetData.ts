import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, addDays, parseISO } from 'date-fns';
import { SaidaDeEquipe } from '@/lib/saidaDeEquipe';

/**
 * A saída da equipe é do PAR (projeto, pessoa), não do projeto: na visão do gestor a mesma
 * linha de projeto traz gente que ficou e gente que saiu.
 */
export interface ProjectMemberWithDetails extends SaidaDeEquipe {
  memberId: string;
  employeeId: string;
  employeeName: string;
  employeePhoto: string | null;
  role: string;
}

/**
 * Na timesheet da própria pessoa cada projeto traz só ela, então a saída da equipe mora no
 * projeto. Quem decide o que ela ainda pode lançar é `deallocatedAt`, não o flag sozinho —
 * ver as regras em `@/lib/saidaDeEquipe`.
 */
export interface ProjectWithMembers extends SaidaDeEquipe {
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  members: ProjectMemberWithDetails[];
  startDate?: string;
  endDate?: string | null;
  isContinuous?: boolean;
}

export interface TimesheetEntry {
  id: string;
  projectId: string;
  projectMemberId: string;
  workDate: string;
  hours: number;
  description: string | null;
  isLocked: boolean;
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
  weekStart?: string;
  weekEnd?: string;
}

interface LinhaDeSaidaDeEquipe {
  project_id: string;
  employee_id: string | null;
  deallocated_at: string | null;
}

/** Índice `projeto__pessoa` → dia da saída (yyyy-MM-dd), ou `null` quando não foi registrado. */
function indexarSaidasPorPar(rows: LinhaDeSaidaDeEquipe[]): Map<string, string | null> {
  return new Map(
    rows.map((row) => [
      `${row.project_id}__${row.employee_id}`,
      row.deallocated_at ? format(parseISO(row.deallocated_at), 'yyyy-MM-dd') : null,
    ]),
  );
}

/**
 * Carimba em cada membro se ele já saiu da equipe daquele projeto.
 *
 * `project_members` é o modelo antigo (ADR-0006) e nunca soube de saída: uma vez membro, o
 * projeto aparecia para sempre. A grade da própria pessoa já lê `project_team_rows`; a tela
 * do gestor não lia, e por isso continuava oferecendo linha de lançamento para quem foi
 * desalocado. O que fazer com a marca é decisão da tela, que conhece as horas da semana.
 */
async function marcarSaidasDeEquipe(projects: ProjectWithMembers[]): Promise<void> {
  const projectIds = projects.map((p) => p.projectId);
  if (projectIds.length === 0) return;

  const { data } = await supabase
    .from('project_team_rows')
    .select('project_id, employee_id, deallocated_at')
    .in('project_id', projectIds)
    .eq('row_type', 'member_status')
    .eq('status', 'deallocated');

  if (!data?.length) return;

  const saiuEmPorPar = indexarSaidasPorPar(data);

  for (const project of projects) {
    for (const member of project.members) {
      const saiuEm = saiuEmPorPar.get(`${project.projectId}__${member.employeeId}`);
      if (saiuEm === undefined) continue;
      member.isDeallocated = true;
      member.deallocatedAt = saiuEm;
    }
  }
}

export const useActiveProjectsWithMembers = (options?: ActiveProjectsFilterOptions) => {
  return useQuery({
    queryKey: ['active-projects-with-members', options?.isAdmin, options?.employeeId, options?.weekStart, options?.weekEnd],
    queryFn: async () => {
      let query = supabase
        .from('projects')
        .select(`
          id,
          name,
          client_id,
          manager_id,
          start_date,
          end_date,
          is_continuous,
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
        startDate: project.start_date,
        endDate: project.end_date,
        isContinuous: project.is_continuous,
        members: (project.project_members || []).map((member: any) => ({
          memberId: member.id,
          employeeId: member.employee_id,
          employeeName: member.employees.nome,
          employeePhoto: member.employees.foto_url,
          role: member.role,
        })),
      }));

      await marcarSaidasDeEquipe(projects);

      // Filter by week overlap
      if (options?.weekStart && options?.weekEnd) {
        const weekStartDate = parseISO(options.weekStart);
        const weekEndDate = parseISO(options.weekEnd);
        return projects.filter(p => {
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
        isLocked: entry.is_locked,
      })) as TimesheetEntry[];
    },
    enabled: !!startDate && !!endDate,
  });
};

export interface EmployeeWithProjects {
  employeeId: string;
  employeeName: string;
  employeePhoto: string | null;
  projects: (SaidaDeEquipe & {
    projectId: string;
    projectName: string;
    clientName: string;
    memberId: string;
    role: string;
  })[];
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
        isDeallocated: member.isDeallocated,
        deallocatedAt: member.deallocatedAt,
      });
    });
  });

  return Array.from(employeeMap.values()).sort((a, b) => 
    a.employeeName.localeCompare(b.employeeName)
  );
};
