import { useQuery } from '@tanstack/react-query';
import { addMonths, format, parseISO, startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AnalyticsFilters } from './useAnalyticsData';
import {
  calculateProjectHealth,
  type ProjectHealthScore,
} from '@/lib/projectHealthCalculator';
import type { KeyResultConfidenceLevel } from '@/types/projectOkr';

export interface ProjectHealthRow {
  projectId: string;
  projectName: string;
  clientName: string;
  managerName: string;
  billingType: string;
  revenueReceived: number;
  margin: number;
  marginTarget: number | null;
  avgUtilization: number;
  promoterCount: number;
  detractorCount: number;
  totalStakeholders: number;
  okrProgress: number;
  hasOkrs: boolean;
  health: ProjectHealthScore;
}

function countWorkingDays(start: Date, end: Date, holidays: any[]): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const dow = current.getDay();
    if (dow !== 0 && dow !== 6) {
      const day = current.getDate();
      const month = current.getMonth() + 1;
      const dateStr = format(current, 'yyyy-MM-dd');
      const isHoliday = holidays.some(h =>
        h.holiday_type === 'fixed'
          ? h.fixed_day === day && h.fixed_month === month
          : h.specific_date === dateStr
      );
      if (!isHoliday) count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function isMonthInRange(
  projectStartDate: string,
  monthNumber: number,
  startDate: Date,
  endDate: Date,
): boolean {
  const projStart = parseISO(projectStartDate);
  const actualDate = addMonths(startOfMonth(projStart), monthNumber - 1);
  const rangeStart = startOfMonth(startDate);
  const rangeEnd = startOfMonth(endDate);
  return actualDate >= rangeStart && actualDate <= rangeEnd;
}

// Maps confidence level to a numeric tier for majority-confidence calculation
const CONFIDENCE_TIER: Record<KeyResultConfidenceLevel, number> = {
  very_low: 0, low: 1, medium: 2, high: 3, very_high: 4,
};

function dominantConfidence(
  levels: (string | null)[],
): KeyResultConfidenceLevel | null {
  const valid = levels.filter((l): l is KeyResultConfidenceLevel =>
    l === 'very_high' || l === 'high' || l === 'medium' || l === 'low' || l === 'very_low'
  );
  if (!valid.length) return null;

  const highCount   = valid.filter(c => c === 'high' || c === 'very_high').length;
  const mediumCount = valid.filter(c => c === 'medium').length;
  const lowCount    = valid.filter(c => c === 'low'  || c === 'very_low').length;

  if (highCount   > valid.length / 2) return 'high';
  if (mediumCount > valid.length / 2) return 'medium';
  if (lowCount    > valid.length / 2) return 'low';
  // no clear majority → use worst
  return valid.sort((a, b) => CONFIDENCE_TIER[a] - CONFIDENCE_TIER[b])[0];
}

export function useProjectHealthData(filters: AnalyticsFilters, options?: { enabled?: boolean }) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const isAdmin = employee?.isAdmin ?? false;
  const currentEmployeeId = employee?.id;

  const startStr = format(filters.startDate, 'yyyy-MM-dd');
  const endStr   = format(filters.endDate,   'yyyy-MM-dd');
  const todayStr = format(new Date(),         'yyyy-MM-dd');

  return useQuery({
    queryKey: [
      'project-health', tenantId, startStr, endStr,
      filters.clientId, filters.managerId, filters.projectId,
      isAdmin, currentEmployeeId,
    ],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      // ── 1. Projects ──────────────────────────────────────────────────────────
      let projectsQuery = supabase
        .from('projects')
        .select('id, name, start_date, client_id, manager_id')
        .eq('tenant_id', tenantId);

      if (!isAdmin && currentEmployeeId) {
        projectsQuery = projectsQuery.eq('manager_id', currentEmployeeId);
      }
      if (filters.clientId)  projectsQuery = projectsQuery.eq('client_id',  filters.clientId);
      if (filters.managerId) projectsQuery = projectsQuery.eq('manager_id', filters.managerId);
      if (filters.projectId) projectsQuery = projectsQuery.eq('id',         filters.projectId);

      const { data: projects, error: projErr } = await projectsQuery;
      if (projErr) throw projErr;
      if (!projects?.length) return [] as ProjectHealthRow[];

      const projectIds = projects.map(p => p.id);
      const clientIds  = [...new Set(projects.map(p => p.client_id).filter(Boolean))];
      const managerIds = [...new Set(projects.map(p => p.manager_id).filter(Boolean))];

      // ── 2. All supporting data in parallel ───────────────────────────────────
      const [
        clientsRes,
        managersRes,
        revenueRes,
        overdueRes,
        timesheetsRes,
        membersRes,
        projectSuppliersRes,
        supplierActualsRes,
        materialsRes,
        stakeholdersRes,
        okrsRes,
        settingsRes,
        holidaysRes,
      ] = await Promise.all([
        supabase
          .from('clients')
          .select('id, company_name')
          .in('id', clientIds.length ? clientIds : ['_']),

        supabase
          .from('employees')
          .select('id, nome')
          .in('id', managerIds.length ? managerIds : ['_']),

        supabase
          .from('project_installments')
          .select('project_id, value')
          .in('project_id', projectIds)
          .eq('status', 'received')
          .gte('payment_date', startStr)
          .lte('payment_date', endStr),

        supabase
          .from('project_installments')
          .select('project_id')
          .in('project_id', projectIds)
          .neq('status', 'received')
          .lt('due_date', todayStr),

        supabase
          .from('project_timesheets')
          .select('project_id, project_member_id, hours')
          .in('project_id', projectIds)
          .gte('work_date', startStr)
          .lte('work_date', endStr),

        supabase
          .from('project_members')
          .select('id, project_id, employee:employees(id, jornada_diaria, jornada_mensal, total_monthly_cost_estimated, data_admissao)')
          .in('project_id', projectIds),

        supabase
          .from('project_suppliers')
          .select('id, project_id')
          .in('project_id', projectIds),

        supabase
          .from('project_supplier_actuals')
          .select('project_supplier_id, month_number, value'),

        supabase
          .from('project_materials')
          .select('project_id, month_number, value, is_realized')
          .in('project_id', projectIds)
          .eq('is_realized', true),

        supabase
          .from('project_stakeholders')
          .select('project_id, sponsorship_level, influence_level')
          .in('project_id', projectIds),

        supabase
          .from('project_okrs')
          .select('id, project_id, progress_percent, project_key_results(confidence_level)')
          .in('project_id', projectIds),

        supabase
          .from('financial_settings')
          .select('gross_margin_target_percent, taxes_percent')
          .eq('tenant_id', tenantId)
          .maybeSingle(),

        supabase
          .from('company_holidays')
          .select('holiday_type, fixed_day, fixed_month, specific_date')
          .eq('tenant_id', tenantId)
          .eq('is_active', true),
      ]);

      const clients          = clientsRes.data || [];
      const managers         = managersRes.data || [];
      const revenueInstalls  = revenueRes.data || [];
      const overdueInstalls  = overdueRes.data || [];
      const timesheets       = timesheetsRes.data || [];
      const members          = (membersRes.data || []) as any[];
      const projectSuppliers = projectSuppliersRes.data || [];
      const supplierActuals  = supplierActualsRes.data || [];
      const materials        = materialsRes.data || [];
      const stakeholders     = stakeholdersRes.data || [];
      const okrs             = (okrsRes.data || []) as any[];
      const marginTarget     = settingsRes.data?.gross_margin_target_percent ?? null;
      const holidays         = holidaysRes.data || [];

      // ── Lookup maps ───────────────────────────────────────────────────────────
      const clientMap   = new Map(clients.map(c => [c.id, c.company_name]));
      const managerMap  = new Map(managers.map(m => [m.id, m.nome]));
      const memberMap   = new Map(members.map(m => [m.id, m]));
      const supplierToProject = new Map(projectSuppliers.map(ps => [ps.id, ps.project_id]));

      // ── Per-project computation ───────────────────────────────────────────────
      const rows: ProjectHealthRow[] = [];

      for (const project of projects) {
        const pid = project.id;

        // Revenue
        const revenueReceived = revenueInstalls
          .filter(i => i.project_id === pid)
          .reduce((sum, i) => sum + Number(i.value), 0);

        // Overdue installments
        const overdueCount = overdueInstalls.filter(i => i.project_id === pid).length;

        // Labor cost (from timesheets)
        const projectTimesheets = timesheets.filter(ts => ts.project_id === pid);
        let laborCost = 0;
        const hoursPerMember = new Map<string, { emp: any; hours: number }>();

        for (const ts of projectTimesheets) {
          const member = memberMap.get(ts.project_member_id);
          if (!member?.employee) continue;
          const emp = member.employee;
          const hourlyCost = Number(emp.jornada_mensal) > 0
            ? Number(emp.total_monthly_cost_estimated) / Number(emp.jornada_mensal)
            : 0;
          laborCost += Number(ts.hours) * hourlyCost;

          const key = ts.project_member_id;
          if (!hoursPerMember.has(key)) {
            hoursPerMember.set(key, { emp, hours: 0 });
          }
          hoursPerMember.get(key)!.hours += Number(ts.hours);
        }

        // Supplier cost (for period)
        let supplierCost = 0;
        for (const actual of supplierActuals) {
          const suppProjectId = supplierToProject.get(actual.project_supplier_id);
          if (suppProjectId !== pid) continue;
          if (isMonthInRange(project.start_date, actual.month_number, filters.startDate, filters.endDate)) {
            supplierCost += Number(actual.value);
          }
        }

        // Material cost (for period)
        let materialCost = 0;
        for (const mat of materials) {
          if (mat.project_id !== pid || !mat.month_number) continue;
          if (isMonthInRange(project.start_date, mat.month_number, filters.startDate, filters.endDate)) {
            materialCost += Number(mat.value);
          }
        }

        const totalCosts = laborCost + supplierCost + materialCost;
        const margin = revenueReceived > 0
          ? ((revenueReceived - totalCosts) / revenueReceived) * 100
          : 0;

        // Utilization — average across project members with capacity
        const projectMembers = members.filter(m => m.project_id === pid);
        const utilizations: number[] = [];

        for (const m of projectMembers) {
          if (!m.employee) continue;
          const emp = m.employee;
          const admDate = emp.data_admissao ? parseISO(emp.data_admissao) : null;
          if (admDate && admDate > filters.endDate) continue;

          const jornadaDiaria = Number(emp.jornada_diaria) || 8;
          const effectiveStart = admDate && admDate > filters.startDate ? admDate : filters.startDate;
          const effectiveWorkingDays = countWorkingDays(effectiveStart, filters.endDate, holidays);
          const capacity = jornadaDiaria * effectiveWorkingDays;
          if (capacity <= 0) continue;

          const hours = hoursPerMember.get(m.id)?.hours ?? 0;
          utilizations.push((hours / capacity) * 100);
        }

        const avgUtilization = utilizations.length
          ? utilizations.reduce((s, u) => s + u, 0) / utilizations.length
          : 0;

        // Stakeholders
        const projectStakeholders = stakeholders.filter(s => s.project_id === pid);
        const hasStakeholders = projectStakeholders.length > 0;
        const promoterCount = projectStakeholders.filter(s => s.sponsorship_level === 'promoter').length;
        const detractorCount = projectStakeholders.filter(s => s.sponsorship_level === 'detractor').length;
        const promoterPercent = hasStakeholders ? (promoterCount / projectStakeholders.length) * 100 : 0;
        const highInfluenceDetractors = projectStakeholders.filter(
          s => s.sponsorship_level === 'detractor' && s.influence_level === 'high'
        ).length;

        // OKRs
        const projectOkrs = okrs.filter(o => o.project_id === pid);
        const hasOkrs = projectOkrs.length > 0;
        const okrProgress = hasOkrs
          ? projectOkrs.reduce((sum, o) => sum + (Number(o.progress_percent) || 0), 0) / projectOkrs.length
          : 0;

        const allConfidences = projectOkrs.flatMap(
          o => (o.project_key_results || []).map((kr: any) => kr.confidence_level)
        );
        const okrConfidence = dominantConfidence(allConfidences);

        const health = calculateProjectHealth({
          projectId: pid,
          margin,
          marginTarget: marginTarget ? Number(marginTarget) : null,
          overdueInstallments: overdueCount,
          avgUtilization,
          promoterPercent,
          highInfluenceDetractors,
          hasStakeholders,
          okrProgress,
          okrConfidence,
          hasOkrs,
          isNonRevenue: false,
        });

        rows.push({
          projectId: pid,
          projectName: project.name,
          clientName: clientMap.get(project.client_id) ?? '—',
          managerName: managerMap.get(project.manager_id) ?? '—',
          billingType: '',
          revenueReceived,
          margin,
          marginTarget: marginTarget ? Number(marginTarget) : null,
          avgUtilization,
          promoterCount,
          detractorCount,
          totalStakeholders: projectStakeholders.length,
          okrProgress,
          hasOkrs,
          health,
        });
      }

      // Ordenar por score ascendente (piores primeiro)
      return rows.sort((a, b) => a.health.overall.score - b.health.overall.score);
    },
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}
