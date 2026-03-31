import { useQuery } from '@tanstack/react-query';
import { format, parseISO, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SERVICE_LINE_LABELS } from '@/types/lead';
import { taxEntryService } from '@/services/taxEntryService';
import type { AnalyticsFilters } from './useAnalyticsData';

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
  taxes: number;
  grossMargin: number | null; // null if no revenue
}

export interface DimensionFinancialRow {
  id: string;
  label: string;
  revenue: number;
  costs: number;
  taxes: number;
  grossMargin: number | null;
}

export interface ProjectFinancialsData {
  byProject: ProjectFinancialRow[];
  byClient: DimensionFinancialRow[];
  byManager: DimensionFinancialRow[];
  byServiceLine: DimensionFinancialRow[];
  taxesPercent: number;
  grossMarginTarget: number | null;
}

function computeMargin(revenue: number, taxes: number, costs: number): number | null {
  if (revenue <= 0) return null;
  return ((revenue - taxes - costs) / revenue) * 100;
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
  const dayAfterEnd = format(new Date(filters.endDate.getTime() + 86400000), 'yyyy-MM-dd');

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
        .select('taxes_percent, gross_margin_target_percent')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      const taxesPercent = Number(settingsRes.data?.taxes_percent ?? 0);
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
        taxesPercent, grossMarginTarget,
      };
      if (!projects || projects.length === 0) return empty;

      const projectIds = projects.map((p: any) => p.id);
      const projectMap = new Map(projects.map((p: any) => [p.id, p]));

      // Fetch ALL tenant project IDs for accurate DAE proration denominator
      const { data: allTenantProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('tenant_id', tenantId)
        .not('status', 'in', '("cancelled","archived")');
      const allTenantProjectIds = (allTenantProjects || []).map((p: any) => p.id);

      const [receivedRes, faturadoRes, faturadoAllRes, timesheetsRes, membersRes, suppliersRes, materialsRes, commissionsRes, reimbursementsRes] = await Promise.all([
        supabase
          .from('project_installments')
          .select('project_id, value')
          .in('project_id', projectIds)
          .eq('status', 'received')
          .gte('payment_date', startStr)
          .lte('payment_date', endStr),

        // Faturado for filtered projects (for per-project revenue)
        supabase
          .from('project_installments')
          .select('project_id, value, invoice_date')
          .in('project_id', projectIds)
          .in('status', ['invoiced', 'received'])
          .not('invoice_date', 'is', null)
          .gte('invoice_date', startStr)
          .lte('invoice_date', endStr),

        // Faturado for ALL tenant projects (for DAE proration denominator)
        supabase
          .from('project_installments')
          .select('project_id, value, invoice_date')
          .in('project_id', allTenantProjectIds)
          .in('status', ['invoiced', 'received'])
          .not('invoice_date', 'is', null)
          .gte('invoice_date', startStr)
          .lte('invoice_date', endStr),

        supabase
          .from('project_timesheets')
          .select('project_id, project_member_id, hours')
          .in('project_id', projectIds)
          .gte('work_date', startStr)
          .lte('work_date', endStr),

        supabase
          .from('project_members')
          .select('id, project_id, employee:employees(total_monthly_cost_estimated, jornada_mensal)')
          .in('project_id', projectIds),

        supabase
          .from('project_suppliers')
          .select('id, project_id, actuals:project_supplier_actuals(month_number, value)')
          .in('project_id', projectIds),

        supabase
          .from('project_materials')
          .select('project_id, month_number, value')
          .in('project_id', projectIds)
          .eq('is_realized', true),

        supabase
          .from('project_commissions')
          .select('project_id, planned_value')
          .in('project_id', projectIds)
          .eq('is_paid', true)
          .gte('paid_date', startStr)
          .lte('paid_date', endStr),

        supabase
          .from('reimbursement_requests' as any)
          .select('project_id, total_amount')
          .in('project_id', projectIds)
          .in('status', ['approved', 'paid'])
          .gte('updated_at', startStr)
          .lt('updated_at', dayAfterEnd),
      ]);

      // Per-project accumulators
      const revenue = new Map<string, number>();
      const costs = new Map<string, number>();
      const add = (map: Map<string, number>, key: string, val: number) =>
        map.set(key, (map.get(key) ?? 0) + val);

      for (const r of (receivedRes.data || []) as any[]) add(revenue, r.project_id, Number(r.value));

      // Member hourly cost map
      const memberCostMap = new Map<string, number>();
      for (const m of (membersRes.data || []) as any[]) {
        if (!m.employee) continue;
        const hourly = Number(m.employee.jornada_mensal) > 0
          ? Number(m.employee.total_monthly_cost_estimated) / Number(m.employee.jornada_mensal)
          : 0;
        memberCostMap.set(m.id, hourly);
      }
      for (const ts of (timesheetsRes.data || []) as any[]) {
        add(costs, ts.project_id, Number(ts.hours) * (memberCostMap.get(ts.project_member_id) ?? 0));
      }

      // Supplier actuals — map month_number to date and check period
      for (const ps of (suppliersRes.data || []) as any[]) {
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

      // Materials
      for (const mat of (materialsRes.data || []) as any[]) {
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
      for (const r of (reimbursementsRes.data || []) as any[]) add(costs, r.project_id, Number(r.total_amount) || 0);

      // Build per-project rows
      const byProject: ProjectFinancialRow[] = [];
      const clientMap = new Map<string, DimensionFinancialRow>();
      const managerMap = new Map<string, DimensionFinancialRow>();
      const serviceLineMap = new Map<string, DimensionFinancialRow>();

      const addDim = (map: Map<string, DimensionFinancialRow>, key: string, label: string, rev: number, cost: number, tax: number) => {
        if (!map.has(key)) map.set(key, { id: key, label, revenue: 0, costs: 0, taxes: 0, grossMargin: null });
        const e = map.get(key)!;
        e.revenue += rev;
        e.costs += cost;
        e.taxes += tax;
        e.grossMargin = computeMargin(e.revenue, e.taxes, e.costs);
      };

      // Fetch tax entries by payment_date in the period (cost appears when paid)
      // Rateio uses faturamento from the reference_month (month before payment)
      let taxEntries: { reference_month: string; total_value: number }[] = [];
      try {
        taxEntries = await taxEntryService.getByPaymentDateRange(tenantId, startStr, endStr);
      } catch { /* ignore */ }

      // Build per-month faturado using ALL tenant projects for accurate proration
      // For each tax entry, we need faturado from its reference_month (not the payment period)
      const allRefMonths = new Set(taxEntries.map(te => te.reference_month));
      
      // Fetch faturado for reference months if different from filter period
      let refMonthFaturadoData: any[] = [];
      if (allRefMonths.size > 0) {
        const refMonthsArr = [...allRefMonths];
        const minRef = refMonthsArr.sort()[0];
        const maxRef = refMonthsArr.sort().reverse()[0];
        const maxRefEnd = format(endOfMonth(parseISO(maxRef)), 'yyyy-MM-dd');
        const { data } = await supabase
          .from('project_installments')
          .select('project_id, value, invoice_date')
          .in('project_id', allTenantProjectIds)
          .in('status', ['invoiced', 'received'])
          .not('invoice_date', 'is', null)
          .gte('invoice_date', minRef)
          .lte('invoice_date', maxRefEnd);
        refMonthFaturadoData = (data || []) as any[];
      }

      const monthlyRevenueByProject = new Map<string, Map<string, number>>();
      const monthlyRevenueTotal = new Map<string, number>();
      
      for (const r of refMonthFaturadoData) {
        if (!r.invoice_date) continue;
        const invoiceDate = parseISO(r.invoice_date);
        const monthKey = format(startOfMonth(invoiceDate), 'yyyy-MM-dd');
        if (!monthlyRevenueByProject.has(monthKey)) monthlyRevenueByProject.set(monthKey, new Map());
        const projMap = monthlyRevenueByProject.get(monthKey)!;
        projMap.set(r.project_id, (projMap.get(r.project_id) ?? 0) + Number(r.value));
        monthlyRevenueTotal.set(monthKey, (monthlyRevenueTotal.get(monthKey) ?? 0) + Number(r.value));
      }

      // Calculate real tax per project (prorated by revenue share using total company faturamento)
      const realTaxByProject = new Map<string, number>();
      for (const te of taxEntries) {
        const monthKey = te.reference_month;
        const totalRevInMonth = monthlyRevenueTotal.get(monthKey) ?? 0;
        if (totalRevInMonth <= 0) continue;
        const projRevMap = monthlyRevenueByProject.get(monthKey);
        if (!projRevMap) continue;
        for (const [projId, projRev] of projRevMap) {
          const share = (projRev / totalRevInMonth) * Number(te.total_value);
          realTaxByProject.set(projId, (realTaxByProject.get(projId) ?? 0) + share);
        }
      }

      const hasRealTaxData = taxEntries.length > 0;

      for (const proj of projects as any[]) {
        const rev = revenue.get(proj.id) ?? 0;
        const cost = costs.get(proj.id) ?? 0;
        // Use real prorated tax if available, otherwise estimate
        const tax = hasRealTaxData && realTaxByProject.has(proj.id)
          ? realTaxByProject.get(proj.id)!
          : rev * (taxesPercent / 100);
        const margin = computeMargin(rev, tax, cost);

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
          revenue: rev, costs: cost, taxes: tax, grossMargin: margin,
        });

        addDim(clientMap, clientId, clientName, rev, cost, tax);
        addDim(managerMap, managerId, managerName, rev, cost, tax);
        addDim(serviceLineMap, serviceLine, serviceLineLabel, rev, cost, tax);
      }

      return {
        byProject: byProject.sort((a, b) => b.revenue - a.revenue),
        byClient: [...clientMap.values()].sort((a, b) => b.revenue - a.revenue),
        byManager: [...managerMap.values()].sort((a, b) => b.revenue - a.revenue),
        byServiceLine: [...serviceLineMap.values()].sort((a, b) => b.revenue - a.revenue),
        taxesPercent,
        grossMarginTarget,
      };
    },
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}
