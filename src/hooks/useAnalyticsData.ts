import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addMonths, startOfMonth, endOfMonth, format, parseISO } from 'date-fns';
import { countWorkingDays } from '@/lib/workingDays';

export interface AnalyticsFilters {
  startDate: Date;
  endDate: Date;
  clientId?: string;
  managerId?: string;
  projectId?: string;
}

export interface CostByProject {
  projectId: string;
  projectName: string;
  laborCost: number;
  supplierCost: number;
  materialCost: number;
  totalCost: number;
}

export interface EmployeeUtilization {
  employeeId: string;
  employeeName: string;
  cargo: string;
  jornadaDiaria: number;
  capacity: number;
  allocatedHours: number;
  utilization: number;
  status: 'overallocated' | 'adequate' | 'underallocated' | 'idle';
  hourlyCost: number;
}

export interface AnalyticsData {
  revenueActual: number;
  revenueProjected: number;
  revenueDiff: number;
  faturado: number;
  totalCosts: number;
  laborCost: number;
  supplierCost: number;
  materialCost: number;
  reimbursementCost: number;
  commissionValue: number;
  grossMargin: number;
  grossMarginTarget: number | null;
  costsByProject: CostByProject[];
  employeeUtilization: EmployeeUtilization[];
  idleHours: number;
  idleCost: number;
  totalCapacity: number;
}

function getUtilizationStatus(utilization: number, allocatedHours: number): EmployeeUtilization['status'] {
  if (allocatedHours === 0) return 'idle';
  if (utilization > 100) return 'overallocated';
  if (utilization >= 80) return 'adequate';
  return 'underallocated';
}

