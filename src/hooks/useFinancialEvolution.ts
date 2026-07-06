import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { resolveCostMonthIndex } from '@/lib/costRecognition';
import type { AnalyticsFilters } from './useAnalyticsData';
import { fetchSuppliersWithActualsAndPlanned, fetchMaterials } from '@/services/projectCostsService';

export interface FinancialMonthlyPoint {
  monthIndex: number;
  label: string;
  isHighlighted: boolean;
  isPast: boolean;
  isCurrent: boolean;
  // Revenue
  revenueReal: number;
  revenuePlanned: number;
  faturado: number;
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
  // Margin
  grossMarginPct: number | null;
  plannedGrossMarginPct: number | null;
}

export interface FinancialEvolutionData {
  year: number;
  months: FinancialMonthlyPoint[];
  grossMarginTarget: number | null;
}

interface TimesheetCostRow {
  project_member_id: string;
  work_date: string;
  hours: number | null;
  cost_per_hour: number | null;
}

interface EmployeeCostJoin {
  total_monthly_cost_estimated: number | null;
  jornada_mensal: number | null;
}

interface ProjectMemberCostRow {
  id: string;
  project_id: string;
  employee: EmployeeCostJoin | EmployeeCostJoin[] | null;
}

interface PlannedRoleAllocationRow {
  month: number;
  planned_hours: number | null;
  cost_per_hour: number | null;
  employee: EmployeeCostJoin | EmployeeCostJoin[] | null;
}

interface SupplierEvolutionRow {
  project_id: string;
  actuals?: { month_number: number; value: number | null }[];
  plannedMonths?: { month_number: number; value: number | null }[];
}

