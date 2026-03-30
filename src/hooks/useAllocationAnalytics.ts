import { useQuery } from '@tanstack/react-query';
import { addMonths, startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { countWorkingDays } from '@/lib/workingDays';
import type { AnalyticsFilters } from './useAnalyticsData';

export interface AllocationEmployee {
  employeeId: string;
  employeeName: string;
  cargo: string;
  plannedHours: number;
  actualHours: number;
  capacity: number;
  executionPercent: number;
  utilizationPercent: number;
  status: 'overallocated' | 'adequate' | 'underallocated' | 'idle';
  projects: Array<{
    projectId: string;
    projectName: string;
    plannedHours: number;
    actualHours: number;
  }>;
}

export interface AllocationSummary {
  totalPlannedHours: number;
  totalActualHours: number;
  executionPercent: number;
  avgUtilization: number;
  employeeCount: number;
}

export interface AllocationAnalyticsData {
  summary: AllocationSummary;
  employees: AllocationEmployee[];
}

function getStatus(utilizationPercent: number, actualHours: number): AllocationEmployee['status'] {
  if (actualHours === 0) return 'idle';
  if (utilizationPercent > 100) return 'overallocated';
  if (utilizationPercent >= 80) return 'adequate';
  return 'underallocated';
}

export function useAllocationAnalytics(
  filters: AnalyticsFilters,
  options?: { enabled?: boolean },
) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const isAdmin = employee?.isAdmin ?? false;
  const currentEmployeeId = employee?.id;

  const startStr = format(filters.startDate, 'yyyy-MM-dd');
  const endStr = format(filters.endDate, 'yyyy-MM-dd');

  return useQuery({
    queryKey: [
      'allocation-analytics', tenantId, startStr, endStr,
      filters.clientId, filters.managerId, filters.projectId,
      isAdmin, currentEmployeeId,
    ],
    queryFn: async (): Promise<AllocationAnalyticsData> => {
      if (!tenantId) throw new Error('No tenant');

      // 1. Fetch projects with visibility rules
      let projectsQuery = supabase
        .from('projects')
        .select('id, name, start_date')
        .eq('tenant_id', tenantId);

      if (!isAdmin && currentEmployeeId) {
        projectsQuery = projectsQuery.eq('manager_id', currentEmployeeId);
      }
      if (filters.clientId) projectsQuery = projectsQuery.eq('client_id', filters.clientId);
      if (filters.managerId) projectsQuery = projectsQuery.eq('manager_id', filters.managerId);
      if (filters.projectId) projectsQuery = projectsQuery.eq('id', filters.projectId);

      const { data: projects, error: projErr } = await projectsQuery;
      if (projErr) throw projErr;

      if (!projects || projects.length === 0) {
        return {
          summary: { totalPlannedHours: 0, totalActualHours: 0, executionPercent: 0, avgUtilization: 0, employeeCount: 0 },
          employees: [],
        };
      }

      const projectIds = projects.map(p => p.id);
      const projectMap = new Map(projects.map(p => [p.id, p]));

      // 2. Fetch data in parallel
      const [membersRes, memberMonthsRes, timesheetsRes, holidaysRes] = await Promise.all([
        supabase
          .from('project_members')
          .select('id, project_id, employee_id, employee:employees(id, nome, cargo, jornada_diaria, jornada_mensal, data_admissao, termination:employee_terminations(termination_date))')
          .in('project_id', projectIds),

        supabase
          .from('project_member_months')
          .select('project_member_id, month_number, hours'),

        supabase
          .from('project_timesheets')
          .select('project_id, project_member_id, work_date, hours')
          .in('project_id', projectIds)
          .gte('work_date', startStr)
          .lte('work_date', endStr),

        supabase
          .from('company_holidays')
          .select('holiday_type, fixed_day, fixed_month, specific_date')
          .eq('tenant_id', tenantId)
          .eq('is_active', true),
      ]);

      const members = (membersRes.data || []) as any[];
      const allMemberMonths = memberMonthsRes.data || [];
      const timesheets = timesheetsRes.data || [];
      const holidays = holidaysRes.data || [];

      // Build member lookup: memberId → { employee, projectId }
      const memberLookup = new Map<string, { employee: any; projectId: string }>();
      for (const m of members) {
        if (m.employee) {
          memberLookup.set(m.id, { employee: m.employee, projectId: m.project_id });
        }
      }

      // Filter member_months that fall within the period
      const validMemberMonths: Array<{ memberId: string; hours: number }> = [];
      for (const mm of allMemberMonths) {
        const info = memberLookup.get(mm.project_member_id);
        if (!info) continue;
        const project = projectMap.get(info.projectId);
        if (!project) continue;
        const projStart = parseISO(project.start_date);
        const calendarDate = addMonths(startOfMonth(projStart), mm.month_number - 1);
        if (calendarDate >= startOfMonth(filters.startDate) && calendarDate <= endOfMonth(filters.endDate)) {
          validMemberMonths.push({ memberId: mm.project_member_id, hours: Number(mm.hours) });
        }
      }

      // Aggregate per employee per project
      type EmpProject = { projectId: string; projectName: string; plannedHours: number; actualHours: number };
      const employeeData = new Map<string, {
        employee: any;
        projects: Map<string, EmpProject>;
      }>();

      const getOrCreate = (emp: any) => {
        if (!employeeData.has(emp.id)) {
          employeeData.set(emp.id, { employee: emp, projects: new Map() });
        }
        return employeeData.get(emp.id)!;
      };

      const getOrCreateProject = (entry: ReturnType<typeof getOrCreate>, projectId: string) => {
        if (!entry.projects.has(projectId)) {
          const proj = projectMap.get(projectId);
          entry.projects.set(projectId, {
            projectId,
            projectName: proj?.name || '',
            plannedHours: 0,
            actualHours: 0,
          });
        }
        return entry.projects.get(projectId)!;
      };

      // Aggregate planned hours
      for (const mm of validMemberMonths) {
        const info = memberLookup.get(mm.memberId);
        if (!info) continue;
        const entry = getOrCreate(info.employee);
        const proj = getOrCreateProject(entry, info.projectId);
        proj.plannedHours += mm.hours;
      }

      // Aggregate actual hours
      for (const ts of timesheets) {
        const info = memberLookup.get(ts.project_member_id);
        if (!info) continue;
        const entry = getOrCreate(info.employee);
        const proj = getOrCreateProject(entry, ts.project_id);
        proj.actualHours += Number(ts.hours);
      }

      // Ensure all allocated members appear even if 0 hours
      for (const m of members) {
        if (m.employee) {
          const entry = getOrCreate(m.employee);
          getOrCreateProject(entry, m.project_id);
        }
      }

      // Calculate working days for capacity
      const workingDays = countWorkingDays(filters.startDate, filters.endDate, holidays);

      // Build employee results
      const employees: AllocationEmployee[] = [];
      employeeData.forEach(({ employee: emp, projects: projMap }) => {
        const admDate = emp.data_admissao ? parseISO(emp.data_admissao) : null;
        if (admDate && admDate > filters.endDate) return;
        const termDate = emp.termination?.termination_date ? parseISO(emp.termination.termination_date) : null;
        if (termDate && termDate < filters.startDate) return;

        const jornadaDiaria = Number(emp.jornada_diaria) || 8;
        const effectiveStart = admDate && admDate > filters.startDate ? admDate : filters.startDate;
        const effectiveEnd = termDate && termDate < filters.endDate ? termDate : filters.endDate;
        const effectiveWorkingDays = countWorkingDays(effectiveStart, effectiveEnd, holidays);
        const capacity = jornadaDiaria * effectiveWorkingDays;

        const projectsList = Array.from(projMap.values()).filter(p => p.plannedHours > 0 || p.actualHours > 0);
        const totalPlanned = projectsList.reduce((s, p) => s + p.plannedHours, 0);
        const totalActual = projectsList.reduce((s, p) => s + p.actualHours, 0);
        const executionPercent = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
        const utilizationPercent = capacity > 0 ? (totalActual / capacity) * 100 : 0;

        employees.push({
          employeeId: emp.id,
          employeeName: emp.nome,
          cargo: emp.cargo,
          plannedHours: totalPlanned,
          actualHours: totalActual,
          capacity,
          executionPercent,
          utilizationPercent,
          status: getStatus(utilizationPercent, totalActual),
          projects: projectsList,
        });
      });

      employees.sort((a, b) => b.actualHours - a.actualHours);

      // Summary
      const totalPlannedHours = employees.reduce((s, e) => s + e.plannedHours, 0);
      const totalActualHours = employees.reduce((s, e) => s + e.actualHours, 0);
      const totalCapacity = employees.reduce((s, e) => s + e.capacity, 0);

      return {
        summary: {
          totalPlannedHours,
          totalActualHours,
          executionPercent: totalPlannedHours > 0 ? (totalActualHours / totalPlannedHours) * 100 : 0,
          avgUtilization: totalCapacity > 0 ? (totalActualHours / totalCapacity) * 100 : 0,
          employeeCount: employees.length,
        },
        employees,
      };
    },
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}
