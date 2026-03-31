import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { taxEntryService } from '@/services/taxEntryService';
import type { AnalyticsFilters } from './useAnalyticsData';

export interface FinancialMonthlyPoint {
  monthIndex: number;
  label: string;
  isHighlighted: boolean;
  isPast: boolean;
  // Revenue
  revenueReal: number;
  revenuePlanned: number;
  faturado: number;
  // Taxes
  taxesValue: number;
  taxesRealValue: number | null; // from DAE, null if not available
  // Realized costs
  totalCosts: number;
  laborCost: number;
  supplierCost: number;
  materialCost: number;
  commissionCost: number;
  reimbursementCost: number;
  // Planned costs
  plannedTotalCosts: number;
  plannedLaborCost: number;
  plannedSupplierCost: number;
  plannedMaterialCost: number;
  plannedTaxesValue: number;
  // Margin
  grossMarginPct: number | null;
  plannedGrossMarginPct: number | null;
}

export interface FinancialEvolutionData {
  year: number;
  months: FinancialMonthlyPoint[];
  taxesPercent: number;
  grossMarginTarget: number | null;
}

export function useFinancialEvolution(
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
      'financial-evolution',
      tenantId,
      year,
      filters.clientId,
      filters.managerId,
      filters.projectId,
      isAdmin,
      currentEmployeeId,
    ],
    queryFn: async (): Promise<FinancialEvolutionData> => {
      if (!tenantId) throw new Error('No tenant');

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

      const buildEmpty = (): FinancialMonthlyPoint[] =>
        Array.from({ length: 12 }, (_, i) => ({
          monthIndex: i,
          label: format(new Date(year, i, 1), 'MMM', { locale: ptBR }),
          isHighlighted: false,
          isPast: startOfMonth(new Date(year, i, 1)) <= new Date(),
          revenueReal: 0, revenuePlanned: 0, faturado: 0,
          taxesValue: 0,
          totalCosts: 0, laborCost: 0, supplierCost: 0, materialCost: 0,
          commissionCost: 0, reimbursementCost: 0,
          plannedTotalCosts: 0, plannedLaborCost: 0, plannedSupplierCost: 0, plannedMaterialCost: 0,
          plannedTaxesValue: 0,
          grossMarginPct: null, plannedGrossMarginPct: null,
        }));

      const settingsRes = await supabase
        .from('financial_settings')
        .select('taxes_percent, gross_margin_target_percent')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      const taxesPercent = Number(settingsRes.data?.taxes_percent ?? 0);
      const grossMarginTarget = settingsRes.data?.gross_margin_target_percent ?? null;

      if (!projects || projects.length === 0) {
        return { year, months: buildEmpty(), taxesPercent, grossMarginTarget };
      }

      const projectIds = projects.map(p => p.id);
      const projectMap = new Map(projects.map(p => [p.id, p]));

      const [receivedRes, plannedRes, faturadoRes, timesheetsRes, membersRes, suppliersRes, materialsRes, commissionsRes, reimbursementsRes] = await Promise.all([
        // Received revenue
        supabase
          .from('project_installments')
          .select('payment_date, value')
          .in('project_id', projectIds)
          .eq('status', 'received')
          .gte('payment_date', yearStart)
          .lte('payment_date', yearEnd),

        // Planned revenue (by due_date)
        supabase
          .from('project_installments')
          .select('due_date, value')
          .in('project_id', projectIds)
          .gte('due_date', yearStart)
          .lte('due_date', yearEnd),

        // Faturado: invoiced or received installments with invoice_date
        supabase
          .from('project_installments')
          .select('invoice_date, value')
          .in('project_id', projectIds)
          .in('status', ['invoiced', 'received'])
          .not('invoice_date', 'is', null)
          .gte('invoice_date', yearStart)
          .lte('invoice_date', yearEnd),

        // Timesheets
        supabase
          .from('project_timesheets')
          .select('project_member_id, work_date, hours')
          .in('project_id', projectIds)
          .gte('work_date', yearStart)
          .lte('work_date', yearEnd),

        // Members with hourly cost + planned hours per month
        supabase
          .from('project_members')
          .select('id, project_id, employee:employees(total_monthly_cost_estimated, jornada_mensal), plannedMonths:project_member_months(month_number, hours)')
          .in('project_id', projectIds),

        // Suppliers with realized actuals + planned months
        supabase
          .from('project_suppliers')
          .select('id, project_id, actuals:project_supplier_actuals(month_number, value), plannedMonths:project_supplier_months(month_number, value)')
          .in('project_id', projectIds),

        // All materials (realized and planned)
        supabase
          .from('project_materials')
          .select('project_id, month_number, value, is_realized')
          .in('project_id', projectIds),

        // Commissions paid in year
        supabase
          .from('project_commissions')
          .select('planned_value, paid_date')
          .in('project_id', projectIds)
          .eq('is_paid', true)
          .gte('paid_date', yearStart)
          .lte('paid_date', yearEnd),

        // Reimbursements
        supabase
          .from('reimbursement_requests' as any)
          .select('project_id, total_amount, updated_at')
          .in('project_id', projectIds)
          .in('status', ['approved', 'paid'])
          .gte('updated_at', yearStart)
          .lt('updated_at', `${year + 1}-01-01`),
      ]);

      const received = receivedRes.data || [];
      const planned = plannedRes.data || [];
      const faturado = faturadoRes.data || [];
      const timesheets = timesheetsRes.data || [];
      const members = (membersRes.data || []) as any[];
      const projectSuppliersWithActuals = (suppliersRes.data || []) as any[];
      const materials = materialsRes.data || [];
      const commissions = commissionsRes.data || [];
      const reimbursements = (reimbursementsRes.data || []) as any[];

      // Build member cost map (id -> hourlyCost)
      const memberCostMap = new Map<string, number>();
      for (const m of members) {
        if (!m.employee) continue;
        const hourlyCost = Number(m.employee.jornada_mensal) > 0
          ? Number(m.employee.total_monthly_cost_estimated) / Number(m.employee.jornada_mensal)
          : 0;
        memberCostMap.set(m.id, hourlyCost);
      }

      const monthData = buildEmpty();

      // Revenue received
      for (const r of received) {
        const d = parseISO(r.payment_date);
        if (d.getFullYear() !== year) continue;
        monthData[d.getMonth()].revenueReal += Number(r.value);
      }

      // Revenue planned
      for (const p of planned) {
        const d = parseISO(p.due_date);
        if (d.getFullYear() !== year) continue;
        monthData[d.getMonth()].revenuePlanned += Number(p.value);
      }

      // Faturado
      for (const f of faturado) {
        if (!f.invoice_date) continue;
        const d = parseISO(f.invoice_date);
        if (d.getFullYear() !== year) continue;
        monthData[d.getMonth()].faturado += Number(f.value);
      }

      // Realized labor (timesheets)
      for (const ts of timesheets) {
        const d = parseISO(ts.work_date);
        if (d.getFullYear() !== year) continue;
        const hourlyCost = memberCostMap.get(ts.project_member_id) ?? 0;
        monthData[d.getMonth()].laborCost += Number(ts.hours) * hourlyCost;
      }

      // Planned labor (project_member_months)
      for (const m of members) {
        const project = projectMap.get(m.project_id);
        if (!project?.start_date || !m.employee) continue;
        const hourlyCost = memberCostMap.get(m.id) ?? 0;
        const projStart = parseISO(project.start_date);
        for (const pm of (m.plannedMonths || [])) {
          const actualDate = addMonths(startOfMonth(projStart), pm.month_number - 1);
          if (actualDate.getFullYear() !== year) continue;
          monthData[actualDate.getMonth()].plannedLaborCost += Number(pm.hours) * hourlyCost;
        }
      }

      // Realized + planned supplier costs
      for (const ps of projectSuppliersWithActuals) {
        const project = projectMap.get(ps.project_id);
        if (!project?.start_date) continue;
        const projStart = parseISO(project.start_date);

        for (const actual of (ps.actuals || [])) {
          const actualDate = addMonths(startOfMonth(projStart), actual.month_number - 1);
          if (actualDate.getFullYear() !== year) continue;
          monthData[actualDate.getMonth()].supplierCost += Number(actual.value);
        }

        for (const pm of (ps.plannedMonths || [])) {
          const actualDate = addMonths(startOfMonth(projStart), pm.month_number - 1);
          if (actualDate.getFullYear() !== year) continue;
          monthData[actualDate.getMonth()].plannedSupplierCost += Number(pm.value);
        }
      }

      // Realized + planned material costs
      for (const mat of materials) {
        const project = projectMap.get(mat.project_id);
        if (!project?.start_date || !mat.month_number) continue;
        const projStart = parseISO(project.start_date);
        const actualDate = addMonths(startOfMonth(projStart), mat.month_number - 1);
        if (actualDate.getFullYear() !== year) continue;
        const idx = actualDate.getMonth();
        const val = Number(mat.value);
        // All materials count as planned
        monthData[idx].plannedMaterialCost += val;
        // Only realized count as actual
        if (mat.is_realized) {
          monthData[idx].materialCost += val;
        }
      }

      // Realized commissions
      for (const c of commissions) {
        if (!c.paid_date) continue;
        const d = parseISO(c.paid_date);
        if (d.getFullYear() !== year) continue;
        monthData[d.getMonth()].commissionCost += Number(c.planned_value) || 0;
      }

      // Reimbursements
      for (const r of reimbursements) {
        if (!r.updated_at) continue;
        const d = parseISO(r.updated_at);
        if (d.getFullYear() !== year) continue;
        monthData[d.getMonth()].reimbursementCost += Number(r.total_amount) || 0;
      }

      // Compute derived values (isHighlighted computed externally from filters)
      const today = new Date();
      for (const m of monthData) {
        m.isPast = startOfMonth(new Date(year, m.monthIndex, 1)) <= today;
        m.taxesValue = m.revenueReal * (taxesPercent / 100);
        m.totalCosts = m.laborCost + m.supplierCost + m.materialCost + m.commissionCost + m.reimbursementCost;
        m.plannedTotalCosts = m.plannedLaborCost + m.plannedSupplierCost + m.plannedMaterialCost;
        m.plannedTaxesValue = m.revenuePlanned * (taxesPercent / 100);
        m.grossMarginPct = m.isPast && m.revenueReal > 0
          ? ((m.revenueReal - m.taxesValue - m.totalCosts) / m.revenueReal) * 100
          : null;
        m.plannedGrossMarginPct = m.revenuePlanned > 0
          ? ((m.revenuePlanned - m.plannedTaxesValue - m.plannedTotalCosts) / m.revenuePlanned) * 100
          : null;
      }

      return { year, months: monthData, taxesPercent, grossMarginTarget };
    },
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}
