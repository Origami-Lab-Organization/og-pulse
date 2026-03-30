import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addMonths,
  differenceInCalendarMonths,
  eachDayOfInterval,
  endOfMonth,
  parseISO,
  startOfMonth,
  isWeekend,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useHolidays, isHoliday } from '@/hooks/useHolidays';
import { Holiday } from '@/types/holiday';
import { useUpsertMemberMonth } from '@/hooks/useProjectMemberMonths';
import { useToast } from '@/hooks/use-toast';
import { SERVICE_LINE_LABELS } from '@/types/lead';
import { cn } from '@/lib/utils';

const MONTH_COLUMNS = [
  { month: 1, label: 'Jan' },
  { month: 2, label: 'Fev' },
  { month: 3, label: 'Mar' },
  { month: 4, label: 'Abr' },
  { month: 5, label: 'Mai' },
  { month: 6, label: 'Jun' },
  { month: 7, label: 'Jul' },
  { month: 8, label: 'Ago' },
  { month: 9, label: 'Set' },
  { month: 10, label: 'Out' },
  { month: 11, label: 'Nov' },
  { month: 12, label: 'Dez' },
] as const;

interface EmployeeAllocation {
  employeeId: string;
  employeeName: string;
  cargo: string;
  jornadaDiaria: number;
  status: string;
  terminationDate?: string;
}

export type StatusLabel = 'Sobrealocado' | 'Subalocado' | 'Ocioso' | 'Adequado';

export interface StatusDualCounts {
  planned: Record<StatusLabel, number>;
  actual: Record<StatusLabel, number>;
}

export interface PlannerOption {
  value: string;
  label: string;
}

export interface PlannerFilterOptions {
  teams: PlannerOption[];
  managers: PlannerOption[];
  projects: PlannerOption[];
}

export interface PlannerFilters {
  teamId: string;
  managerId: string;
  projectId: string;
  onlyConflicts: boolean;
}

interface MonthTotal {
  monthKey: string;
  month: number;
  planned: number;
  actual: number;
  capacityHours: number;
}

export interface ExpandedProjectRow {
  projectId: string;
  projectName: string;
  projectMemberId: string | null;
  plannedByMonth: number[];
  actualByMonth: number[];
  projectStartDate: string;
  durationMonths: number;
  isContinuous: boolean;
}

export interface ExpandedInternalActivityRow {
  activityTypeId: string;
  activityName: string;
  plannedByMonth: number[];
  actualByMonth: number[];
  editable: true;
}

interface ExpandedAllocationItemRow {
  id: string;
  type: 'project' | 'internal_activity';
  title: string;
  subtitle: string;
  plannedByMonth: number[];
  actualByMonth: number[];
  editableByMonth: boolean[];
}

export interface AllocationPlannerRow {
  employeeId: string;
  employeeName: string;
  cargo: string;
  capacityHours: number;
  totalPlanned: number;
  totalActual: number;
  statusPlanned: StatusLabel;
  statusActual: StatusLabel;
  monthTotals: MonthTotal[];
  plannedUtilizationByMonth: number[];
  projectsById: Record<string, ExpandedProjectRow>;
  internalActivitiesById: Record<string, ExpandedInternalActivityRow>;
  employee: EmployeeAllocation;
}

interface ProjectScope {
  id: string;
  name: string;
  startDate: string;
  durationMonths: number;
  isContinuous: boolean;
  managerId: string;
  managerName: string;
  teamKey: string;
  teamLabel: string;
}

interface RawRow {
  employee: EmployeeAllocation;
  projectsById: Record<string, ExpandedProjectRow>;
  internalActivitiesById: Record<string, ExpandedInternalActivityRow>;
}

interface QueryManager {
  id: string;
  nome: string;
}

interface QueryTermination {
  termination_date: string | null;
}

interface QueryEmployee {
  id: string;
  nome: string;
  cargo: string;
  jornada_diaria: number | null;
  status: string | null;
  employee_terminations: QueryTermination | null;
}

interface QueryProjectMember {
  id: string;
  employee_id: string | null;
  role: string;
  seniority: string;
  employees: QueryEmployee | null;
}

interface QueryProject {
  id: string;
  name: string;
  start_date: string;
  duration_months: number | null;
  is_continuous: boolean | null;
  manager_id: string;
  service_line: string | null;
  manager: QueryManager | null;
  project_members: QueryProjectMember[] | null;
}

interface MemberMonthRow {
  project_member_id: string;
  month_number: number;
  hours: number;
}

interface TimesheetRow {
  project_member_id: string;
  work_date: string;
  hours: number;
}

interface QueryActivityTypeEmployee {
  employee_id: string;
}

interface QueryActivityType {
  id: string;
  name: string;
  applies_to_all: boolean;
  activity_type_employees: QueryActivityTypeEmployee[] | null;
}

interface ActivityEmployeeMonthRow {
  employee_id: string;
  activity_type_id: string;
  year: number;
  month: number;
  hours: number;
}

interface ActivityTimesheetYearRow {
  employee_id: string;
  activity_type_id: string;
  work_date: string;
  hours: number;
}

const STATUS_ORDER: Record<StatusLabel, number> = {
  Sobrealocado: 0,
  Subalocado: 1,
  Ocioso: 2,
  Adequado: 3,
};

