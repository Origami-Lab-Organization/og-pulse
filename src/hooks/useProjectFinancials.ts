import { useQuery } from '@tanstack/react-query';
import { format, parseISO, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SERVICE_LINE_LABELS } from '@/types/lead';
import type { AnalyticsFilters } from './useAnalyticsData';
import { fetchSuppliersWithActuals, fetchMaterials } from '@/services/projectCostsService';
import { getFallbackHourlyCost } from '@/lib/employeeCost';
import type { Holiday } from '@/lib/workingDays';

export interface ProjectFinancialRow {
  projectId: string;
  projectName: string;
  clientId: string;
  clientName: string;
  managerId: string;
  managerName: string;
  serviceLine: string;
  serviceLineLabel: string;
  revenue: number;
  costs: number;
  grossMargin: number | null;
}

export interface DimensionFinancialRow {
  id: string;
  label: string;
  revenue: number;
  costs: number;
  grossMargin: number | null;
  numProjetos: number;
}

export interface ProjectFinancialsData {
  byProject: ProjectFinancialRow[];
  byClient: DimensionFinancialRow[];
  byManager: DimensionFinancialRow[];
  byServiceLine: DimensionFinancialRow[];
  grossMarginTarget: number | null;
}

function computeMargin(revenue: number, costs: number): number | null {
  if (revenue <= 0) return null;
  return ((revenue - costs) / revenue) * 100;
}

