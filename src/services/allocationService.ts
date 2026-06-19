import { supabase } from '@/integrations/supabase/client';
import { AllocationGridData, AllocationMonth, AllocationPanelData, AllocationPanelProjectRow, AllocationPerson, AllocationProjectPill } from '@/types/allocation';
import { emptyAllocationCell, getAllocationStatus } from '@/lib/allocationGrid';

interface AllocationSummaryRpcRow {
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
  capacity_hours: number | null;
}

interface AllocationDetailRpcRow {
  item_type: 'project' | 'internal_activity';
  item_id: string;
  project_id: string | null;
  project_member_id?: string | null;
  title: string;
  subtitle?: string | null;
  client_name?: string | null;
  project_start_date?: string | null;
  project_end_date?: string | null;
  month: number;
  planned_hours: number;
  actual_hours: number;
}

function yearMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function isFutureMonth(monthKey: string) {
  const now = new Date();
  return monthKey > yearMonthKey(now.getFullYear(), now.getMonth() + 1);
}

function monthNumberFromProjectStart(projectStartDate: string | null | undefined, year: number, month: number) {
  if (!projectStartDate) return month;
  const start = new Date(`${projectStartDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return month;
  return (year - start.getFullYear()) * 12 + (month - (start.getMonth() + 1)) + 1;
}

function projectCode(name: string) {
  const words = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(Boolean);
  const initials = words.length > 1 ? words.map((word) => word[0]).join('') : name.slice(0, 3);
  return initials.slice(0, 3).toUpperCase();
}

function sumProjectPills(rows: AllocationDetailRpcRow[], month: number) {
  const byProject = new Map<string, AllocationProjectPill>();

  rows
    .filter((row) => row.item_type === 'project' && row.project_id && row.month === month)
    .forEach((row) => {
      const projectId = row.project_id as string;
      const current = byProject.get(projectId) ?? {
        id: projectId,
        code: projectCode(row.title),
        name: row.title,
        hours: 0,
        plannedHours: 0,
        actualHours: 0,
      };

      current.plannedHours = Number(current.plannedHours || 0) + Number(row.planned_hours || 0);
      current.actualHours = Number(current.actualHours || 0) + Number(row.actual_hours || 0);
      current.hours = Number(current.actualHours || 0);
      byProject.set(projectId, current);
    });

  return Array.from(byProject.values())
    .filter((project) => Number(project.plannedHours || 0) > 0 || Number(project.actualHours || 0) > 0)
    .sort((left, right) => Number(right.actualHours || 0) - Number(left.actualHours || 0))
    .map((project) => ({
      ...project,
      hours: Math.round(Number(project.actualHours || 0)),
      plannedHours: Math.round(Number(project.plannedHours || 0)),
      actualHours: Math.round(Number(project.actualHours || 0)),
    }));
}

function sumInternalHours(rows: AllocationDetailRpcRow[], month: number) {
  return rows
    .filter((row) => row.item_type === 'internal_activity' && row.month === month)
    .reduce((sum, row) => sum + Number(row.actual_hours || 0), 0);
}

async function fetchSummaryForYear(tenantId: string, year: number, projectId: string | null) {
  const { data, error } = await supabase.rpc('get_allocation_employee_month_summary', {
    p_tenant_id: tenantId,
    p_year: year,
    p_manager_id: null,
    p_project_id: projectId,
    p_team_key: null,
  });

  if (error) throw error;
  return (data ?? []) as AllocationSummaryRpcRow[];
}

async function fetchDetailForYear(tenantId: string, year: number, employeeId: string, projectId: string | null) {
  const { data, error } = await supabase.rpc('get_allocation_employee_detail', {
    p_tenant_id: tenantId,
    p_year: year,
    p_employee_id: employeeId,
    p_manager_id: null,
    p_project_id: projectId,
    p_team_key: null,
  });

  if (error) throw error;
  return (data ?? []) as AllocationDetailRpcRow[];
}

export const allocationService = {
  async getProjectOptions(tenantId: string) {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, status, manager_id, manager:employees!projects_manager_id_fkey(nome)')
      .eq('tenant_id', tenantId)
      .in('status', ['planning', 'active', 'paused'])
      .order('name', { ascending: true });

    if (error) throw error;
    return (data ?? []).map((project) => {
      const manager = project.manager as { nome?: string | null } | { nome?: string | null }[] | null;
      const managerRecord = Array.isArray(manager) ? manager[0] : manager;
      return {
        id: project.id,
        name: project.name,
        managerId: project.manager_id ?? null,
        managerName: managerRecord?.nome ?? null,
      };
    });
  },

  async getGrid({
    tenantId,
    months,
    projectId,
  }: {
    tenantId: string;
    months: AllocationMonth[];
    projectId: string;
  }): Promise<AllocationGridData> {
    const normalizedProjectId = projectId !== 'all' ? projectId : null;
    const years = Array.from(new Set(months.map((month) => month.year)));
    const monthKeys = new Set(months.map((month) => month.key));

    const [projectOptions, summaryGroups] = await Promise.all([
      this.getProjectOptions(tenantId),
      Promise.all(years.map((year) => fetchSummaryForYear(tenantId, year, normalizedProjectId))),
    ]);

    const summaryRows = summaryGroups.flatMap((rows, index) =>
      rows.map((row) => ({ ...row, year: years[index] })),
    ).filter((row) => monthKeys.has(yearMonthKey(row.year, row.month)));
    const peopleMap = new Map<string, AllocationPerson>();

    summaryRows.forEach((row) => {
      if (!peopleMap.has(row.employee_id)) {
        const cells = Object.fromEntries(months.map((month) => [month.key, emptyAllocationCell(month.key)]));
        peopleMap.set(row.employee_id, {
          id: row.employee_id,
          name: row.employee_name,
          role: row.cargo || 'Sem cargo',
          status: row.status,
          hireDate: row.hire_date,
          terminationDate: row.termination_date,
          dailyHours: Number(row.jornada_diaria ?? 0),
          cells,
        });
      }

      const monthKey = yearMonthKey(row.year, row.month);
      if (!monthKeys.has(monthKey)) return;

      const person = peopleMap.get(row.employee_id);
      if (!person) return;

      const capacityHours = Number(row.capacity_hours ?? 0);
      const plannedHours = Number(row.planned_hours ?? 0);
      const actualProjectHours = Number(row.actual_hours ?? 0);
      const totalHours = isFutureMonth(monthKey) ? plannedHours : actualProjectHours;
      const utilization = capacityHours > 0 ? Math.round((totalHours / capacityHours) * 100) : null;

      person.cells[monthKey] = {
        ...person.cells[monthKey],
        plannedHours,
        actualProjectHours,
        totalHours,
        capacityHours,
        utilization,
        status: getAllocationStatus(utilization),
      };
    });

    const people = Array.from(peopleMap.values());
    const detailPairs = people.flatMap((person) => years.map((year) => ({ person, year })));
    const detailResults = await Promise.all(
      detailPairs.map(({ person, year }) => fetchDetailForYear(tenantId, year, person.id, normalizedProjectId)),
    );

    detailPairs.forEach(({ person, year }, index) => {
      const rows = detailResults[index];
      months
        .filter((month) => month.year === year)
        .forEach((month) => {
          const cell = person.cells[month.key] ?? emptyAllocationCell(month.key);
          const internalHours = sumInternalHours(rows, month.month);
          const actualProjectHours = cell.actualProjectHours;
          const totalHours = isFutureMonth(month.key) ? cell.plannedHours + internalHours : actualProjectHours + internalHours;
          const utilization = cell.capacityHours > 0 ? Math.round((totalHours / cell.capacityHours) * 100) : null;

          person.cells[month.key] = {
            ...cell,
            internalHours,
            totalHours,
            utilization,
            status: getAllocationStatus(utilization),
            projects: sumProjectPills(rows, month.month),
          };
        });
    });

    return {
      months,
      people,
      projects: projectOptions,
      roles: Array.from(new Set(people.map((person) => person.role))).sort((left, right) => left.localeCompare(right, 'pt-BR')),
    };
  },

  async getEmployeePanel({
    tenantId,
    employee,
    months,
    projectId,
  }: {
    tenantId: string;
    employee: AllocationPerson;
    months: AllocationMonth[];
    projectId: string;
  }): Promise<AllocationPanelData> {
    const normalizedProjectId = projectId !== 'all' ? projectId : null;
    const years = Array.from(new Set(months.map((month) => month.year)));
    const monthByKey = new Map(months.map((month) => [month.key, month]));
    const detailGroups = await Promise.all(
      years.map((year) => fetchDetailForYear(tenantId, year, employee.id, normalizedProjectId)),
    );
    const projectRowsByKey = new Map<string, AllocationPanelProjectRow>();

    detailGroups.forEach((rows, index) => {
      const year = years[index];

      rows
        .filter((row) => row.item_type === 'project' && row.project_id && row.project_member_id)
        .forEach((row) => {
          const monthKey = yearMonthKey(year, row.month);
          const month = monthByKey.get(monthKey);
          if (!month) return;

          const projectMemberId = row.project_member_id as string;
          const projectIdValue = row.project_id as string;
          const key = `${projectMemberId}:${monthKey}`;
          const current = projectRowsByKey.get(key) ?? {
            projectId: projectIdValue,
            projectMemberId,
            monthKey,
            monthNumber: monthNumberFromProjectStart(row.project_start_date, year, row.month),
            projectName: row.title,
            clientName: row.client_name || 'Sem cliente',
            subtitle: row.subtitle || row.client_name || 'Projeto',
            plannedHours: 0,
            actualHours: 0,
          };

          current.plannedHours += Number(row.planned_hours || 0);
          current.actualHours += Number(row.actual_hours || 0);
          projectRowsByKey.set(key, current);
        });
    });

    const projectRows = Array.from(projectRowsByKey.values()).map((row) => ({
      ...row,
      plannedHours: Math.round(row.plannedHours),
      actualHours: Math.round(row.actualHours),
    }));

    return {
      employee: {
        id: employee.id,
        name: employee.name,
        role: employee.role,
        status: employee.status,
        hireDate: employee.hireDate,
        terminationDate: employee.terminationDate,
        dailyHours: employee.dailyHours,
      },
      months: months.map((month) => {
        const cell = employee.cells[month.key] ?? emptyAllocationCell(month.key);
        const projects = projectRows
          .filter((row) => row.monthKey === month.key)
          .sort((left, right) => right.plannedHours - left.plannedHours || left.projectName.localeCompare(right.projectName, 'pt-BR'));

        return {
          month,
          projects,
          plannedHours: Math.round(Number(cell.plannedHours || 0)),
          actualHours: Math.round(Number(cell.actualProjectHours || 0) + Number(cell.internalHours || 0)),
        };
      }),
    };
  },

  async allocateToProject({
    projectId,
    employeeId,
    role,
    seniority,
    hoursPerMonth,
  }: {
    projectId: string;
    employeeId: string;
    role: string;
    seniority: string;
    hoursPerMonth: number;
  }) {
    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        employee_id: employeeId,
        role,
        seniority,
        hours_per_month: Math.max(0, hoursPerMonth),
        hourly_rate: 0,
      })
      .select('id, project_id, employee_id')
      .single();

    if (error) throw error;
    return data;
  },

  async deallocateFromProject({ projectMemberId }: { projectMemberId: string }) {
    const { error } = await supabase.from('project_members').delete().eq('id', projectMemberId);

    if (error) throw error;
  },

  async updatePlannedHours({
    projectMemberId,
    monthNumber,
    hours,
  }: {
    projectMemberId: string;
    monthNumber: number;
    hours: number;
  }) {
    const { data, error } = await supabase
      .from('project_member_months')
      .upsert(
        {
          project_member_id: projectMemberId,
          month_number: monthNumber,
          hours: Math.max(0, hours),
        },
        { onConflict: 'project_member_id,month_number' },
      )
      .select('id, project_member_id, month_number, hours')
      .single();

    if (error) throw error;
    return data;
  },
};
