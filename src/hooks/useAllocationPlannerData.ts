import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SERVICE_LINE_LABELS } from '@/types/lead';

export interface AllocationSummaryRpcRow {
  employee_id: string;
  employee_name: string;
  cargo: string;
  jornada_diaria: number;
  status: string;
  hire_date: string | null;
  termination_date: string | null;
  month: number;
  planned_hours: number;
  actual_hours: number;
}

export interface AllocationDetailRpcRow {
  item_type: 'project' | 'internal_activity';
  item_id: string;
  project_id: string | null;
  project_member_id: string | null;
  title: string;
  subtitle: string;
  client_name: string | null;
  manager_id: string | null;
  manager_name: string | null;
  team_key: string;
  team_label: string;
  project_start_date: string | null;
  duration_months: number | null;
  is_continuous: boolean | null;
  month: number;
  planned_hours: number;
  actual_hours: number;
}

export interface AllocationProjectOptionRow {
  id: string;
  name: string;
  managerId: string;
  managerName: string;
  teamKey: string;
  teamLabel: string;
  portfolioStage: string | null;
}

function normalizeFilterId(value: string | undefined): string | null {
  return value && value !== 'all' ? value : null;
}

function resolveServiceLine(raw: string | null, serviceNameMap: Map<string, string>) {
  if (!raw) return { key: '__sem_time__', label: 'Sem linha de serviço' };
  return { key: raw, label: serviceNameMap.get(raw) || SERVICE_LINE_LABELS[raw] || raw };
}

export function useAllocationProjectOptions(
  tenantId: string | undefined,
  isAdmin: boolean,
  currentEmployeeId: string | undefined,
) {
  return useQuery({
    queryKey: ['allocation-project-options', tenantId, isAdmin, currentEmployeeId],
    queryFn: async (): Promise<AllocationProjectOptionRow[]> => {
      if (!tenantId) return [];

      let projectsQuery = supabase
        .from('projects')
        .select(`
          id, name, manager_id, service_line, portfolio_stage,
          manager:employees!projects_manager_id_fkey(id, nome)
        `)
        .eq('tenant_id', tenantId);

      if (!isAdmin && currentEmployeeId) {
        projectsQuery = projectsQuery.eq('manager_id', currentEmployeeId);
      }

      const { data: projects, error } = await projectsQuery;
      if (error) throw error;

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const serviceLineIds = Array.from(new Set(
        (projects ?? [])
          .map((project: any) => project.service_line)
          .filter((serviceLine: string | null): serviceLine is string => Boolean(serviceLine) && uuidRegex.test(serviceLine))
      ));

      let serviceNameMap = new Map<string, string>();
      if (serviceLineIds.length > 0) {
        const { data: services, error: servicesError } = await supabase
          .from('services')
          .select('id, name')
          .in('id', serviceLineIds);
        if (servicesError) throw servicesError;
        serviceNameMap = new Map((services ?? []).map((service: { id: string; name: string }) => [service.id, service.name]));
      }

      return (projects ?? []).map((project: any) => {
        const serviceLine = resolveServiceLine(project.service_line, serviceNameMap);
        return {
          id: project.id,
          name: project.name,
          managerId: project.manager_id,
          managerName: project.manager?.nome || 'Sem gerente',
          teamKey: serviceLine.key,
          teamLabel: serviceLine.label,
          portfolioStage: project.portfolio_stage,
        };
      });
    },
    enabled: !!tenantId,
  });
}

export function useAllocationEmployeeMonthSummary({
  tenantId,
  selectedYear,
  isAdmin,
  currentEmployeeId,
  managerId,
  projectId,
  teamId,
}: {
  tenantId: string | undefined;
  selectedYear: number;
  isAdmin: boolean;
  currentEmployeeId: string | undefined;
  managerId: string;
  projectId: string;
  teamId: string;
}) {
  const effectiveManagerId = !isAdmin ? currentEmployeeId ?? null : normalizeFilterId(managerId);
  const effectiveTeamId = normalizeFilterId(teamId);

  return useQuery({
    queryKey: ['allocation-employee-month-summary', tenantId, selectedYear, effectiveManagerId, projectId, effectiveTeamId],
    queryFn: async (): Promise<AllocationSummaryRpcRow[]> => {
      if (!tenantId) return [];

      const { data, error } = await supabase.rpc('get_allocation_employee_month_summary', {
        p_tenant_id: tenantId,
        p_year: selectedYear,
        p_manager_id: effectiveManagerId,
        p_project_id: normalizeFilterId(projectId),
        p_team_key: effectiveTeamId,
      });

      if (error) throw error;
      return (data ?? []) as AllocationSummaryRpcRow[];
    },
    enabled: !!tenantId,
  });
}

export function useAllocationEmployeeDetail({
  tenantId,
  selectedYear,
  employeeId,
  isAdmin,
  currentEmployeeId,
  managerId,
  projectId,
  teamId,
}: {
  tenantId: string | undefined;
  selectedYear: number;
  employeeId: string | null;
  isAdmin: boolean;
  currentEmployeeId: string | undefined;
  managerId: string;
  projectId: string;
  teamId: string;
}) {
  const effectiveManagerId = !isAdmin ? currentEmployeeId ?? null : normalizeFilterId(managerId);
  const effectiveTeamId = normalizeFilterId(teamId);

  return useQuery({
    queryKey: ['allocation-employee-detail', tenantId, selectedYear, employeeId, effectiveManagerId, projectId, effectiveTeamId],
    queryFn: async (): Promise<AllocationDetailRpcRow[]> => {
      if (!tenantId || !employeeId) return [];

      const { data, error } = await supabase.rpc('get_allocation_employee_detail', {
        p_tenant_id: tenantId,
        p_year: selectedYear,
        p_employee_id: employeeId,
        p_manager_id: effectiveManagerId,
        p_project_id: normalizeFilterId(projectId),
        p_team_key: effectiveTeamId,
      });

      if (error) throw error;
      return (data ?? []) as AllocationDetailRpcRow[];
    },
    enabled: !!tenantId && !!employeeId,
  });
}
