import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { addMonths, startOfMonth, endOfMonth, format, parseISO } from 'date-fns';

export interface AnalyticsFilters {
  startDate: Date;
  endDate: Date;
  clientId?: string;
  managerId?: string;
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
  capacity: number; // jornada_diaria * 22
  allocatedHours: number;
  utilization: number; // percentage
  status: 'overallocated' | 'adequate' | 'underallocated' | 'idle';
}

export interface AnalyticsData {
  revenue: number;
  totalCosts: number;
  laborCost: number;
  supplierCost: number;
  materialCost: number;
  grossMargin: number; // percentage
  grossMarginTarget: number | null;
  costsByProject: CostByProject[];
  employeeUtilization: EmployeeUtilization[];
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
    queryKey: ['analytics', tenantId, startStr, endStr, filters.clientId, filters.managerId, isAdmin, currentEmployeeId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      // 1. Fetch projects with visibility rules
      let projectsQuery = supabase
        .from('projects')
        .select('id, name, start_date, client_id, manager_id')
        .eq('tenant_id', tenantId);

      if (!isAdmin && currentEmployeeId) {
        projectsQuery = projectsQuery.eq('manager_id', currentEmployeeId);
      }
      if (filters.clientId) {
        projectsQuery = projectsQuery.eq('client_id', filters.clientId);
      }
      if (filters.managerId) {
        projectsQuery = projectsQuery.eq('manager_id', filters.managerId);
      }

      const { data: projects, error: projErr } = await projectsQuery;
      if (projErr) throw projErr;
      if (!projects || projects.length === 0) {
        return {
          revenue: 0, totalCosts: 0, laborCost: 0, supplierCost: 0, materialCost: 0,
          grossMargin: 0, grossMarginTarget: null, costsByProject: [], employeeUtilization: [],
        } as AnalyticsData;
      }

      const projectIds = projects.map(p => p.id);

      // 2. Fetch all data in parallel
      const [installmentsRes, timesheetsRes, membersRes, suppliersRes, supplierActualsRes, materialsRes, settingsRes] = await Promise.all([
        // Revenue: installments with payment_date in period
        supabase
          .from('project_installments')
          .select('project_id, value, payment_date')
          .in('project_id', projectIds)
          .gte('payment_date', startStr)
          .lte('payment_date', endStr),

        // Timesheets in period
        supabase
          .from('project_timesheets')
          .select('project_id, project_member_id, hours, work_date')
          .in('project_id', projectIds)
          .gte('work_date', startStr)
          .lte('work_date', endStr),

        // Members with employee cost data
        supabase
          .from('project_members')
          .select('id, project_id, employee_id, employee:employees(id, nome, cargo, total_monthly_cost_estimated, jornada_mensal, jornada_diaria)')
          .in('project_id', projectIds),

        // Project suppliers (to map month_number)
        supabase
          .from('project_suppliers')
          .select('id, project_id')
          .in('project_id', projectIds),

        // Supplier actuals (all, we filter by month mapping)
        supabase
          .from('project_supplier_actuals')
          .select('project_supplier_id, month_number, value'),

        // Materials (realized)
        supabase
          .from('project_materials')
          .select('project_id, month_number, value, is_realized')
          .in('project_id', projectIds)
          .eq('is_realized', true),

        // Financial settings for margin target
        supabase
          .from('financial_settings')
          .select('gross_margin_target_percent')
          .eq('tenant_id', tenantId)
          .maybeSingle(),
      ]);

      const installments = installmentsRes.data || [];
      const timesheets = timesheetsRes.data || [];
      const members = (membersRes.data || []) as any[];
      const projectSuppliers = suppliersRes.data || [];
      const supplierActuals = supplierActualsRes.data || [];
      const materials = materialsRes.data || [];
      const grossMarginTarget = settingsRes.data?.gross_margin_target_percent ?? null;

      // Build lookup maps
      const projectMap = new Map(projects.map(p => [p.id, p]));
      const memberMap = new Map(members.map(m => [m.id, m]));
      const supplierToProject = new Map(projectSuppliers.map(ps => [ps.id, ps.project_id]));

      // Filter start/end month for month_number mapping
      const filterStartMonth = filters.startDate.getMonth();
      const filterStartYear = filters.startDate.getFullYear();

      function isMonthInPeriod(projectStartDate: string, monthNumber: number): boolean {
        const projStart = parseISO(projectStartDate);
        const actualDate = addMonths(startOfMonth(projStart), monthNumber - 1);
        const actualMonth = actualDate.getMonth();
        const actualYear = actualDate.getFullYear();
        return actualMonth === filterStartMonth && actualYear === filterStartYear;
      }

      // 3. Calculate revenue
      const revenue = installments.reduce((sum, i) => sum + Number(i.value), 0);

      // 4. Calculate labor cost per project + employee utilization
      const costsByProjectMap = new Map<string, CostByProject>();
      const employeeHoursMap = new Map<string, { employee: any; hours: number }>();

      // Initialize projects in cost map
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

      // Process timesheets
      for (const ts of timesheets) {
        const member = memberMap.get(ts.project_member_id);
        if (!member?.employee) continue;

        const emp = member.employee;
        const hourlyCost = emp.jornada_mensal > 0
          ? Number(emp.total_monthly_cost_estimated) / Number(emp.jornada_mensal)
          : 0;
        const cost = Number(ts.hours) * hourlyCost;

        // Add to project costs
        const projCost = costsByProjectMap.get(ts.project_id);
        if (projCost) {
          projCost.laborCost += cost;
        }

        // Accumulate employee hours
        const empId = emp.id;
        if (!employeeHoursMap.has(empId)) {
          employeeHoursMap.set(empId, { employee: emp, hours: 0 });
        }
        employeeHoursMap.get(empId)!.hours += Number(ts.hours);
      }

      // 5. Calculate supplier costs
      for (const actual of supplierActuals) {
        const projectId = supplierToProject.get(actual.project_supplier_id);
        if (!projectId) continue;
        const project = projectMap.get(projectId);
        if (!project) continue;

        if (isMonthInPeriod(project.start_date, actual.month_number)) {
          const projCost = costsByProjectMap.get(projectId);
          if (projCost) {
            projCost.supplierCost += Number(actual.value);
          }
        }
      }

      // 6. Calculate material costs
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

      // Finalize costs
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

      const totalCosts = totalLaborCost + totalSupplierCost + totalMaterialCost;
      const grossMargin = revenue > 0 ? ((revenue - totalCosts) / revenue) * 100 : 0;

      // 7. Employee utilization
      // Also include employees allocated to projects but with 0 hours
      const allocatedEmployees = new Set<string>();
      members.forEach(m => {
        if (m.employee) allocatedEmployees.add(m.employee.id);
      });

      const employeeUtilization: EmployeeUtilization[] = [];
      const processedEmployees = new Set<string>();

      // From timesheets
      employeeHoursMap.forEach(({ employee: emp, hours }) => {
        const jornadaDiaria = Number(emp.jornada_diaria) || 8;
        const capacity = jornadaDiaria * 22;
        const utilization = capacity > 0 ? (hours / capacity) * 100 : 0;
        employeeUtilization.push({
          employeeId: emp.id,
          employeeName: emp.nome,
          cargo: emp.cargo,
          jornadaDiaria,
          capacity,
          allocatedHours: hours,
          utilization,
          status: getUtilizationStatus(utilization, hours),
        });
        processedEmployees.add(emp.id);
      });

      // Allocated but no hours (idle)
      members.forEach(m => {
        if (m.employee && !processedEmployees.has(m.employee.id)) {
          const emp = m.employee;
          const jornadaDiaria = Number(emp.jornada_diaria) || 8;
          const capacity = jornadaDiaria * 22;
          employeeUtilization.push({
            employeeId: emp.id,
            employeeName: emp.nome,
            cargo: emp.cargo,
            jornadaDiaria,
            capacity,
            allocatedHours: 0,
            utilization: 0,
            status: 'idle',
          });
          processedEmployees.add(emp.id);
        }
      });

      employeeUtilization.sort((a, b) => b.utilization - a.utilization);

      return {
        revenue,
        totalCosts,
        laborCost: totalLaborCost,
        supplierCost: totalSupplierCost,
        materialCost: totalMaterialCost,
        grossMargin,
        grossMarginTarget,
        costsByProject,
        employeeUtilization,
      } as AnalyticsData;
    },
    enabled: !!tenantId,
  });
}

// Hook to fetch filter options
export function useAnalyticsFilterOptions() {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;

  return useQuery({
    queryKey: ['analytics-filter-options', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      const [clientsRes, managersRes] = await Promise.all([
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
      ]);

      return {
        clients: clientsRes.data || [],
        managers: managersRes.data || [],
      };
    },
    enabled: !!tenantId,
  });
}
