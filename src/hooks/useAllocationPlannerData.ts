import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function normalizeId(value: string): string | null {
  return value && value !== 'all' ? value : null;
}

export interface AllocationSummaryRpcRow {
  employee_id: string;
  employee_name: string;
  cargo: string;
  jornada_diaria: number | string;
  status: string | null;
  termination_date: string | null;
  month: number | string;
  planned_hours: number | string;
  actual_hours: number | string;
}

export interface AllocationDetailRpcRow {
  item_type: 'project' | 'internal_activity';
  item_id: string;
  project_id: string | null;
  project_member_id: string | null;
  title: string;
  subtitle: string | null;
  client_name: string | null;
  manager_id: string | null;
  manager_name: string | null;
  team_key: string | null;
  team_label: string | null;
  project_start_date: string | null;
  duration_months: number | null;
  is_continuous: boolean | null;
  month: number | string;
  planned_hours: number | string;
  actual_hours: number | string;
}

export interface AllocationProjectOption {
  id: string;
  name: string;
  managerId: string;
  managerName: string;
  teamKey: string;
  teamLabel: string;
  portfolioStage: string | null;
}

interface SummaryParams {
  tenantId: string | undefined;
  selectedYear: number;
  isAdmin: boolean;
  currentEmployeeId: string | undefined;
  managerId: string;
  projectId: string;
  teamId: string;
}

export function useAllocationEmployeeMonthSummary({
  tenantId, selectedYear, isAdmin, currentEmployeeId, managerId, projectId, teamId,
}: SummaryParams) {
  const effectiveManagerId = !isAdmin ? (currentEmployeeId ?? null) : normalizeId(managerId);
  return useQuery({
    queryKey: ['allocation-employee-month-summary', tenantId, selectedYear, effectiveManagerId, normalizeId(projectId), normalizeId(teamId)],
    queryFn: async (): Promise<AllocationSummaryRpcRow[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase.rpc('get_allocation_employee_month_summary', {
        p_tenant_id: tenantId,
        p_year: selectedYear,
        p_manager_id: effectiveManagerId,
        p_project_id: normalizeId(projectId),
        p_team_key: normalizeId(teamId),
      });
      if (error) throw error;
      return (data || []) as AllocationSummaryRpcRow[];
    },
    enabled: !!tenantId,
  });
}

interface DetailParams extends SummaryParams {
  employeeId: string | null;
}

export function useAllocationEmployeeDetail({
  tenantId, selectedYear, employeeId, isAdmin, currentEmployeeId, managerId, projectId, teamId,
}: DetailParams) {
  const effectiveManagerId = !isAdmin ? (currentEmployeeId ?? null) : normalizeId(managerId);
  return useQuery({
    queryKey: ['allocation-employee-detail', tenantId, selectedYear, employeeId, effectiveManagerId, normalizeId(projectId), normalizeId(teamId)],
    queryFn: async (): Promise<AllocationDetailRpcRow[]> => {
      if (!tenantId || !employeeId) return [];
      const { data, error } = await supabase.rpc('get_allocation_employee_detail', {
        p_tenant_id: tenantId,
        p_year: selectedYear,
        p_employee_id: employeeId,
        p_manager_id: effectiveManagerId,
        p_project_id: normalizeId(projectId),
        p_team_key: normalizeId(teamId),
      });
      if (error) throw error;
      return (data || []) as AllocationDetailRpcRow[];
    },
    enabled: !!tenantId && !!employeeId,
  });
}

export function useAllocationProjectOptions(
  tenantId: string | undefined,
  _isAdmin: boolean,
  _currentEmployeeId: string | undefined,
) {
  return useQuery({
    queryKey: ['allocation-project-options', tenantId],
    queryFn: async (): Promise<AllocationProjectOption[]> => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('projects')
        .select(`
          id, name, manager_id, service_line, portfolio_stage,
          manager:employees!projects_manager_id_fkey ( nome ),
          service:services ( name )
        `)
        .eq('tenant_id', tenantId)
        .order('name');
      if (error) throw error;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return ((data as any[]) || []).map((p) => {
        const serviceLine = p.service_line ?? null;
        const teamKey = serviceLine ?? '__sem_time__';
        const teamLabel = (serviceLine && uuidRegex.test(serviceLine) && p.service?.name)
          ? p.service.name
          : (serviceLine ?? 'Sem linha de serviço');
        return {
          id: p.id,
          name: p.name,
          managerId: p.manager_id ?? '',
          managerName: p.manager?.nome ?? 'Sem gerente',
          teamKey,
          teamLabel,
          portfolioStage: p.portfolio_stage ?? null,
        };
      });
    },
    enabled: !!tenantId,
  });
}