export function useProjectFinancials(
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
      'project-financials',
      tenantId,
      startStr,
      endStr,
      filters.clientId,
      filters.managerId,
      filters.projectId,
      isAdmin,
      currentEmployeeId,
    ],
    queryFn: async (): Promise<ProjectFinancialsData> => {
      if (!tenantId) throw new Error('No tenant');

      const settingsRes = await supabase
        .from('financial_settings')
        .select('gross_margin_target_percent')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      const grossMarginTarget = settingsRes.data?.gross_margin_target_percent ?? null;

      const { data: servicesData } = await supabase
        .from('services' as any)
        .select('id, name')
        .eq('tenant_id', tenantId);
      const serviceNameMap = new Map<string, string>(
        ((servicesData || []) as any[]).map((s: any) => [s.id, s.name])
      );
      const resolveServiceLine = (raw: string | null): string => {
        if (!raw) return 'Outros';
        return serviceNameMap.get(raw) || SERVICE_LINE_LABELS[raw] || raw;
      };

      let projectsQuery = supabase
        .from('projects')
        .select('id, name, start_date, service_line, client:clients(id, company_name), manager:employees(id, nome)')
        .eq('tenant_id', tenantId);

      if (!isAdmin && currentEmployeeId) projectsQuery = projectsQuery.eq('manager_id', currentEmployeeId);
      if (filters.clientId) projectsQuery = projectsQuery.eq('client_id', filters.clientId);
      if (filters.managerId) projectsQuery = projectsQuery.eq('manager_id', filters.managerId);
      if (filters.projectId) projectsQuery = projectsQuery.eq('id', filters.projectId);

      const { data: projects, error: projErr } = await projectsQuery;
      if (projErr) throw projErr;

      const empty: ProjectFinancialsData = {
        byProject: [], byClient: [], byManager: [], byServiceLine: [],
        grossMarginTarget,
      };
      if (!projects || projects.length === 0) return empty;

      const projectIds = projects.map((p: any) => p.id);
      const projectMap = new Map(projects.map((p: any) => [p.id, p]));

      const [receivedRes, timesheetsRes, membersRes, suppliersRes, materialsRes, commissionsRes, holidaysRes] = await Promise.all([
        supabase
          .from('project_installments')
          .select('project_id, value')
          .in('project_id', projectIds)
          .eq('status', 'received')
          .gte('payment_date', startStr)
          .lte('payment_date', endStr),

        supabase
          .from('project_timesheets')
          .select('project_id, project_member_id, work_date, hours, cost_per_hour')
          .in('project_id', projectIds)
          .gte('work_date', startStr)
          .lte('work_date', endStr),

        supabase
          .from('project_members')
          .select('id, project_id, employee:employees(total_monthly_cost_estimated, jornada_diaria)')
          .in('project_id', projectIds),

        fetchSuppliersWithActuals(projectIds),

        fetchMaterials(projectIds, { realizedOnly: true }),

        supabase
          .from('project_commissions')
          .select('project_id, planned_value')
          .in('project_id', projectIds)
          .eq('is_paid', true)
          .gte('paid_date', startStr)
          .lte('paid_date', endStr),

        supabase
          .from('company_holidays')
          .select('holiday_type, fixed_day, fixed_month, specific_date')
          .eq('tenant_id', tenantId)
          .eq('is_active', true),
      ]);
      const holidays = (holidaysRes.data || []) as Holiday[];

      const revenue = new Map<string, number>();
      const costs = new Map<string, number>();
      const add = (map: Map<string, number>, key: string, val: number) =>
        map.set(key, (map.get(key) ?? 0) + val);

      for (const r of (receivedRes.data || []) as any[]) add(revenue, r.project_id, Number(r.value));

      const memberCostMap = new Map<string, { jornadaDiaria: number; monthlyCostEstimated: number }>();
      for (const m of (membersRes.data || []) as any[]) {
        if (!m.employee) continue;
        memberCostMap.set(m.id, {
          jornadaDiaria: Number(m.employee.jornada_diaria) || 8,
          monthlyCostEstimated: Number(m.employee.total_monthly_cost_estimated) || 0,
        });
      }
      for (const ts of (timesheetsRes.data || []) as any[]) {
        let hourlyCost = 0;
        if (ts.cost_per_hour != null) {
          hourlyCost = Number(ts.cost_per_hour);
        } else {
          const info = memberCostMap.get(ts.project_member_id);
          if (info) {
            const d = parseISO(ts.work_date);
            hourlyCost = getFallbackHourlyCost(info.monthlyCostEstimated, info.jornadaDiaria, d.getFullYear(), d.getMonth(), holidays);
          }
        }
        add(costs, ts.project_id, Number(ts.hours) * hourlyCost);
      }

      for (const ps of (suppliersRes as any[])) {
        const proj = projectMap.get(ps.project_id) as any;
        if (!proj?.start_date) continue;
        const projStart = parseISO(proj.start_date);
        for (const actual of (ps.actuals || [])) {
          const actualDate = addMonths(startOfMonth(projStart), actual.month_number - 1);
          if (actualDate >= startOfMonth(filters.startDate) && actualDate <= endOfMonth(filters.endDate)) {
            add(costs, ps.project_id, Number(actual.value));
          }
        }
      }

      for (const mat of (materialsRes as any[])) {
        if (!mat.month_number) continue;
        const proj = projectMap.get(mat.project_id) as any;
        if (!proj?.start_date) continue;
        const projStart = parseISO(proj.start_date);
        const actualDate = addMonths(startOfMonth(projStart), mat.month_number - 1);
        if (actualDate >= startOfMonth(filters.startDate) && actualDate <= endOfMonth(filters.endDate)) {
          add(costs, mat.project_id, Number(mat.value));
        }
      }

      for (const c of (commissionsRes.data || []) as any[]) add(costs, c.project_id, Number(c.planned_value) || 0);

      const byProject: ProjectFinancialRow[] = [];
      const clientMap = new Map<string, DimensionFinancialRow>();
      const managerMap = new Map<string, DimensionFinancialRow>();
      const serviceLineMap = new Map<string, DimensionFinancialRow>();

      const addDim = (map: Map<string, DimensionFinancialRow>, key: string, label: string, rev: number, cost: number) => {
        if (!map.has(key)) map.set(key, { id: key, label, revenue: 0, costs: 0, grossMargin: null, numProjetos: 0 });
        const e = map.get(key)!;
        e.revenue += rev;
        e.costs += cost;
        e.grossMargin = computeMargin(e.revenue, e.costs);
        e.numProjetos += 1;
      };

      for (const proj of projects as any[]) {
        const rev = revenue.get(proj.id) ?? 0;
        const cost = costs.get(proj.id) ?? 0;
        const margin = computeMargin(rev, cost);

        const clientId = proj.client?.id || 'sem-cliente';
        const clientName = proj.client?.company_name || 'Sem cliente';
        const managerId = proj.manager?.id || 'sem-gerente';
        const managerName = proj.manager?.nome || 'Sem gerente';
        const serviceLine = proj.service_line || 'other';
        const serviceLineLabel = resolveServiceLine(proj.service_line);

        byProject.push({
          projectId: proj.id, projectName: proj.name,
          clientId, clientName, managerId, managerName,
          serviceLine, serviceLineLabel,
          revenue: rev, costs: cost, grossMargin: margin,
        });

        addDim(clientMap, clientId, clientName, rev, cost);
        addDim(managerMap, managerId, managerName, rev, cost);
        addDim(serviceLineMap, serviceLine, serviceLineLabel, rev, cost);
      }

      // Decisão #12: garante que todas as linhas do tenant apareçam, mesmo sem projetos no período
      for (const [svcId, svcName] of serviceNameMap) {
        if (!serviceLineMap.has(svcId)) {
          serviceLineMap.set(svcId, { id: svcId, label: svcName, revenue: 0, costs: 0, grossMargin: null, numProjetos: 0 });
        }
      }

      return {
        byProject: byProject.sort((a, b) => b.revenue - a.revenue),
        byClient: [...clientMap.values()].sort((a, b) => b.revenue - a.revenue),
        byManager: [...managerMap.values()].sort((a, b) => b.revenue - a.revenue),
        byServiceLine: [...serviceLineMap.values()].sort((a, b) => b.revenue - a.revenue),
        grossMarginTarget,
      };
    },
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}