interface ReimbursementCostRow {
  total_amount: number | null;
  updated_at: string | null;
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
          isCurrent: false,
          revenueReal: 0, revenuePlanned: 0, faturado: 0,
          totalCosts: 0, laborCost: 0, supplierCost: 0, materialCost: 0,
          commissionCost: 0, reimbursementCost: 0,
          plannedTotalCosts: 0, plannedLaborCost: 0, plannedSupplierCost: 0, plannedMaterialCost: 0,
          grossMarginPct: null, plannedGrossMarginPct: null,
        }));

      const settingsRes = await supabase
        .from('financial_settings')
        .select('gross_margin_target_percent')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      const grossMarginTarget = settingsRes.data?.gross_margin_target_percent ?? null;

      if (!projects || projects.length === 0) {
        return { year, months: buildEmpty(), grossMarginTarget };
      }

      const projectIds = projects.map(p => p.id);
      const projectMap = new Map(projects.map(p => [p.id, p]));

      const [receivedRes, plannedRes, faturadoRes, timesheetsRes, membersRes, plannedAllocationsRes, suppliersRes, materialsRes, commissionsRes, reimbursementsRes] = await Promise.all([
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
          .from('project_installments')
          .select('invoice_date, value')
          .in('project_id', projectIds)
          .in('status', ['invoiced', 'received'])
          .not('invoice_date', 'is', null)
          .gte('invoice_date', yearStart)
          .lte('invoice_date', yearEnd),
        supabase
          .from('project_timesheets')
          .select('project_member_id, work_date, hours, cost_per_hour')
          .in('project_id', projectIds)
          .gte('work_date', yearStart)
          .lte('work_date', yearEnd),
        supabase
          .from('project_members')
          .select('id, project_id, employee:employees(total_monthly_cost_estimated, jornada_mensal)')
          .in('project_id', projectIds),
        supabase
          .from('project_role_allocations')
          .select('project_id, employee_id, year, month, planned_hours, cost_per_hour, employee:employees(total_monthly_cost_estimated, jornada_mensal)')
          .in('project_id', projectIds)
          .eq('year', year),
        fetchSuppliersWithActualsAndPlanned(projectIds),
        fetchMaterials(projectIds),
        supabase
          .from('project_commissions')
          .select('planned_value, paid_date')
          .in('project_id', projectIds)
          .eq('is_paid', true)
          .gte('paid_date', yearStart)
          .lte('paid_date', yearEnd),
        supabase
          .from('reimbursement_requests')
          .select('project_id, total_amount, updated_at')
          .in('project_id', projectIds)
          .in('status', ['approved', 'paid'])
          .gte('updated_at', yearStart)
          .lt('updated_at', `${year + 1}-01-01`),
      ]);

      const received = receivedRes.data || [];
      const planned = plannedRes.data || [];
      const faturado = faturadoRes.data || [];
      const timesheets = (timesheetsRes.data || []) as TimesheetCostRow[];
      const members = (membersRes.data || []) as ProjectMemberCostRow[];
      const plannedAllocations = (plannedAllocationsRes.data || []) as PlannedRoleAllocationRow[];
      const projectSuppliersWithActuals = suppliersRes as SupplierEvolutionRow[];
      const materials = materialsRes;
      const commissions = commissionsRes.data || [];
      const reimbursements = (reimbursementsRes.data || []) as ReimbursementCostRow[];

      const memberCostMap = new Map<string, number>();
      for (const m of members) {
        const employee = Array.isArray(m.employee) ? m.employee[0] : m.employee;
        if (!employee) continue;
        const hourlyCost = Number(employee.jornada_mensal) > 0
          ? Number(employee.total_monthly_cost_estimated) / Number(employee.jornada_mensal)
          : 0;
        memberCostMap.set(m.id, hourlyCost);
      }

      const monthData = buildEmpty();

      for (const r of received) {
        const d = parseISO(r.payment_date);
        if (d.getFullYear() !== year) continue;
        monthData[d.getMonth()].revenueReal += Number(r.value);
      }

      for (const p of planned) {
        const d = parseISO(p.due_date);
        if (d.getFullYear() !== year) continue;
        monthData[d.getMonth()].revenuePlanned += Number(p.value);
      }

      for (const f of faturado) {
        if (!f.invoice_date) continue;
        const d = parseISO(f.invoice_date);
        if (d.getFullYear() !== year) continue;
        monthData[d.getMonth()].faturado += Number(f.value);
      }

      for (const ts of timesheets) {
        const d = parseISO(ts.work_date);
        if (d.getFullYear() !== year) continue;
        const hourlyCost = ts.cost_per_hour != null
          ? Number(ts.cost_per_hour)
          : (memberCostMap.get(ts.project_member_id) ?? 0);
        monthData[d.getMonth()].laborCost += Number(ts.hours) * hourlyCost;
      }

      for (const allocation of plannedAllocations) {
        const monthIndex = Number(allocation.month) - 1;
        if (monthIndex < 0 || monthIndex > 11) continue;
        const employee = Array.isArray(allocation.employee) ? allocation.employee[0] : allocation.employee;
        const fallbackCost = employee && Number(employee.jornada_mensal) > 0
          ? Number(employee.total_monthly_cost_estimated || 0) / Number(employee.jornada_mensal)
          : 0;
        const hourlyCost = allocation.cost_per_hour != null ? Number(allocation.cost_per_hour) : fallbackCost;
        monthData[monthIndex].plannedLaborCost += Number(allocation.planned_hours || 0) * hourlyCost;
      }

      for (const ps of projectSuppliersWithActuals) {
        const project = projectMap.get(ps.project_id);
        if (!project?.start_date) continue;
        const projStart = parseISO(project.start_date);

        for (const actual of (ps.actuals || [])) {
          // Fornecedor realizado: reconhece pela data da nota (invoice_date) quando
          // houver; senão, mês relativo ao projeto.
          const idx = resolveCostMonthIndex({
            realDate: actual.invoice_date,
            projectStartDate: project.start_date,
            monthNumber: actual.month_number,
            targetYear: year,
          });
          if (idx != null) monthData[idx].supplierCost += Number(actual.value);
        }

        for (const pm of (ps.plannedMonths || [])) {
          const actualDate = addMonths(startOfMonth(projStart), pm.month_number - 1);
          if (actualDate.getFullYear() !== year) continue;
          monthData[actualDate.getMonth()].plannedSupplierCost += Number(pm.value);
        }
      }

      for (const mat of materials) {
        const project = projectMap.get(mat.project_id);
        if (!project?.start_date || !mat.month_number) continue;
        const val = Number(mat.value);

        // Planejado: sempre pelo mês relativo ao projeto (início + month_number − 1).
        const plannedIdx = resolveCostMonthIndex({
          projectStartDate: project.start_date,
          monthNumber: mat.month_number,
          targetYear: year,
        });
        if (plannedIdx != null) monthData[plannedIdx].plannedMaterialCost += val;

        // Realizado: reconhece pela data real da compra (purchase_date) quando
        // houver; senão, cai no mês relativo ao projeto.
        if (mat.is_realized) {
          const realizedIdx = resolveCostMonthIndex({
            realDate: mat.purchase_date,
            projectStartDate: project.start_date,
            monthNumber: mat.month_number,
            targetYear: year,
          });
          if (realizedIdx != null) monthData[realizedIdx].materialCost += val;
        }
      }

      for (const c of commissions) {
        if (!c.paid_date) continue;
        const d = parseISO(c.paid_date);
        if (d.getFullYear() !== year) continue;
        monthData[d.getMonth()].commissionCost += Number(c.planned_value) || 0;
      }

      for (const r of reimbursements) {
        if (!r.updated_at) continue;
        const d = parseISO(r.updated_at);
        if (d.getFullYear() !== year) continue;
        monthData[d.getMonth()].reimbursementCost += Number(r.total_amount) || 0;
      }

      const today = new Date();
      for (const m of monthData) {
        m.isPast = startOfMonth(new Date(year, m.monthIndex, 1)) <= today;
        m.isCurrent = m.monthIndex === today.getMonth() && year === today.getFullYear();

        m.totalCosts = m.laborCost + m.supplierCost + m.materialCost + m.commissionCost + m.reimbursementCost;
        m.plannedTotalCosts = m.plannedLaborCost + m.plannedSupplierCost + m.plannedMaterialCost;
        m.grossMarginPct = m.isPast && m.revenueReal > 0
          ? ((m.revenueReal - m.totalCosts) / m.revenueReal) * 100
          : null;
        m.plannedGrossMarginPct = m.revenuePlanned > 0
          ? ((m.revenuePlanned - m.plannedTotalCosts) / m.revenuePlanned) * 100
          : null;
      }

      return { year, months: monthData, grossMarginTarget };
    },
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}