const STATUS_STYLES: Record<StatusLabel, string> = {
  Sobrealocado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  Subalocado: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  Ocioso: 'bg-muted text-muted-foreground',
  Adequado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function draftProjectKey(projectId: string, month: number): string {
  return `project:${projectId}::${month}`;
}

function draftActivityKey(activityTypeId: string, month: number): string {
  return `activity:${activityTypeId}::${month}`;
}

function fmt(h: number): string {
  return `${Math.round(h * 10) / 10}h`;
}

type HeatmapReference = 'planned' | 'actual';

function isClosedMonth(selectedYear: number, month: number, now = new Date()): boolean {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (selectedYear < currentYear) return true;
  if (selectedYear > currentYear) return false;
  return month < currentMonth;
}

function getMonthlyHeatmapMeta(
  plannedHours: number,
  actualHours: number,
  capacityHours: number,
  month: number,
  selectedYear: number
) {
  const referenceType: HeatmapReference = isClosedMonth(selectedYear, month) ? 'actual' : 'planned';
  const referenceHours = referenceType === 'actual' ? actualHours : plannedHours;

  if (capacityHours <= 0) {
    return {
      className: 'bg-muted/25 text-foreground',
      referenceType,
      referenceHours,
      pct: 0,
    };
  }

  const pct = (referenceHours / capacityHours) * 100;
  if (pct > 100) {
    return {
      className: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200',
      referenceType,
      referenceHours,
      pct,
    };
  }

  if (pct >= 91 && pct <= 100) {
    return {
      className: 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200',
      referenceType,
      referenceHours,
      pct,
    };
  }

  if (pct >= 90 && pct < 91) {
    return {
      className: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200',
      referenceType,
      referenceHours,
      pct,
    };
  }

  return {
    className: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200',
    referenceType,
    referenceHours,
    pct,
  };
}

function emptyStatusCounts(): Record<StatusLabel, number> {
  return { Sobrealocado: 0, Subalocado: 0, Ocioso: 0, Adequado: 0 };
}

function getAllocationStatus(hours: number, capacity: number): StatusLabel {
  if (hours === 0) return 'Ocioso';
  const pct = capacity > 0 ? (hours / capacity) * 100 : 0;
  if (pct > 100) return 'Sobrealocado';
  if (pct >= 80) return 'Adequado';
  return 'Subalocado';
}

function countWorkingDays(start: Date, end: Date, holidays: Holiday[]): number {
  const days = eachDayOfInterval({ start, end });
  let count = 0;
  for (const day of days) {
    if (isWeekend(day)) continue;
    if (isHoliday(day, holidays)) continue;
    count++;
  }
  return count;
}

function calculateMonthlyCapacity(monthKey: string, jornadaDiaria: number, holidays: Holiday[]): number {
  const monthStart = parseISO(`${monthKey}-01`);
  return countWorkingDays(monthStart, endOfMonth(monthStart), holidays) * jornadaDiaria;
}

function isExcludedForYear(emp: EmployeeAllocation, selectedYear: number): boolean {
  const currentYear = new Date().getFullYear();
  if (emp.status === 'bloqueado' || emp.status === 'arquivado') {
    return selectedYear >= currentYear;
  }

  if (emp.status === 'em_desligamento' || emp.status === 'desligado') {
    const exitYear = emp.terminationDate ? Number(emp.terminationDate.substring(0, 4)) : currentYear;
    return selectedYear > exitYear;
  }

  return false;
}

function monthNumberForProject(year: number, month: number, projectStartDate: string): number {
  const selected = parseISO(`${toMonthKey(year, month)}-01`);
  const start = startOfMonth(parseLocalDate(projectStartDate));
  return differenceInCalendarMonths(selected, start) + 1;
}

function isProjectMonthEditable(project: ProjectScope, year: number, month: number): boolean {
  const monthNumber = monthNumberForProject(year, month, project.startDate);
  if (monthNumber < 1) return false;
  if (!project.isContinuous && monthNumber > project.durationMonths) return false;
  return true;
}

function createEmptyProjectRow(project: ProjectScope, projectMemberId: string | null): ExpandedProjectRow {
  return {
    projectId: project.id,
    projectName: project.name,
    projectMemberId,
    plannedByMonth: Array(12).fill(0),
    actualByMonth: Array(12).fill(0),
    projectStartDate: project.startDate,
    durationMonths: project.durationMonths,
    isContinuous: project.isContinuous,
  };
}

function createEmptyInternalActivityRow(activityTypeId: string, activityName: string): ExpandedInternalActivityRow {
  return {
    activityTypeId,
    activityName,
    plannedByMonth: Array(12).fill(0),
    actualByMonth: Array(12).fill(0),
    editable: true,
  };
}

interface AllocationOverviewProps {
  searchQuery?: string;
  selectedYear: number;
  filters: PlannerFilters;
  onStatusCountsChange?: (counts: StatusDualCounts) => void;
  onFilterOptionsChange?: (options: PlannerFilterOptions) => void;
}

export function AllocationOverview({
  searchQuery = '',
  selectedYear,
  filters,
  onStatusCountsChange,
  onFilterOptionsChange,
}: AllocationOverviewProps) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const isAdmin = employee?.isAdmin ?? false;
  const currentEmployeeId = employee?.id;
  const { data: holidaysData } = useHolidays();
  const holidays = useMemo(() => holidaysData ?? [], [holidaysData]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const upsertMemberMonth = useUpsertMemberMonth();

  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [draftPlanned, setDraftPlanned] = useState<Record<string, number>>({});
  const [originalPlanned, setOriginalPlanned] = useState<Record<string, number>>({});
  const [editingCellKey, setEditingCellKey] = useState<string | null>(null);
  const [editingCellInitialValue, setEditingCellInitialValue] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['allocation-overview-planner', tenantId, isAdmin, currentEmployeeId, selectedYear],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      let projectsQuery = supabase
        .from('projects')
        .select(`
          id,
          name,
          start_date,
          duration_months,
          is_continuous,
          manager_id,
          service_line,
          manager:employees!projects_manager_id_fkey(id, nome),
          project_members (
            id,
            employee_id,
            role,
            seniority,
            employees (
              id,
              nome,
              cargo,
              jornada_diaria,
              status,
              employee_terminations!termination_id (termination_date)
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .or('status.eq.active,portfolio_stage.neq.planning')
        .neq('portfolio_stage', 'completed');

      if (!isAdmin && currentEmployeeId) {
        projectsQuery = projectsQuery.eq('manager_id', currentEmployeeId);
      }

      const { data: projects, error: projectError } = await projectsQuery;
      if (projectError) throw projectError;

      const projectRows = (projects ?? []) as QueryProject[];
      if (projectRows.length === 0) {
        return {
          projects: [] as ProjectScope[],
          rows: [] as RawRow[],
          options: { teams: [], managers: [], projects: [] } as PlannerFilterOptions,
        };
      }

      const scopedProjects: ProjectScope[] = projectRows.map((project) => {
        const teamKey = project.service_line || '__sem_time__';
        const teamLabel = project.service_line
          ? (SERVICE_LINE_LABELS[project.service_line] || project.service_line)
          : 'Sem linha de serviço';

        return {
          id: project.id,
          name: project.name,
          startDate: project.start_date,
          durationMonths: Number(project.duration_months) || 1,
          isContinuous: Boolean(project.is_continuous),
          managerId: project.manager_id,
          managerName: project.manager?.nome || 'Sem gerente',
          teamKey,
          teamLabel,
        };
      });

      const projectById = new Map<string, ProjectScope>(scopedProjects.map((project) => [project.id, project]));

      const allMembers = projectRows.flatMap((project) =>
        (project.project_members || []).map((member) => ({
          projectId: project.id,
          projectStartDate: project.start_date,
          memberId: member.id,
          employeeId: member.employee_id,
          employee: member.employees,
        }))
      );

      const memberMetaById = new Map<string, { projectId: string; projectStartDate: string; employeeId: string }>();
      allMembers.forEach((member) => {
        if (!member.employeeId) return;
        memberMetaById.set(member.memberId, {
          projectId: member.projectId,
          projectStartDate: member.projectStartDate,
          employeeId: member.employeeId,
        });
      });

      const memberIds = Array.from(memberMetaById.keys());
      const employeeIds = Array.from(new Set(
        allMembers
          .map((member) => member.employeeId)
          .filter((id): id is string => Boolean(id))
      ));
      if (memberIds.length === 0) {
        const options = {
          teams: Array.from(new Map(scopedProjects.map((project) => [project.teamKey, project.teamLabel])).entries())
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label)),
          managers: Array.from(new Map(scopedProjects.map((project) => [project.managerId, project.managerName])).entries())
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label)),
          projects: scopedProjects
            .map((project) => ({ value: project.id, label: project.name }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        };

        return {
          projects: scopedProjects,
          rows: [] as RawRow[],
          options,
        };
      }

      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      const [memberMonthsRes, timesheetsRes, activityTypesRes] = await Promise.all([
        supabase
          .from('project_member_months')
          .select('project_member_id, month_number, hours')
          .in('project_member_id', memberIds),
        supabase
          .from('project_timesheets')
          .select('project_member_id, work_date, hours')
          .in('project_member_id', memberIds)
          .gte('work_date', startDate)
          .lte('work_date', endDate),
        supabase
          .from('activity_types')
          .select(`
            id,
            name,
            applies_to_all,
            activity_type_employees(employee_id)
          `)
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('name'),
      ]);

      if (memberMonthsRes.error) throw memberMonthsRes.error;
      if (timesheetsRes.error) throw timesheetsRes.error;
      if (activityTypesRes.error) throw activityTypesRes.error;

      const activityTypes = (activityTypesRes.data ?? []) as QueryActivityType[];
      const activityTypeIds = activityTypes.map((activityType) => activityType.id);

      const [activityEmployeeMonthsRes, activityTimesheetsRes] = await Promise.all([
        activityTypeIds.length === 0 || employeeIds.length === 0
          ? Promise.resolve({ data: [] as ActivityEmployeeMonthRow[], error: null })
          : supabase
            .from('activity_employee_months')
            .select('employee_id, activity_type_id, year, month, hours')
            .eq('tenant_id', tenantId)
            .in('employee_id', employeeIds)
            .in('activity_type_id', activityTypeIds)
            .eq('year', selectedYear),
        activityTypeIds.length === 0 || employeeIds.length === 0
          ? Promise.resolve({ data: [] as ActivityTimesheetYearRow[], error: null })
          : supabase
            .from('activity_timesheets')
            .select('employee_id, activity_type_id, work_date, hours')
            .in('employee_id', employeeIds)
            .in('activity_type_id', activityTypeIds)
            .gte('work_date', startDate)
            .lte('work_date', endDate),
      ]);

      if (activityEmployeeMonthsRes.error) throw activityEmployeeMonthsRes.error;
      if (activityTimesheetsRes.error) throw activityTimesheetsRes.error;

      const memberMonths = (memberMonthsRes.data ?? []) as MemberMonthRow[];
      const timesheets = (timesheetsRes.data ?? []) as TimesheetRow[];
      const activityEmployeeMonths = (activityEmployeeMonthsRes.data ?? []) as ActivityEmployeeMonthRow[];
      const activityTimesheets = (activityTimesheetsRes.data ?? []) as ActivityTimesheetYearRow[];
      const rowMap = new Map<string, RawRow>();

      const ensureRow = (emp: QueryEmployee): RawRow => {
        if (!rowMap.has(emp.id)) {
          rowMap.set(emp.id, {
            employee: {
              employeeId: emp.id,
              employeeName: emp.nome,
              cargo: emp.cargo,
              jornadaDiaria: Number(emp.jornada_diaria) || 8,
              status: emp.status ?? 'ativo',
              terminationDate: emp.employee_terminations?.termination_date || undefined,
            },
            projectsById: {},
            internalActivitiesById: {},
          });
        }
        return rowMap.get(emp.id)!;
      };

      const ensureProjectHours = (row: RawRow, project: ProjectScope, projectMemberId: string | null) => {
        if (!row.projectsById[project.id]) {
          row.projectsById[project.id] = createEmptyProjectRow(project, projectMemberId);
        }
        if (!row.projectsById[project.id].projectMemberId && projectMemberId) {
          row.projectsById[project.id].projectMemberId = projectMemberId;
        }
        return row.projectsById[project.id];
      };

      allMembers.forEach((member) => {
        if (!member.employeeId || !member.employee) return;
        const project = projectById.get(member.projectId);
        if (!project) return;
        const row = ensureRow(member.employee);
        ensureProjectHours(row, project, member.memberId);
      });

      const activityTypeAllowedByEmployee = new Map<string, QueryActivityType[]>();
      employeeIds.forEach((employeeId) => {
        const allowed = activityTypes.filter((activityType) => {
          if (activityType.applies_to_all) return true;
          return (activityType.activity_type_employees || []).some((entry) => entry.employee_id === employeeId);
        });
        activityTypeAllowedByEmployee.set(employeeId, allowed);
      });

      rowMap.forEach((row, employeeId) => {
        const allowed = activityTypeAllowedByEmployee.get(employeeId) || [];
        allowed.forEach((activityType) => {
          if (!row.internalActivitiesById[activityType.id]) {
            row.internalActivitiesById[activityType.id] = createEmptyInternalActivityRow(activityType.id, activityType.name);
          }
        });
      });

      memberMonths.forEach((entry) => {
        const meta = memberMetaById.get(entry.project_member_id);
        if (!meta) return;

        const project = projectById.get(meta.projectId);
        if (!project) return;

        const row = rowMap.get(meta.employeeId);
        if (!row) return;

        const projectMonth = addMonths(parseLocalDate(meta.projectStartDate), Number(entry.month_number) - 1);
        const year = projectMonth.getFullYear();
        if (year !== selectedYear) return;

        const monthIndex = projectMonth.getMonth();
        const projectHours = ensureProjectHours(row, project, entry.project_member_id);
        projectHours.plannedByMonth[monthIndex] += Number(entry.hours) || 0;
      });

      timesheets.forEach((entry) => {
        const meta = memberMetaById.get(entry.project_member_id);
        if (!meta) return;

        const project = projectById.get(meta.projectId);
        if (!project) return;

        const row = rowMap.get(meta.employeeId);
        if (!row) return;

        const month = Number(entry.work_date.substring(5, 7));
        if (!Number.isFinite(month) || month < 1 || month > 12) return;

        const projectHours = ensureProjectHours(row, project, entry.project_member_id);
        projectHours.actualByMonth[month - 1] += Number(entry.hours) || 0;
      });

      activityEmployeeMonths.forEach((entry) => {
        if (Number(entry.year) !== selectedYear) return;
        const row = rowMap.get(entry.employee_id);
        if (!row) return;
        const activityRow = row.internalActivitiesById[entry.activity_type_id];
        if (!activityRow) return;
        const month = Number(entry.month);
        if (!Number.isFinite(month) || month < 1 || month > 12) return;
        activityRow.plannedByMonth[month - 1] += Number(entry.hours) || 0;
      });

      activityTimesheets.forEach((entry) => {
        const row = rowMap.get(entry.employee_id);
        if (!row) return;
        const activityRow = row.internalActivitiesById[entry.activity_type_id];
        if (!activityRow) return;
        const month = Number(entry.work_date.substring(5, 7));
        if (!Number.isFinite(month) || month < 1 || month > 12) return;
        activityRow.actualByMonth[month - 1] += Number(entry.hours) || 0;
      });

      const options: PlannerFilterOptions = {
        teams: Array.from(new Map(scopedProjects.map((project) => [project.teamKey, project.teamLabel])).entries())
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label)),
        managers: Array.from(new Map(scopedProjects.map((project) => [project.managerId, project.managerName])).entries())
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label)),
        projects: scopedProjects
          .map((project) => ({ value: project.id, label: project.name }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      };

      return {
        projects: scopedProjects.sort((a, b) => a.name.localeCompare(b.name)),
        rows: Array.from(rowMap.values()).sort((a, b) => a.employee.employeeName.localeCompare(b.employee.employeeName)),
        options,
      };
    },
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (!data?.options) return;
    onFilterOptionsChange?.(data.options);
  }, [data?.options, onFilterOptionsChange]);

  const scopedProjects = useMemo(() => {
    return (data?.projects || []).filter((project) => {
      if (filters.teamId !== 'all' && project.teamKey !== filters.teamId) return false;
      if (filters.managerId !== 'all' && project.managerId !== filters.managerId) return false;
      return true;
    });
  }, [data?.projects, filters.teamId, filters.managerId]);

  const visibleProjects = useMemo(() => {
    if (filters.projectId === 'all') return scopedProjects;
    return scopedProjects.filter((project) => project.id === filters.projectId);
  }, [scopedProjects, filters.projectId]);

  const rowsWithStatus = useMemo(() => {
    const projectIds = visibleProjects.map((project) => project.id);
    let sourceRows = (data?.rows || []).filter((row) => !isExcludedForYear(row.employee, selectedYear));

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      sourceRows = sourceRows.filter((row) =>
        row.employee.employeeName.toLowerCase().includes(query) ||
        row.employee.cargo.toLowerCase().includes(query)
      );
    }

    const builtRows = sourceRows.map((raw): AllocationPlannerRow => {
      const monthTotals: MonthTotal[] = MONTH_COLUMNS.map(({ month }) => {
        const monthCapacity = calculateMonthlyCapacity(
          toMonthKey(selectedYear, month),
          raw.employee.jornadaDiaria,
          holidays
        );

        const monthPlanned = projectIds.reduce((sum, projectId) => {
          const projectHours = raw.projectsById[projectId];
          return sum + (projectHours?.plannedByMonth[month - 1] || 0);
        }, 0);
        const internalPlanned = Object.values(raw.internalActivitiesById).reduce(
          (sum, activity) => sum + (activity.plannedByMonth[month - 1] || 0),
          0
        );

        const monthActual = projectIds.reduce((sum, projectId) => {
          const projectHours = raw.projectsById[projectId];
          return sum + (projectHours?.actualByMonth[month - 1] || 0);
        }, 0);
        const internalActual = Object.values(raw.internalActivitiesById).reduce(
          (sum, activity) => sum + (activity.actualByMonth[month - 1] || 0),
          0
        );

        return {
          monthKey: toMonthKey(selectedYear, month),
          month,
          planned: monthPlanned + internalPlanned,
          actual: monthActual + internalActual,
          capacityHours: monthCapacity,
        };
      });

      const totalPlanned = monthTotals.reduce((sum, month) => sum + month.planned, 0);
      const totalActual = monthTotals.reduce((sum, month) => sum + month.actual, 0);
      const capacityAnnual = monthTotals.reduce((sum, month) => sum + month.capacityHours, 0);
      const plannedUtilizationByMonth = monthTotals.map((month) => (
        month.capacityHours > 0 ? month.planned / month.capacityHours : 0
      ));

      return {
        employeeId: raw.employee.employeeId,
        employeeName: raw.employee.employeeName,
        cargo: raw.employee.cargo,
        capacityHours: capacityAnnual,
        totalPlanned,
        totalActual,
        statusPlanned: getAllocationStatus(totalPlanned, capacityAnnual),
        statusActual: getAllocationStatus(totalActual, capacityAnnual),
        monthTotals,
        plannedUtilizationByMonth,
        projectsById: raw.projectsById,
        internalActivitiesById: raw.internalActivitiesById,
        employee: raw.employee,
      };
    });

    const visibleRows = filters.onlyConflicts
      ? builtRows.filter((row) => row.statusPlanned !== 'Adequado' || row.statusActual !== 'Adequado')
      : builtRows;

    return visibleRows.sort((a, b) => {
      const severityA = Math.min(STATUS_ORDER[a.statusPlanned], STATUS_ORDER[a.statusActual]);
      const severityB = Math.min(STATUS_ORDER[b.statusPlanned], STATUS_ORDER[b.statusActual]);
      if (severityA !== severityB) return severityA - severityB;
      return a.employeeName.localeCompare(b.employeeName);
    });
  }, [data?.rows, visibleProjects, selectedYear, holidays, searchQuery, filters.onlyConflicts]);

  const counts = useMemo<StatusDualCounts>(() => {
    const result: StatusDualCounts = {
      planned: emptyStatusCounts(),
      actual: emptyStatusCounts(),
    };

    rowsWithStatus.forEach((row) => {
      result.planned[row.statusPlanned] += 1;
      result.actual[row.statusActual] += 1;
    });

    return result;
  }, [rowsWithStatus]);

  useEffect(() => {
    onStatusCountsChange?.(counts);
  }, [counts, onStatusCountsChange]);

  const expandedRow = useMemo(() => {
    if (!expandedEmployeeId) return null;
    return rowsWithStatus.find((row) => row.employeeId === expandedEmployeeId) || null;
  }, [rowsWithStatus, expandedEmployeeId]);

  const closeExpanded = () => {
    setExpandedEmployeeId(null);
    setDraftPlanned({});
    setOriginalPlanned({});
    setEditingCellKey(null);
    setEditingCellInitialValue(0);
  };

  useEffect(() => {
    if (expandedEmployeeId && !expandedRow) {
      closeExpanded();
    }
  }, [expandedEmployeeId, expandedRow]);

  useEffect(() => {
    closeExpanded();
  }, [selectedYear, filters.teamId, filters.managerId, filters.projectId]);

  const initializeDraftForRow = (row: AllocationPlannerRow) => {
    const next: Record<string, number> = {};
    const projectsForExpanded = visibleProjects.filter((project) => {
      const projectHours = row.projectsById[project.id];
      if (!projectHours) return false;
      const hasAnyHours = projectHours.plannedByMonth.some((value) => value > 0)
        || projectHours.actualByMonth.some((value) => value > 0);
      return Boolean(projectHours.projectMemberId) || hasAnyHours;
    });

    projectsForExpanded.forEach((project) => {
      const projectHours = row.projectsById[project.id] || createEmptyProjectRow(project, null);
      MONTH_COLUMNS.forEach(({ month }) => {
        next[draftProjectKey(project.id, month)] = projectHours.plannedByMonth[month - 1] || 0;
      });
    });

    const internalActivitiesForExpanded = Object.values(row.internalActivitiesById)
      .sort((a, b) => a.activityName.localeCompare(b.activityName));

    internalActivitiesForExpanded.forEach((activity) => {
      MONTH_COLUMNS.forEach(({ month }) => {
        next[draftActivityKey(activity.activityTypeId, month)] = activity.plannedByMonth[month - 1] || 0;
      });
    });

    setDraftPlanned(next);
    setOriginalPlanned(next);
  };

  const toggleExpand = (row: AllocationPlannerRow) => {
    if (expandedEmployeeId === row.employeeId) {
      closeExpanded();
      return;
    }

    setExpandedEmployeeId(row.employeeId);
    initializeDraftForRow(row);
  };

  const updateDraftCell = (key: string, nextValue: number) => {
    const safeValue = Math.max(0, Number.isFinite(nextValue) ? nextValue : 0);
    setDraftPlanned((prev) => ({ ...prev, [key]: safeValue }));
  };

  const expandedProjects = useMemo(() => {
    if (!expandedRow) return [];

    return visibleProjects.filter((project) => {
      const projectHours = expandedRow.projectsById[project.id];
      if (!projectHours) return false;
      const hasAnyHours = projectHours.plannedByMonth.some((value) => value > 0)
        || projectHours.actualByMonth.some((value) => value > 0);
      return Boolean(projectHours.projectMemberId) || hasAnyHours;
    });
  }, [expandedRow, visibleProjects]);

  const expandedInternalActivities = useMemo(() => {
    if (!expandedRow) return [];
    return Object.values(expandedRow.internalActivitiesById).sort((a, b) => a.activityName.localeCompare(b.activityName));
  }, [expandedRow]);

  const pendingChangesCount = useMemo(() => {
    if (!expandedRow) return 0;

    let changes = 0;
    expandedProjects.forEach((project) => {
      MONTH_COLUMNS.forEach(({ month }) => {
        if (!isProjectMonthEditable(project, selectedYear, month)) return;
        const key = draftProjectKey(project.id, month);
        const current = draftPlanned[key] ?? 0;
        const original = originalPlanned[key] ?? 0;
        if (Math.round(current * 10) !== Math.round(original * 10)) changes++;
      });
    });

    expandedInternalActivities.forEach((activity) => {
      MONTH_COLUMNS.forEach(({ month }) => {
        const key = draftActivityKey(activity.activityTypeId, month);
        const current = draftPlanned[key] ?? 0;
        const original = originalPlanned[key] ?? 0;
        if (Math.round(current * 10) !== Math.round(original * 10)) changes++;
      });
    });

    return changes;
  }, [expandedInternalActivities, expandedProjects, expandedRow, selectedYear, draftPlanned, originalPlanned]);

  const handleCancelEdits = () => {
    setDraftPlanned(originalPlanned);
    setEditingCellKey(null);
  };

  const handleSaveExpanded = async () => {
    if (!expandedRow) return;

    setIsSaving(true);
    try {
      let persisted = 0;

      for (const project of expandedProjects) {
        const rowProject = expandedRow.projectsById[project.id];
        let projectMemberId = rowProject?.projectMemberId || null;

        for (const { month } of MONTH_COLUMNS) {
          if (!isProjectMonthEditable(project, selectedYear, month)) continue;

          const key = draftProjectKey(project.id, month);
          const original = rowProject?.plannedByMonth[month - 1] || 0;
          const draft = draftPlanned[key] ?? original;

          if (Math.round(draft * 10) === Math.round(original * 10)) continue;

          const monthNumber = monthNumberForProject(selectedYear, month, project.startDate);
          if (monthNumber < 1) continue;

          const plannedHours = Math.max(0, draft);

          if (!projectMemberId) {
            if (plannedHours <= 0) continue;

            const { data: createdMember, error: createError } = await supabase
              .from('project_members')
              .insert({
                project_id: project.id,
                employee_id: expandedRow.employeeId,
                role: expandedRow.cargo || 'Colaborador',
                seniority: 'pleno',
                hours_per_month: plannedHours,
                hourly_rate: 0,
              })
              .select('id')
              .single();

            if (createError) throw createError;
            projectMemberId = createdMember.id;
          }

          await upsertMemberMonth.mutateAsync({
            projectMemberId,
            monthNumber,
            hours: plannedHours,
          });

          persisted++;
        }
      }

      for (const activity of expandedInternalActivities) {
        for (const { month } of MONTH_COLUMNS) {
          const key = draftActivityKey(activity.activityTypeId, month);
          const original = activity.plannedByMonth[month - 1] || 0;
          const draft = draftPlanned[key] ?? original;

          if (Math.round(draft * 10) === Math.round(original * 10)) continue;

          const plannedHours = Math.max(0, draft);
          const upsertPayload = {
            tenant_id: tenantId,
            employee_id: expandedRow.employeeId,
            activity_type_id: activity.activityTypeId,
            year: selectedYear,
            month,
            hours: plannedHours,
            updated_at: new Date().toISOString(),
          };

          const { error: activityUpsertError } = await supabase
            .from('activity_employee_months')
            .upsert([upsertPayload], {
              onConflict: 'employee_id,activity_type_id,year,month',
            });

          if (activityUpsertError) throw activityUpsertError;
          persisted++;
        }
      }

      if (persisted > 0) {
        await queryClient.invalidateQueries({ queryKey: ['allocation-overview-planner'] });
        toast({
          title: 'Alocação atualizada',
          description: `${persisted} célula(s) salva(s) para ${expandedRow.employeeName}.`,
        });
      } else {
        toast({
          title: 'Sem alterações',
          description: 'Não houve mudanças para salvar.',
        });
      }

      closeExpanded();
    } catch (error: unknown) {
      toast({
        title: 'Erro ao salvar alocação',
        description: error instanceof Error ? error.message : 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const beginInlineEdit = (key: string, currentValue: number) => {
    if (isSaving) return;
    setEditingCellKey(key);
    setEditingCellInitialValue(currentValue);
  };

  const endInlineEdit = () => {
    setEditingCellKey(null);
  };

  const cancelInlineEdit = (key: string) => {
    updateDraftCell(key, editingCellInitialValue);
    setEditingCellKey(null);
  };

  const totalColumns = 2 + MONTH_COLUMNS.length + 3;

  const expandedItems = useMemo<ExpandedAllocationItemRow[]>(() => {
    if (!expandedRow) return [];

    const projectItems: ExpandedAllocationItemRow[] = expandedProjects.map((project) => {
      const projectHours = expandedRow.projectsById[project.id] || createEmptyProjectRow(project, null);
      return {
        id: project.id,
        type: 'project',
        title: project.name,
        subtitle: `${project.managerName} · ${project.teamLabel}`,
        plannedByMonth: projectHours.plannedByMonth,
        actualByMonth: projectHours.actualByMonth,
        editableByMonth: MONTH_COLUMNS.map(({ month }) => isProjectMonthEditable(project, selectedYear, month)),
      };
    });

    const internalItems: ExpandedAllocationItemRow[] = expandedInternalActivities.map((activity) => ({
      id: activity.activityTypeId,
      type: 'internal_activity',
      title: activity.activityName,
      subtitle: 'Configuração de atividade interna',
      plannedByMonth: activity.plannedByMonth,
      actualByMonth: activity.actualByMonth,
      editableByMonth: MONTH_COLUMNS.map(() => true),
    }));

    return [...projectItems, ...internalItems];
  }, [expandedInternalActivities, expandedProjects, expandedRow, selectedYear]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="text-base">Planejador Anual de Alocação</CardTitle>
          <p className="text-sm text-muted-foreground">
            Expanda um funcionário para editar itens de alocação por mês no ano selecionado.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {visibleProjects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum projeto encontrado para os filtros selecionados.
          </p>
        ) : rowsWithStatus.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum colaborador corresponde aos filtros selecionados.
          </p>
        ) : (
          <div className="overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[240px]">Pessoa</TableHead>
                  <TableHead className="min-w-[170px]">Cargo</TableHead>
                  {MONTH_COLUMNS.map((month) => (
                    <TableHead key={month.month} className="text-center min-w-[120px]">
                      <div>{month.label}</div>
                      <div className="text-[10px] font-normal text-muted-foreground">Plan | Real</div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[110px]">Total Plan</TableHead>
                  <TableHead className="text-center min-w-[110px]">Total Real</TableHead>
                  <TableHead className="min-w-[200px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rowsWithStatus.map((row) => {
                  const isExpanded = expandedEmployeeId === row.employeeId;

                  return (
                    <Fragment key={row.employeeId}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => toggleExpand(row)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="font-medium">{row.employeeName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.cargo}</TableCell>
                        {row.monthTotals.map((monthTotal, monthIndex) => {
                          const month = MONTH_COLUMNS[monthIndex].month;
                          const heatmap = getMonthlyHeatmapMeta(
                            monthTotal.planned,
                            monthTotal.actual,
                            monthTotal.capacityHours,
                            month,
                            selectedYear
                          );

                          return (
                            <TableCell key={`${row.employeeId}-${monthTotal.monthKey}`} className="py-2 text-center">
                            <div className="flex justify-center">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium',
                                  heatmap.className
                                )}
                                title={`Base da cor: ${heatmap.referenceType === 'planned' ? 'Planejado' : 'Realizado'} (${fmt(heatmap.referenceHours)}) vs Capacidade (${fmt(monthTotal.capacityHours)}) = ${Math.round(heatmap.pct * 10) / 10}%`}
                              >
                                <span>{monthTotal.planned > 0 ? fmt(monthTotal.planned) : '—'}</span>
                                <span className="opacity-70">|</span>
                                <span className="opacity-80">{monthTotal.actual > 0 ? fmt(monthTotal.actual) : '—'}</span>
                              </span>
                            </div>
                            <div className="mt-1 text-center text-[10px] text-muted-foreground">
                              Cap: {fmt(monthTotal.capacityHours)}
                            </div>
                          </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-medium">{row.totalPlanned > 0 ? fmt(row.totalPlanned) : '—'}</TableCell>
                        <TableCell className="text-center font-medium">{row.totalActual > 0 ? fmt(row.totalActual) : '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge className={STATUS_STYLES[row.statusPlanned]}>Plan: {row.statusPlanned}</Badge>
                            <Badge className={STATUS_STYLES[row.statusActual]}>Real: {row.statusActual}</Badge>
                          </div>
                        </TableCell>
                      </TableRow>

                      {isExpanded && expandedRow && (
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={totalColumns} className="p-4">
                            <div className="space-y-4">
                              {expandedItems.length === 0 ? (
                                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                                  Nenhum item de alocação disponível para este funcionário com os filtros atuais.
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-foreground">Itens de alocação</p>
                                  <div className="overflow-auto border rounded-md bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="min-w-[300px]">Item</TableHead>
                                          {MONTH_COLUMNS.map((month, monthIndex) => (
                                            <TableHead key={`expanded-item-${month.month}`} className="min-w-[120px] text-center">
                                              <div>{month.label}</div>
                                              <div className="text-[10px] font-normal text-muted-foreground">
                                                Cap: {expandedRow.monthTotals[monthIndex] ? fmt(expandedRow.monthTotals[monthIndex].capacityHours) : '—'}
                                              </div>
                                            </TableHead>
                                          ))}
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {expandedItems.map((item) => (
                                          <TableRow key={`${expandedRow.employeeId}-${item.type}-${item.id}`} className="h-12">
                                            <TableCell>
                                              <div className="flex items-center gap-2">
                                                <div className="font-medium">{item.title}</div>
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                                                  {item.type === 'project' ? 'Projeto' : 'Atividade interna'}
                                                </Badge>
                                              </div>
                                              <div className="text-xs text-muted-foreground">{item.subtitle}</div>
                                            </TableCell>

                                            {MONTH_COLUMNS.map(({ month }, monthIndex) => {
                                              const key = item.type === 'project'
                                                ? draftProjectKey(item.id, month)
                                                : draftActivityKey(item.id, month);
                                              const original = item.plannedByMonth[monthIndex] || 0;
                                              const draft = draftPlanned[key] ?? original;
                                              const actual = item.actualByMonth[monthIndex] || 0;
                                              const changed = Math.round(draft * 10) !== Math.round((originalPlanned[key] ?? original) * 10);
                                              const isEditing = editingCellKey === key;
                                              const editable = item.editableByMonth[monthIndex];

                                              return (
                                                <TableCell key={`${item.type}-${item.id}-${month}`} className="py-2 align-middle text-center">
                                                  {editable ? (
                                                    isEditing ? (
                                                      <Input
                                                        type="number"
                                                        min={0}
                                                        step={1}
                                                        value={draft}
                                                        autoFocus
                                                        onClick={(e) => e.stopPropagation()}
                                                        onChange={(e) => updateDraftCell(key, Number(e.target.value || 0))}
                                                        onBlur={endInlineEdit}
                                                        onKeyDown={(e) => {
                                                          if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            e.currentTarget.blur();
                                                          }
                                                          if (e.key === 'Escape') {
                                                            e.preventDefault();
                                                            cancelInlineEdit(key);
                                                          }
                                                        }}
                                                        className={cn(
                                                          'mx-auto h-7 w-[92px] text-center text-xs',
                                                          changed && 'border-amber-400'
                                                        )}
                                                        disabled={isSaving}
                                                      />
                                                    ) : (
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          beginInlineEdit(key, draft);
                                                        }}
                                                        className={cn(
                                                          'mx-auto inline-flex h-7 min-w-[92px] items-center justify-center gap-1 rounded border px-2 text-xs',
                                                          'hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                          changed && 'border-amber-400 bg-amber-50/70 dark:bg-amber-900/20',
                                                          !changed && 'border-border bg-background'
                                                        )}
                                                        disabled={isSaving}
                                                      >
                                                        <span className="font-medium">{draft > 0 ? fmt(draft) : '—'}</span>
                                                        <span className="text-muted-foreground">|</span>
                                                        <span className="text-muted-foreground">{actual > 0 ? fmt(actual) : '—'}</span>
                                                      </button>
                                                    )
                                                  ) : (
                                                    <div className="mx-auto inline-flex h-7 min-w-[92px] items-center justify-center rounded border border-dashed px-2 text-xs text-muted-foreground">—</div>
                                                  )}
                                                </TableCell>
                                              );
                                            })}
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              )}

                              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" onClick={handleCancelEdits} disabled={isSaving || pendingChangesCount === 0}>
                                    Cancelar alterações
                                  </Button>
                                  <Button onClick={handleSaveExpanded} disabled={isSaving || pendingChangesCount === 0 || upsertMemberMonth.isPending}>
                                    {isSaving || upsertMemberMonth.isPending ? 'Salvando...' : `Salvar alterações (${pendingChangesCount})`}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