export function useAnalyticsData(filters: AnalyticsFilters) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const isAdmin = employee?.isAdmin ?? false;
  const currentEmployeeId = employee?.id;

  const startStr = format(filters.startDate, 'yyyy-MM-dd');
  const endStr = format(filters.endDate, 'yyyy-MM-dd');

  return useQuery({
    queryKey: ['analytics', tenantId, startStr, endStr, filters.clientId, filters.managerId, filters.projectId, isAdmin, currentEmployeeId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      let projectsQuery = supabase
        .from('projects')
        .select('id, name, start_date, client_id, manager_id')
        .eq('tenant_id', tenantId)
        .neq('status', 'cancelled');

      if (!isAdmin && currentEmployeeId) {
        projectsQuery = projectsQuery.eq('manager_id', currentEmployeeId);
      }
      if (filters.clientId) {
        projectsQuery = projectsQuery.eq('client_id', filters.clientId);
      }
      if (filters.managerId) {
        projectsQuery = projectsQuery.eq('manager_id', filters.managerId);
      }
      if (filters.projectId) {
        projectsQuery = projectsQuery.eq('id', filters.projectId);
      }

      const { data: projects, error: projErr } = await projectsQuery;
      if (projErr) throw projErr;
      if (!projects || projects.length === 0) {
        return {
          revenueActual: 0, revenueProjected: 0, revenueDiff: 0,
          totalCosts: 0, laborCost: 0, supplierCost: 0, materialCost: 0,
          reimbursementCost: 0, commissionValue: 0,
          grossMargin: 0, grossMarginTarget: null, costsByProject: [], employeeUtilization: [],
          idleHours: 0, idleCost: 0, totalCapacity: 0,
        } as AnalyticsData;
      }

      const projectIds = projects.map(p => p.id);

      const dayAfterEnd = new Date(filters.endDate);
      dayAfterEnd.setDate(dayAfterEnd.getDate() + 1);
      const dayAfterEndStr = format(dayAfterEnd, 'yyyy-MM-dd');

      const [installmentsRes, projectedInstallmentsRes, faturadoRes, timesheetsRes, membersRes, suppliersRes, materialsRes, settingsRes, holidaysRes, commissionsRes, reimbursementsRes] = await Promise.all([
        supabase
          .from('project_installments')
          .select('project_id, value, payment_date')
          .in('project_id', projectIds)
          .eq('status', 'received')
          .gte('payment_date', startStr)
          .lte('payment_date', endStr),
        supabase
          .from('project_installments')
          .select('project_id, value, due_date')
          .in('project_id', projectIds)
          .gte('due_date', startStr)
          .lte('due_date', endStr),
        supabase
          .from('project_installments')
          .select('project_id, value, invoice_date')
          .in('project_id', projectIds)
          .in('status', ['invoiced', 'received'])
          .not('invoice_date', 'is', null)
          .gte('invoice_date', startStr)
          .lte('invoice_date', endStr),
        supabase
          .from('project_timesheets')
          .select('project_id, project_member_id, hours, work_date')
          .in('project_id', projectIds)
          .gte('work_date', startStr)
          .lte('work_date', endStr),
        supabase
          .from('project_members')
          .select('id, project_id, employee_id, employee:employees(id, nome, cargo, total_monthly_cost_estimated, jornada_mensal, jornada_diaria, data_admissao, termination:employee_terminations(termination_date))')
          .in('project_id', projectIds),
        supabase
          .from('project_suppliers')
          .select('id, project_id, actuals:project_supplier_actuals(month_number, value)')
          .in('project_id', projectIds),
        supabase
          .from('project_materials')
          .select('project_id, month_number, value, is_realized')
          .in('project_id', projectIds)
          .eq('is_realized', true),
        supabase
          .from('financial_settings')
          .select('gross_margin_target_percent')
          .eq('tenant_id', tenantId)
          .maybeSingle(),
        supabase
          .from('company_holidays')
          .select('holiday_type, fixed_day, fixed_month, specific_date')
          .eq('tenant_id', tenantId)
          .eq('is_active', true),
        supabase
          .from('project_commissions')
          .select('project_id, planned_value, paid_date')
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
          .lt('updated_at', dayAfterEndStr),
      ]);

      const installments = installmentsRes.data || [];
      const projectedInstallments = projectedInstallmentsRes.data || [];
      const faturadoInstallments = (faturadoRes.data || []) as any[];
      const faturado = faturadoInstallments.reduce((sum: number, i: any) => sum + Number(i.value), 0);
      const timesheets = timesheetsRes.data || [];
      const members = (membersRes.data || []) as any[];
      const projectSuppliersWithActuals = (suppliersRes.data || []) as any[];
      const materials = materialsRes.data || [];
      const grossMarginTarget = settingsRes.data?.gross_margin_target_percent ?? null;
      const holidays = holidaysRes.data || [];
      const commissions = commissionsRes.data || [];
      const reimbursements = (reimbursementsRes.data || []) as any[];
      const workingDays = countWorkingDays(filters.startDate, filters.endDate, holidays);

      const projectMap = new Map(projects.map(p => [p.id, p]));
      const memberMap = new Map(members.map(m => [m.id, m]));

      const filterStartMonth = filters.startDate.getMonth();
      const filterStartYear = filters.startDate.getFullYear();

      function isMonthInPeriod(projectStartDate: string, monthNumber: number): boolean {
        const projStart = parseISO(projectStartDate);
        const actualDate = addMonths(startOfMonth(projStart), monthNumber - 1);
        const actualMonth = actualDate.getMonth();
        const actualYear = actualDate.getFullYear();
        return actualMonth === filterStartMonth && actualYear === filterStartYear;
      }

      const revenueActual = installments.reduce((sum, i) => sum + Number(i.value), 0);
      const revenueProjected = projectedInstallments.reduce((sum, i) => sum + Number(i.value), 0);
      const revenueDiff = revenueActual - revenueProjected;

      const costsByProjectMap = new Map<string, CostByProject>();
      const employeeHoursMap = new Map<string, { employee: any; hours: number }>();

      projects.forEach(p => {
        costsByProjectMap.set(p.id, {
          projectId: p.id,
          projectName: p.name,
          laborCost: 0,
          supplierCost: 0,
          materialCost: 0,
          totalCost: 0,
        });
      });

      for (const ts of timesheets) {
        const member = memberMap.get(ts.project_member_id);
        if (!member?.employee) continue;

        const emp = member.employee;
        const hourlyCost = emp.jornada_mensal > 0
          ? Number(emp.total_monthly_cost_estimated) / Number(emp.jornada_mensal)
          : 0;
        const cost = Number(ts.hours) * hourlyCost;

        const projCost = costsByProjectMap.get(ts.project_id);
        if (projCost) {
          projCost.laborCost += cost;
        }

        const empId = emp.id;
        if (!employeeHoursMap.has(empId)) {
          employeeHoursMap.set(empId, { employee: emp, hours: 0 });
        }
        employeeHoursMap.get(empId)!.hours += Number(ts.hours);
      }

      for (const ps of projectSuppliersWithActuals) {
        const project = projectMap.get(ps.project_id);
        if (!project) continue;
        for (const actual of (ps.actuals || [])) {
          if (isMonthInPeriod(project.start_date, actual.month_number)) {
            const projCost = costsByProjectMap.get(ps.project_id);
            if (projCost) {
              projCost.supplierCost += Number(actual.value);
            }
          }
        }
      }

      for (const mat of materials) {
        const project = projectMap.get(mat.project_id);
        if (!project || !mat.month_number) continue;

        if (isMonthInPeriod(project.start_date, mat.month_number)) {
          const projCost = costsByProjectMap.get(mat.project_id);
          if (projCost) {
            projCost.materialCost += Number(mat.value);
          }
        }
      }

      let totalLaborCost = 0;
      let totalSupplierCost = 0;
      let totalMaterialCost = 0;

      const costsByProject: CostByProject[] = [];
      costsByProjectMap.forEach(pc => {
        pc.totalCost = pc.laborCost + pc.supplierCost + pc.materialCost;
        totalLaborCost += pc.laborCost;
        totalSupplierCost += pc.supplierCost;
        totalMaterialCost += pc.materialCost;
        if (pc.totalCost > 0) {
          costsByProject.push(pc);
        }
      });

      costsByProject.sort((a, b) => b.totalCost - a.totalCost);

      const totalReimbursementCost = reimbursements.reduce((sum: number, r: any) => sum + (Number(r.total_amount) || 0), 0);
      const totalCosts = totalLaborCost + totalSupplierCost + totalMaterialCost + totalReimbursementCost;

      const totalCommissions = commissions
        .filter((c: any) => !c.approval_status || c.approval_status === 'approved')
        .reduce((sum, c) => sum + (Number(c.planned_value) || 0), 0);
      const grossMargin = revenueActual > 0 ? ((revenueActual - totalCommissions - totalCosts) / revenueActual) * 100 : 0;

      const employeeUtilization: EmployeeUtilization[] = [];
      const processedEmployees = new Set<string>();

      employeeHoursMap.forEach(({ employee: emp, hours }) => {
        const admDate = emp.data_admissao ? parseISO(emp.data_admissao) : null;
        if (admDate && admDate > filters.endDate) return;

        const termDate = emp.termination?.termination_date ? parseISO(emp.termination.termination_date) : null;
        if (termDate && termDate < filters.startDate) return;

        const jornadaDiaria = Number(emp.jornada_diaria) || 8;
        const effectiveStart = admDate && admDate > filters.startDate ? admDate : filters.startDate;
        const effectiveEnd = termDate && termDate < filters.endDate ? termDate : filters.endDate;
        const effectiveWorkingDays = countWorkingDays(effectiveStart, effectiveEnd, holidays);
        const capacity = jornadaDiaria * effectiveWorkingDays;
        const utilization = capacity > 0 ? (hours / capacity) * 100 : 0;
        const hourlyCost = Number(emp.jornada_mensal) > 0
          ? Number(emp.total_monthly_cost_estimated) / Number(emp.jornada_mensal)
          : 0;
        employeeUtilization.push({
          employeeId: emp.id,
          employeeName: emp.nome,
          cargo: emp.cargo,
          jornadaDiaria,
          capacity,
          allocatedHours: hours,
          utilization,
          status: getUtilizationStatus(utilization, hours),
          hourlyCost,
        });
        processedEmployees.add(emp.id);
      });

      members.forEach(m => {
        if (m.employee && !processedEmployees.has(m.employee.id)) {
          const emp = m.employee;
          const admDate = emp.data_admissao ? parseISO(emp.data_admissao) : null;
          if (admDate && admDate > filters.endDate) return;

          const termDate = emp.termination?.termination_date ? parseISO(emp.termination.termination_date) : null;
          if (termDate && termDate < filters.startDate) return;

          const jornadaDiaria = Number(emp.jornada_diaria) || 8;
          const effectiveStart = admDate && admDate > filters.startDate ? admDate : filters.startDate;
          const effectiveEnd = termDate && termDate < filters.endDate ? termDate : filters.endDate;
          const effectiveWorkingDays = countWorkingDays(effectiveStart, effectiveEnd, holidays);
          const capacity = jornadaDiaria * effectiveWorkingDays;
          const hourlyCost = Number(emp.jornada_mensal) > 0
            ? Number(emp.total_monthly_cost_estimated) / Number(emp.jornada_mensal)
            : 0;
          employeeUtilization.push({
            employeeId: emp.id,
            employeeName: emp.nome,
            cargo: emp.cargo,
            jornadaDiaria,
            capacity,
            allocatedHours: 0,
            utilization: 0,
            status: 'idle',
            hourlyCost,
          });
          processedEmployees.add(emp.id);
        }
      });

      employeeUtilization.sort((a, b) => b.utilization - a.utilization);

      let totalIdleHours = 0;
      let totalIdleCost = 0;
      let totalCapacity = 0;
      employeeUtilization.forEach(eu => {
        totalCapacity += eu.capacity;
        const idle = Math.max(0, eu.capacity - eu.allocatedHours);
        totalIdleHours += idle;
        totalIdleCost += idle * eu.hourlyCost;
      });

      return {
        revenueActual,
        revenueProjected,
        revenueDiff,
        faturado,
        totalCosts,
        laborCost: totalLaborCost,
        supplierCost: totalSupplierCost,
        materialCost: totalMaterialCost,
        reimbursementCost: totalReimbursementCost,
        commissionValue: totalCommissions,
        grossMargin,
        grossMarginTarget,
        costsByProject,
        employeeUtilization,
        idleHours: totalIdleHours,
        idleCost: totalIdleCost,
        totalCapacity,
      } satisfies AnalyticsData;
    },
    enabled: !!tenantId,
  });
}

export function useAnalyticsFilterOptions() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['analytics-filter-options', tenantId],
    queryFn: async () => {
      if (!tenantId) return { clients: [], managers: [], projects: [] };

      const [clientsRes, managersRes, projectsRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, company_name')
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .order('company_name'),
        supabase
          .from('employees')
          .select('id, nome')
          .eq('tenant_id', tenantId)
          .eq('is_gerente', true)
          .eq('status', 'ativo')
          .order('nome'),
        supabase
          .from('projects')
          .select('id, name')
          .eq('tenant_id', tenantId)
          .not('status', 'in', '("cancelled","archived")')
          .order('name'),
      ]);

      return {
        clients: clientsRes.data || [],
        managers: managersRes.data || [],
        projects: projectsRes.data || [],
      };
    },
    enabled: !!tenantId,
  });
}
