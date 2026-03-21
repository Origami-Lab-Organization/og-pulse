import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addMonths, format, parseISO } from 'date-fns';

export interface MyProjectDetail {
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

  okrs: {
    id: string;
    objective: string;
    keyResults: { description: string; progress: number }[];
  }[];

  stakeholders: {
    name: string;
    role: string;
    company: string;
    type: string;
    email: string | null;
    phone: string | null;
  }[];

  schedulePhases: {
    title: string;
    deliverables: string | null;
    startDate: string;
    endDate: string;
    status: string;
    completedDate: string | null;
  }[];

  members: {
    id: string;
    employeeId: string;
    nome: string;
    cargo: string;
    fotoUrl: string | null;
    role: string;
    hoursPerMonth: number;
  }[];

  allocation: {
    memberId: string;
    employeeName: string;
    role: string;
    months: { month: string; planned: number; actual: number }[];
  }[];

  totalHoursPlanned: number;
  totalHoursActual: number;
}

export const useMyProjectDetail = (projectId: string | undefined) => {
  const { employee } = useAuth();
  const employeeId = employee?.id;

  return useQuery({
    queryKey: ['my-project-detail', projectId, employeeId],
    queryFn: async (): Promise<MyProjectDetail | null> => {
      if (!projectId || !employeeId) return null;

      // 1. Verificar membership + buscar projeto em paralelo
      const [membershipResult, projectResult] = await Promise.all([
        supabase
          .from('project_members')
          .select('id, role, hours_per_month')
          .eq('project_id', projectId)
          .eq('employee_id', employeeId)
          .maybeSingle(),
        supabase
          .from('projects')
          .select(`
            id, name, description, start_date, end_date, duration_months,
            status, portfolio_stage, service_line, is_continuous,
            clients(company_name, trading_name),
            employees!projects_manager_id_fkey(nome, cargo)
          `)
          .eq('id', projectId)
          .single(),
      ]);

      if (membershipResult.error) throw membershipResult.error;
      if (!membershipResult.data) return null; // employee não é membro

      if (projectResult.error) throw projectResult.error;
      const project = projectResult.data as any;

      // 2. Buscar OKRs, stakeholders, milestones e membros em paralelo
      const [okrsResult, stakeholdersResult, milestonesResult, membersResult] = await Promise.all([
        supabase
          .from('project_okrs')
          .select(`id, objective, key_results:project_key_results(description, current_value)`)
          .eq('project_id', projectId),
        supabase
          .from('project_stakeholders')
          .select('name, role, company, type, email, phone')
          .eq('project_id', projectId)
          .order('created_at', { ascending: true }),
        supabase
          .from('project_milestones')
          .select('title, deliverables, start_date, end_date, status, completed_date')
          .eq('project_id', projectId)
          .order('start_date', { ascending: true }),
        supabase
          .from('project_members')
          .select(`
            id, employee_id, role, hours_per_month,
            employees(id, nome, cargo, foto_url)
          `)
          .eq('project_id', projectId),
      ]);

      if (okrsResult.error) throw okrsResult.error;
      if (stakeholdersResult.error) throw stakeholdersResult.error;
      if (milestonesResult.error) throw milestonesResult.error;
      if (membersResult.error) throw membersResult.error;

      const allMembers = (membersResult.data || []) as any[];
      const allMemberIds = allMembers.map((m) => m.id);

      // 3. Buscar horas planejadas e registros de timesheet em paralelo
      const [memberMonthsResult, timesheetsResult] = await Promise.all([
        allMemberIds.length > 0
          ? supabase
              .from('project_member_months')
              .select('project_member_id, month_number, hours')
              .in('project_member_id', allMemberIds)
          : Promise.resolve({ data: [], error: null }),
        allMemberIds.length > 0
          ? supabase
              .from('project_timesheets')
              .select('project_member_id, work_date, hours')
              .in('project_member_id', allMemberIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (memberMonthsResult.error) throw memberMonthsResult.error;
      if (timesheetsResult.error) throw timesheetsResult.error;

      const memberMonths = (memberMonthsResult.data || []) as any[];
      const timesheets = (timesheetsResult.data || []) as any[];
      const projectStartDate = parseISO(project.start_date);

      // 4. Montar dados de alocação por membro
      const allocation = allMembers
        .filter((m) => !!m.employee_id)
        .map((m) => {
          // Horas planejadas: month_number → mês calendário yyyy-MM
          const plannedByMonth = new Map<string, number>();
          memberMonths
            .filter((mm) => mm.project_member_id === m.id)
            .forEach((mm) => {
              const calMonth = format(addMonths(projectStartDate, mm.month_number - 1), 'yyyy-MM');
              plannedByMonth.set(calMonth, (plannedByMonth.get(calMonth) || 0) + Number(mm.hours));
            });

          // Horas executadas: agrupar timesheets por mês do work_date
          const actualByMonth = new Map<string, number>();
          timesheets
            .filter((ts) => ts.project_member_id === m.id)
            .forEach((ts) => {
              const calMonth = ts.work_date.substring(0, 7); // yyyy-MM
              actualByMonth.set(calMonth, (actualByMonth.get(calMonth) || 0) + Number(ts.hours));
            });

          // Unir todos os meses com qualquer dado e ordenar
          const allMonthKeys = new Set([...plannedByMonth.keys(), ...actualByMonth.keys()]);
          const months = Array.from(allMonthKeys)
            .sort()
            .map((month) => ({
              month,
              planned: plannedByMonth.get(month) || 0,
              actual: actualByMonth.get(month) || 0,
            }));

          return {
            memberId: m.id,
            employeeName: m.employees?.nome ?? '',
            role: m.role,
            months,
          };
        });

      // Totais globais do projeto
      const totalHoursPlanned = memberMonths.reduce((sum, mm) => sum + Number(mm.hours), 0);
      const totalHoursActual = timesheets.reduce((sum, ts) => sum + Number(ts.hours), 0);

      // 5. Montar lista de membros (somente com funcionário alocado)
      const members = allMembers
        .filter((m) => !!m.employee_id && !!m.employees)
        .map((m) => ({
          id: m.id,
          employeeId: m.employee_id,
          nome: m.employees.nome,
          cargo: m.employees.cargo,
          fotoUrl: m.employees.foto_url ?? null,
          role: m.role,
          hoursPerMonth: m.hours_per_month ?? 0,
        }));

      const myMembership = membershipResult.data as any;
      const client = project.clients as any;
      const manager = (project.employees || { nome: '', cargo: '' }) as any;

      return {
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
        myRole: myMembership.role,
        myHoursPerMonth: myMembership.hours_per_month ?? 0,
        okrs: (okrsResult.data || []).map((okr: any) => ({
          id: okr.id,
          objective: okr.objective,
          keyResults: (okr.key_results || []).map((kr: any) => ({
            description: kr.description,
            progress: Number(kr.current_value),
          })),
        })),
        stakeholders: (stakeholdersResult.data || []).map((s: any) => ({
          name: s.name,
          role: s.role,
          company: s.company,
          type: s.type,
          email: s.email ?? null,
          phone: s.phone ?? null,
        })),
        schedulePhases: (milestonesResult.data || []).map((m: any) => ({
          title: m.title,
          deliverables: m.deliverables ?? null,
          startDate: m.start_date,
          endDate: m.end_date,
          status: m.status,
          completedDate: m.completed_date ?? null,
        })),
        members,
        allocation,
        totalHoursPlanned,
        totalHoursActual,
      };
    },
    enabled: !!projectId && !!employeeId,
  });
};
