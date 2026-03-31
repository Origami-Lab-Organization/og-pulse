import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { countWorkingDays } from '@/lib/workingDays';
import type { AnalyticsFilters } from './useAnalyticsData';

export interface MonthlyPoint {
  monthIndex: number;
  label: string;
  isHighlighted: boolean;
  isPast: boolean;
  revenueReal: number;
  revenuePlanned: number;
  hoursReal: number;
  hoursPlanned: number;
  hoursCapacity: number;
  capacityCost: number;
  grossMargin: number | null;
  utilization: number | null;
}

export interface YearlyEvolutionData {
  year: number;
  months: MonthlyPoint[];
}

export function useYearlyEvolution(
  filters: AnalyticsFilters,
  options?: { enabled?: boolean },
) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const isAdmin = employee?.isAdmin ?? false;
  const currentEmployeeId = employee?.id;

  const year = filters.startDate.getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  return useQuery({
    queryKey: [
      'yearly-evolution',
      tenantId,
      year,
      filters.clientId,
      filters.managerId,
      filters.projectId,
      isAdmin,
      currentEmployeeId,
    ],
    queryFn: async (): Promise<YearlyEvolutionData> => {
      if (!tenantId) throw new Error('No tenant');

      // 1. Fetch projects (same visibility rules as useAnalyticsData)
      let projectsQuery = supabase
        .from('projects')
        .select('id, start_date')
        .eq('tenant_id', tenantId);

      if (!isAdmin && currentEmployeeId) {
        projectsQuery = projectsQuery.eq('manager_id', currentEmployeeId);
      }
      if (filters.clientId) projectsQuery = projectsQuery.eq('client_id', filters.clientId);
      if (filters.managerId) projectsQuery = projectsQuery.eq('manager_id', filters.managerId);
      if (filters.projectId) projectsQuery = projectsQuery.eq('id', filters.projectId);

      const { data: projects, error: projErr } = await projectsQuery;
      if (projErr) throw projErr;

      const emptyMonths = Array.from({ length: 12 }, (_, i) => ({
        monthIndex: i,
        label: format(new Date(year, i, 1), 'MMM', { locale: ptBR }),
        isHighlighted: false,
        isPast: startOfMonth(new Date(year, i, 1)) <= new Date(),
        revenueReal: 0,
        revenuePlanned: 0,
        hoursReal: 0,
        hoursPlanned: 0,
        hoursCapacity: 0,
        capacityCost: 0,
        grossMargin: null,
        utilization: null,
      }));

      if (!projects || projects.length === 0) return { year, months: emptyMonths };

      const projectIds = projects.map(p => p.id);
      const projectMap = new Map(projects.map(p => [p.id, p as any]));

      // 2. Fetch all data for the full year in parallel
      const [receivedRes, plannedRes, timesheetsRes, membersRes, allEmployeesRes, holidaysRes] = await Promise.all([
        supabase
          .from('project_installments')
          .select('payment_date, value')
          .in('project_id', projectIds)
          .eq('status', 'received')
          .gte('payment_date', yearStart)
          .lte('payment_date', yearEnd),

        supabase
          .from('project_installments')
          .select('due_date, value')
          .in('project_id', projectIds)
          .gte('due_date', yearStart)
          .lte('due_date', yearEnd),

        supabase
          .from('project_timesheets')
          .select('project_member_id, work_date, hours')
          .in('project_id', projectIds)
          .gte('work_date', yearStart)
          .lte('work_date', yearEnd),

        supabase
          .from('project_members')
          .select('id, project_id, employee_id, employee:employees(jornada_diaria, jornada_mensal, total_monthly_cost_estimated, data_admissao, termination:employee_terminations(termination_date)), plannedMonths:project_member_months(month_number, hours)')
          .in('project_id', projectIds),

        // All active tenant employees for capacity calculation
        // No need for employee_terminations join — status='ativo' guarantees they are active
        supabase
          .from('employees')
          .select('id, jornada_diaria, total_monthly_cost_estimated, data_admissao')
          .eq('tenant_id', tenantId)
          .eq('status', 'ativo'),

        supabase
          .from('company_holidays')
          .select('holiday_type, fixed_day, fixed_month, specific_date')
          .eq('tenant_id', tenantId)
          .eq('is_active', true),
      ]);

      const received = receivedRes.data || [];
      const planned = plannedRes.data || [];
      const timesheets = timesheetsRes.data || [];
      const members = (membersRes.data || []) as any[];
      const allEmployees = (allEmployeesRes.data || []) as any[];
      const holidays = holidaysRes.data || [];

      // Build member → employee info map (keyed by project_members.id)
      const memberMap = new Map<string, { employeeId: string; hourlyCost: number }>();
      for (const m of members) {
        if (!m.employee) continue;
        const hourlyCost = Number(m.employee.jornada_mensal) > 0
          ? Number(m.employee.total_monthly_cost_estimated) / Number(m.employee.jornada_mensal)
          : 0;
        memberMap.set(m.id, { employeeId: m.employee_id, hourlyCost });
      }

      // Build capacity list from ALL active tenant employees (no termination needed — already filtered)
      const capacityEmployees = allEmployees.map((e: any) => ({
        jornada_diaria: Number(e.jornada_diaria) || 8,
        monthlyCost: Number(e.total_monthly_cost_estimated) || 0,
        admDate: e.data_admissao ? parseISO(e.data_admissao) : null,
      }));

      // Pre-compute labor cost per month (index 0–11) from timesheets
      const laborCostByMonth = new Array(12).fill(0);
      for (const ts of timesheets) {
        const d = parseISO(ts.work_date);
        if (d.getFullYear() !== year) continue;
        const monthIdx = d.getMonth();
        const info = memberMap.get(ts.project_member_id);
        if (info) {
          laborCostByMonth[monthIdx] += Number(ts.hours) * info.hourlyCost;
        }
      }

      // Pre-compute planned hours per month (index 0–11) from project_member_months
      const hoursPlannedByMonth = new Array(12).fill(0);
      for (const m of members) {
        const project = projectMap.get(m.project_id);
        if (!project?.start_date) continue;
        const projStart = parseISO(project.start_date);
        for (const pm of (m.plannedMonths || [])) {
          const actualDate = addMonths(startOfMonth(projStart), pm.month_number - 1);
          if (actualDate.getFullYear() !== year) continue;
          hoursPlannedByMonth[actualDate.getMonth()] += Number(pm.hours);
        }
      }

      const today = new Date();
      const selectedStart = filters.startDate;
      const selectedEnd = filters.endDate;

      const months: MonthlyPoint[] = Array.from({ length: 12 }, (_, i) => {
        const monthStart = startOfMonth(new Date(year, i, 1));
        const monthEnd = endOfMonth(monthStart);

        const isHighlighted = monthStart <= selectedEnd && monthEnd >= selectedStart;
        const isPast = monthStart <= today;

        // Revenue real: received installments in this month
        const revenueReal = received
          .filter(r => { const d = parseISO(r.payment_date); return d.getFullYear() === year && d.getMonth() === i; })
          .reduce((s, r) => s + Number(r.value), 0);

        // Revenue planned: due_date in this month
        const revenuePlanned = planned
          .filter(p => { const d = parseISO(p.due_date); return d.getFullYear() === year && d.getMonth() === i; })
          .reduce((s, p) => s + Number(p.value), 0);

        // Hours real: timesheets in this month
        const hoursReal = timesheets
          .filter(ts => { const d = parseISO(ts.work_date); return d.getFullYear() === year && d.getMonth() === i; })
          .reduce((s, ts) => s + Number(ts.hours), 0);

        // Hours/cost capacity: from ALL active tenant employees
        let hoursCapacity = 0;
        let capacityCost = 0;
        const totalWorkDaysInMonth = countWorkingDays(monthStart, monthEnd, holidays);
        for (const emp of capacityEmployees) {
          if (emp.admDate && emp.admDate > monthEnd) continue;

          const effectiveStart = emp.admDate && emp.admDate > monthStart ? emp.admDate : monthStart;

          const workDays = countWorkingDays(effectiveStart, monthEnd, holidays);
          hoursCapacity += emp.jornada_diaria * workDays;
          if (totalWorkDaysInMonth > 0) {
            capacityCost += emp.monthlyCost * (workDays / totalWorkDaysInMonth);
          }
        }

        const laborCost = laborCostByMonth[i];
        const grossMargin = isPast && revenueReal > 0 ? ((revenueReal - laborCost) / revenueReal) * 100 : null;
        const utilization = isPast && hoursCapacity > 0 ? (hoursReal / hoursCapacity) * 100 : null;

        return {
          monthIndex: i,
          label: format(monthStart, 'MMM', { locale: ptBR }),
          isHighlighted,
          isPast,
          revenueReal: isPast ? revenueReal : 0,
          revenuePlanned,
          hoursReal: isPast ? hoursReal : 0,
          hoursPlanned: hoursPlannedByMonth[i],
          hoursCapacity: isPast ? hoursCapacity : 0,
          capacityCost: isPast ? capacityCost : 0,
          grossMargin,
          utilization,
        };
      });

      return { year, months };
    },
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}
