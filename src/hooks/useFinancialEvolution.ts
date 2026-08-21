import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, parseISO, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { resolveCostMonthIndex } from '@/lib/costRecognition';
import { getFallbackHourlyCost } from '@/lib/employeeCost';
import type { Holiday } from '@/lib/workingDays';
import type { AnalyticsFilters } from './useAnalyticsData';
import { fetchSuppliersWithActualsAndPlanned, fetchMaterials, fetchProjectCostsRealizedByCategory } from '@/services/projectCostsService';

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
  // Non-project (interno) + demais categorias unificadas de project_costs
  internalLaborCost: number;
  subscriptionCost: number;
  equipmentCost: number;
  reimbursementCost: number;
  travelOtherCost: number;
  // Planned costs — saldo em aberto (atrasado + futuro) por categoria, nunca inclui o que já foi realizado
  plannedTotalCosts: number;
  plannedLaborCost: number;
  plannedSupplierCost: number;
  plannedMaterialCost: number;
  plannedCommissionCost: number;
  plannedSubscriptionCost: number;
  plannedEquipmentCost: number;
  plannedReimbursementCost: number;
  plannedTravelOtherCost: number;
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
  jornada_diaria: number | null;
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
  actuals?: { month_number: number; value: number | null; invoice_date?: string | null }[];
  plannedMonths?: { month_number: number; value: number | null }[];
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
          commissionCost: 0,
          internalLaborCost: 0, subscriptionCost: 0, equipmentCost: 0, reimbursementCost: 0, travelOtherCost: 0,
          plannedTotalCosts: 0, plannedLaborCost: 0, plannedSupplierCost: 0, plannedMaterialCost: 0,
          plannedCommissionCost: 0, plannedSubscriptionCost: 0, plannedEquipmentCost: 0,
          plannedReimbursementCost: 0, plannedTravelOtherCost: 0,
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

      // Mão de obra interna (activity_timesheets) é custo da empresa, não de projeto:
      // só entra na visão-empresa (sem recorte por GP/projeto/cliente).
      const includeInternal = !filters.managerId && !filters.projectId && !filters.clientId;
      const activityPromise = includeInternal
        ? supabase
            .from('activity_timesheets')
            .select('work_date, hours, employee:employees(total_monthly_cost_estimated, jornada_diaria)')
            .eq('tenant_id', tenantId)
            .gte('work_date', yearStart)
            .lte('work_date', yearEnd)
        : Promise.resolve({ data: [] as unknown[] });

      const [receivedRes, plannedRes, faturadoRes, timesheetsRes, membersRes, plannedAllocationsRes, suppliersRes, materialsRes, commissionsRes, otherCosts, activityRes, holidaysRes] = await Promise.all([
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
          .neq('status', 'received')
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
          .select('id, project_id, employee:employees(total_monthly_cost_estimated, jornada_diaria)')
          .in('project_id', projectIds),
        supabase
          .from('project_role_allocations')
          .select('project_id, employee_id, year, month, planned_hours, cost_per_hour, employee:employees(total_monthly_cost_estimated, jornada_diaria)')
          .in('project_id', projectIds)
          .eq('year', year),
        fetchSuppliersWithActualsAndPlanned(projectIds),
        fetchMaterials(projectIds),
        supabase
          .from('project_commissions')
          .select('planned_value, paid_date, is_paid, installment:project_installments(due_date)')
          .in('project_id', projectIds),
        fetchProjectCostsRealizedByCategory(projectIds, year, ['subscription', 'equipment_rental', 'travel', 'reimbursement', 'other']),
        activityPromise,
        supabase
          .from('company_holidays')
          .select('holiday_type, fixed_day, fixed_month, specific_date')
          .eq('tenant_id', tenantId)
          .eq('is_active', true),
      ]);

      const holidays = (holidaysRes.data || []) as Holiday[];
      const received = receivedRes.data || [];
      const planned = plannedRes.data || [];
      const faturado = faturadoRes.data || [];
      const timesheets = (timesheetsRes.data || []) as TimesheetCostRow[];
      const members = (membersRes.data || []) as ProjectMemberCostRow[];
      const plannedAllocations = (plannedAllocationsRes.data || []) as PlannedRoleAllocationRow[];
      const projectSuppliersWithActuals = suppliersRes as SupplierEvolutionRow[];
      const materials = materialsRes;
      const commissions = commissionsRes.data || [];
      const activityRows = ((activityRes as { data?: unknown[] }).data || []) as Array<{
        work_date: string;
        hours: number | null;
        employee: EmployeeCostJoin | EmployeeCostJoin[] | null;
      }>;

      const memberCostMap = new Map<string, { jornadaDiaria: number; monthlyCostEstimated: number }>();
      for (const m of members) {
        const employee = Array.isArray(m.employee) ? m.employee[0] : m.employee;
        if (!employee) continue;
        memberCostMap.set(m.id, {
          jornadaDiaria: Number(employee.jornada_diaria) || 8,
          monthlyCostEstimated: Number(employee.total_monthly_cost_estimated) || 0,
        });
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
        const monthIdx = d.getMonth();
        const info = memberCostMap.get(ts.project_member_id);
        const hourlyCost = ts.cost_per_hour != null
          ? Number(ts.cost_per_hour)
          : info
            ? getFallbackHourlyCost(info.monthlyCostEstimated, info.jornadaDiaria, year, monthIdx, holidays)
            : 0;
        monthData[monthIdx].laborCost += Number(ts.hours) * hourlyCost;
      }

      for (const allocation of plannedAllocations) {
        const monthIndex = Number(allocation.month) - 1;
        if (monthIndex < 0 || monthIndex > 11) continue;
        const employee = Array.isArray(allocation.employee) ? allocation.employee[0] : allocation.employee;
        const fallbackCost = employee
          ? getFallbackHourlyCost(Number(employee.total_monthly_cost_estimated || 0), Number(employee.jornada_diaria) || 8, year, monthIndex, holidays)
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

        if (mat.is_realized) {
          // Realizado: reconhece pela data real da compra (purchase_date) quando
          // houver; senão, cai no mês relativo ao projeto.
          const realizedIdx = resolveCostMonthIndex({
            realDate: mat.purchase_date,
            projectStartDate: project.start_date,
            monthNumber: mat.month_number,
            targetYear: year,
          });
          if (realizedIdx != null) monthData[realizedIdx].materialCost += val;
        } else {
          // Ainda não realizado (saldo em aberto): sempre pelo mês relativo ao
          // projeto (início + month_number − 1).
          const plannedIdx = resolveCostMonthIndex({
            projectStartDate: project.start_date,
            monthNumber: mat.month_number,
            targetYear: year,
          });
          if (plannedIdx != null) monthData[plannedIdx].plannedMaterialCost += val;
        }
      }

      for (const c of commissions) {
        if (c.is_paid) {
          if (!c.paid_date) continue;
          const d = parseISO(c.paid_date);
          if (d.getFullYear() !== year) continue;
          monthData[d.getMonth()].commissionCost += Number(c.planned_value) || 0;
        } else {
          // Ainda não paga (saldo em aberto): reconhece pelo vencimento da parcela vinculada.
          const installment = Array.isArray(c.installment) ? c.installment[0] : c.installment;
          if (!installment?.due_date) continue;
          const d = parseISO(installment.due_date);
          if (d.getFullYear() !== year) continue;
          monthData[d.getMonth()].plannedCommissionCost += Number(c.planned_value) || 0;
        }
      }

      // Demais categorias de project_costs (subscription/equipment_rental/travel/reimbursement/other):
      // realizado e previsto já reconhecidos no mês de calendário pelo service.
      for (const c of otherCosts.actuals) {
        const target = monthData[c.monthIndex];
        if (!target) continue;
        if (c.category === 'subscription') target.subscriptionCost += c.value;
        else if (c.category === 'equipment_rental') target.equipmentCost += c.value;
        else if (c.category === 'reimbursement') target.reimbursementCost += c.value;
        else target.travelOtherCost += c.value; // travel + other
      }

      for (const c of otherCosts.planned) {
        const target = monthData[c.monthIndex];
        if (!target) continue;
        if (c.category === 'subscription') target.plannedSubscriptionCost += c.value;
        else if (c.category === 'equipment_rental') target.plannedEquipmentCost += c.value;
        else if (c.category === 'reimbursement') target.plannedReimbursementCost += c.value;
        else target.plannedTravelOtherCost += c.value; // travel + other
      }

      // Mão de obra interna (não-billable): horas de activity_timesheets × custo-hora.
      // Sem contrapartida de planejamento na base hoje — não entra em plannedTotalCosts.
      for (const ts of activityRows) {
        if (!ts.work_date) continue;
        const d = parseISO(ts.work_date);
        if (d.getFullYear() !== year) continue;
        const emp = Array.isArray(ts.employee) ? ts.employee[0] : ts.employee;
        const hourlyCost = emp
          ? getFallbackHourlyCost(Number(emp.total_monthly_cost_estimated || 0), Number(emp.jornada_diaria) || 8, year, d.getMonth(), holidays)
          : 0;
        monthData[d.getMonth()].internalLaborCost += Number(ts.hours || 0) * hourlyCost;
      }

      const today = new Date();
      for (const m of monthData) {
        m.isPast = startOfMonth(new Date(year, m.monthIndex, 1)) <= today;
        m.isCurrent = m.monthIndex === today.getMonth() && year === today.getFullYear();

        m.totalCosts = m.laborCost + m.supplierCost + m.materialCost + m.commissionCost
          + m.internalLaborCost + m.subscriptionCost + m.equipmentCost + m.reimbursementCost + m.travelOtherCost;

        // Mão de obra não tem, por item, um sinalizador "já realizado" comparável ao de
        // fornecedor/material/comissão (o planejado vem de project_role_allocations, o
        // realizado de project_timesheets — tabelas e granularidades diferentes). Por
        // isso o saldo em aberto de mão de obra é o resíduo do MÊS: o que foi planejado
        // menos o que já foi de fato apontado.
        m.plannedLaborCost = Math.max(0, m.plannedLaborCost - m.laborCost);

        // plannedXxxCost (fornecedor/material/comissão/assinatura/equipamento/reembolso/
        // outros) já chega aqui como saldo em aberto (nunca inclui o que virou actual) —
        // soma direta, sem subtrair de novo. Mão de obra interna não tem previsto na base.
        m.plannedTotalCosts = m.plannedLaborCost + m.plannedSupplierCost + m.plannedMaterialCost
          + m.plannedCommissionCost + m.plannedSubscriptionCost + m.plannedEquipmentCost
          + m.plannedReimbursementCost + m.plannedTravelOtherCost;

        m.grossMarginPct = m.isPast && m.revenueReal > 0
          ? ((m.revenueReal - m.totalCosts) / m.revenueReal) * 100
          : null;

        // Margem projetada = considerando tudo que ainda está em aberto (atrasado +
        // futuro) como se fosse realizado, sobre a receita total esperada (recebida +
        // pendente). Mais estável do que comparar só o saldo em aberto de cada lado.
        const receitaTotalEsperada = m.revenueReal + m.revenuePlanned;
        const custoTotalEsperado = m.totalCosts + m.plannedTotalCosts;
        m.plannedGrossMarginPct = receitaTotalEsperada > 0
          ? ((receitaTotalEsperada - custoTotalEsperado) / receitaTotalEsperada) * 100
          : null;
      }

      return { year, months: monthData, grossMarginTarget };
    },
    enabled: !!tenantId && (options?.enabled ?? true),
  });
}
