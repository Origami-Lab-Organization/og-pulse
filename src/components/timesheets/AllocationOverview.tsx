import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Building2, User, Wrench } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addMonths,
  differenceInCalendarMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  isWeekend,
} from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useHolidays, isHoliday } from '@/hooks/useHolidays';
import { Holiday } from '@/types/holiday';
import { useUpsertMemberMonth } from '@/hooks/useProjectMemberMonths';
import { useToast } from '@/hooks/use-toast';
import { SERVICE_LINE_LABELS } from '@/types/lead';
import { cn } from '@/lib/utils';
import { AllocationHeatmapLegend } from './AllocationHeatmapLegend';
import { AllocationEditableCell } from './AllocationEditableCell';
import { AllocationSaveDialog, ChangeEntry } from './AllocationSaveDialog';
import { AllocationCorrectionDialog } from './AllocationCorrectionDialog';

/* ─── Constants ─── */

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

/* ─── Types ─── */

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

interface QueryManager { id: string; nome: string; }
interface QueryTermination { termination_date: string | null; }
interface QueryEmployee {
  id: string; nome: string; cargo: string;
  jornada_diaria: number | null; status: string | null;
  employee_terminations: QueryTermination | null;
}
interface QueryProjectMember {
  id: string; employee_id: string | null; role: string; seniority: string;
  employees: QueryEmployee | null;
}
interface QueryProject {
  id: string; name: string; start_date: string; duration_months: number | null;
  is_continuous: boolean | null; manager_id: string; service_line: string | null;
  manager: QueryManager | null; project_members: QueryProjectMember[] | null;
}
interface MemberMonthRow { project_member_id: string; month_number: number; hours: number; }
interface TimesheetRow { project_member_id: string; work_date: string; hours: number; }
interface QueryActivityTypeEmployee { employee_id: string; }
interface QueryActivityType {
  id: string; name: string; applies_to_all: boolean;
  activity_type_employees: QueryActivityTypeEmployee[] | null;
}
interface ActivityEmployeeMonthRow { employee_id: string; activity_type_id: string; year: number; month: number; hours: number; }
interface ActivityTimesheetYearRow { employee_id: string; activity_type_id: string; work_date: string; hours: number; }

/* ─── Helpers ─── */

const STATUS_ORDER: Record<StatusLabel, number> = {
  Sobrealocado: 0, Subalocado: 1, Ocioso: 2, Adequado: 3,
};

const STATUS_STYLES: Record<StatusLabel, string> = {
  Sobrealocado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  Subalocado: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
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

function isClosedMonth(selectedYear: number, month: number, now = new Date()): boolean {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (selectedYear < currentYear) return true;
  if (selectedYear > currentYear) return false;
  return month < currentMonth;
}

/** P0.1 — Fixed heatmap bands */
function getMonthlyHeatmapMeta(
  plannedHours: number,
  actualHours: number,
  capacityHours: number,
  month: number,
  selectedYear: number,
) {
  const referenceType = isClosedMonth(selectedYear, month) ? 'actual' as const : 'planned' as const;
  const referenceHours = referenceType === 'actual' ? actualHours : plannedHours;

  if (capacityHours <= 0) {
    return { className: 'bg-muted/25 text-foreground', referenceType, referenceHours, pct: 0 };
  }

  const pct = (referenceHours / capacityHours) * 100;

  if (pct === 0) {
    return { className: 'bg-muted/40 text-muted-foreground', referenceType, referenceHours, pct };
  }
  if (pct > 100) {
    return { className: 'bg-red-100 text-red-900 dark:bg-red-900/30 dark:text-red-200', referenceType, referenceHours, pct };
  }
  if (pct >= 91) {
    return { className: 'bg-green-100 text-green-900 dark:bg-green-900/30 dark:text-green-200', referenceType, referenceHours, pct };
  }
  if (pct >= 80) {
    return { className: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200', referenceType, referenceHours, pct };
  }
  return { className: 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200', referenceType, referenceHours, pct };
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
  if (emp.status === 'bloqueado' || emp.status === 'arquivado') return selectedYear >= currentYear;
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
    projectId: project.id, projectName: project.name, projectMemberId,
    plannedByMonth: Array(12).fill(0), actualByMonth: Array(12).fill(0),
    projectStartDate: project.startDate, durationMonths: project.durationMonths, isContinuous: project.isContinuous,
  };
}

function createEmptyInternalActivityRow(activityTypeId: string, activityName: string): ExpandedInternalActivityRow {
  return {
    activityTypeId, activityName,
    plannedByMonth: Array(12).fill(0), actualByMonth: Array(12).fill(0),
    editable: true,
  };
}

/** P0.2 — Current month helper */
function getCurrentMonthIndex(selectedYear: number): number {
  const now = new Date();
  if (now.getFullYear() !== selectedYear) return -1;
  return now.getMonth(); // 0-based
}

/* ─── Component Props ─── */

interface AllocationOverviewProps {
  searchQuery?: string;
  selectedYear: number;
  filters: PlannerFilters;
  onStatusCountsChange?: (counts: StatusDualCounts) => void;
  onFilterOptionsChange?: (options: PlannerFilterOptions) => void;
  onKPIDataChange?: (data: { counts: StatusDualCounts; total: number }) => void;
}

/* ─── Component ─── */

export function AllocationOverview({
  searchQuery = '',
  selectedYear,
  filters,
  onStatusCountsChange,
  onFilterOptionsChange,
  onKPIDataChange,
}: AllocationOverviewProps) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const isAdmin = employee?.isAdmin ?? false;
  const isManager = employee?.is_gerente ?? false;
  const canEditActual = isAdmin || isManager;
  const currentEmployeeId = employee?.id;
  const { data: holidaysData } = useHolidays();
  const holidays = useMemo(() => holidaysData ?? [], [holidaysData]);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const upsertMemberMonth = useUpsertMemberMonth();

  

  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [correctionEmployeeId, setCorrectionEmployeeId] = useState<string | null>(null);
  const [correctionEmployeeName, setCorrectionEmployeeName] = useState('');
  const [draftPlanned, setDraftPlanned] = useState<Record<string, number>>({});
  const [originalPlanned, setOriginalPlanned] = useState<Record<string, number>>({});
  const [editingCellKey, setEditingCellKey] = useState<string | null>(null);
  const [editingCellInitialValue, setEditingCellInitialValue] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const currentMonthIndex = useMemo(() => getCurrentMonthIndex(selectedYear), [selectedYear]);

  /* ─── Data Query (unchanged logic) ─── */
  const { data, isLoading } = useQuery({
    queryKey: ['allocation-overview-planner', tenantId, isAdmin, currentEmployeeId, selectedYear],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      let projectsQuery = supabase
        .from('projects')
        .select(`
          id, name, start_date, duration_months, is_continuous, manager_id, service_line,
          manager:employees!projects_manager_id_fkey(id, nome),
          project_members (
            id, employee_id, role, seniority,
            employees (
              id, nome, cargo, jornada_diaria, status,
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
        return { projects: [] as ProjectScope[], rows: [] as RawRow[], options: { teams: [], managers: [], projects: [] } as PlannerFilterOptions };
      }

      // Resolve service_line UUIDs to names
      const serviceLineIds = Array.from(new Set(projectRows.map((p) => p.service_line).filter(Boolean))) as string[];
      let serviceNameMap = new Map<string, string>();
      if (serviceLineIds.length > 0) {
        const { data: services } = await supabase.from('services').select('id, name').in('id', serviceLineIds);
        if (services) serviceNameMap = new Map(services.map((s: { id: string; name: string }) => [s.id, s.name]));
      }

      const resolveServiceLine = (raw: string | null): { key: string; label: string } => {
        if (!raw) return { key: '__sem_time__', label: 'Sem linha de serviço' };
        const name = serviceNameMap.get(raw) || SERVICE_LINE_LABELS[raw] || raw;
        return { key: raw, label: name };
      };

      const scopedProjects: ProjectScope[] = projectRows.map((p) => {
        const sl = resolveServiceLine(p.service_line);
        return {
          id: p.id, name: p.name, startDate: p.start_date,
          durationMonths: Number(p.duration_months) || 1,
          isContinuous: Boolean(p.is_continuous),
          managerId: p.manager_id,
          managerName: p.manager?.nome || 'Sem gerente',
          teamKey: sl.key,
          teamLabel: sl.label,
        };
      });

      const projectById = new Map<string, ProjectScope>(scopedProjects.map((p) => [p.id, p]));

      const allMembers = projectRows.flatMap((p) =>
        (p.project_members || []).map((m) => ({
          projectId: p.id, projectStartDate: p.start_date,
          memberId: m.id, employeeId: m.employee_id, employee: m.employees,
        }))
      );

      const memberMetaById = new Map<string, { projectId: string; projectStartDate: string; employeeId: string }>();
      allMembers.forEach((m) => { if (m.employeeId) memberMetaById.set(m.memberId, { projectId: m.projectId, projectStartDate: m.projectStartDate, employeeId: m.employeeId }); });

      const memberIds = Array.from(memberMetaById.keys());
      const employeeIds = Array.from(new Set(allMembers.map((m) => m.employeeId).filter((id): id is string => Boolean(id))));

      if (memberIds.length === 0) {
        const options = buildFilterOptions(scopedProjects);
        return { projects: scopedProjects, rows: [] as RawRow[], options };
      }

      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      const [memberMonthsRes, timesheetsRes, activityTypesRes] = await Promise.all([
        supabase.from('project_member_months').select('project_member_id, month_number, hours').in('project_member_id', memberIds),
        supabase.from('project_timesheets').select('project_member_id, work_date, hours').in('project_member_id', memberIds).gte('work_date', startDate).lte('work_date', endDate),
        supabase.from('activity_types').select('id, name, applies_to_all, activity_type_employees(employee_id)').eq('tenant_id', tenantId).eq('is_active', true).order('name'),
      ]);

      if (memberMonthsRes.error) throw memberMonthsRes.error;
      if (timesheetsRes.error) throw timesheetsRes.error;
      if (activityTypesRes.error) throw activityTypesRes.error;

      const activityTypes = (activityTypesRes.data ?? []) as QueryActivityType[];
      const activityTypeIds = activityTypes.map((a) => a.id);

      const [activityEmployeeMonthsRes, activityTimesheetsRes] = await Promise.all([
        activityTypeIds.length === 0 || employeeIds.length === 0
          ? Promise.resolve({ data: [] as ActivityEmployeeMonthRow[], error: null })
          : supabase.from('activity_employee_months').select('employee_id, activity_type_id, year, month, hours').eq('tenant_id', tenantId).in('employee_id', employeeIds).in('activity_type_id', activityTypeIds).eq('year', selectedYear),
        activityTypeIds.length === 0 || employeeIds.length === 0
          ? Promise.resolve({ data: [] as ActivityTimesheetYearRow[], error: null })
          : supabase.from('activity_timesheets').select('employee_id, activity_type_id, work_date, hours').in('employee_id', employeeIds).in('activity_type_id', activityTypeIds).gte('work_date', startDate).lte('work_date', endDate),
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
              employeeId: emp.id, employeeName: emp.nome, cargo: emp.cargo,
              jornadaDiaria: Number(emp.jornada_diaria) || 8, status: emp.status ?? 'ativo',
              terminationDate: emp.employee_terminations?.termination_date || undefined,
            },
            projectsById: {}, internalActivitiesById: {},
          });
        }
        return rowMap.get(emp.id)!;
      };

      const ensureProjectHours = (row: RawRow, project: ProjectScope, projectMemberId: string | null) => {
        if (!row.projectsById[project.id]) row.projectsById[project.id] = createEmptyProjectRow(project, projectMemberId);
        if (!row.projectsById[project.id].projectMemberId && projectMemberId) row.projectsById[project.id].projectMemberId = projectMemberId;
        return row.projectsById[project.id];
      };

      allMembers.forEach((m) => {
        if (!m.employeeId || !m.employee) return;
        const project = projectById.get(m.projectId);
        if (!project) return;
        ensureProjectHours(ensureRow(m.employee), project, m.memberId);
      });

      const activityTypeAllowedByEmployee = new Map<string, QueryActivityType[]>();
      employeeIds.forEach((eid) => {
        activityTypeAllowedByEmployee.set(eid, activityTypes.filter((a) => a.applies_to_all || (a.activity_type_employees || []).some((e) => e.employee_id === eid)));
      });

      rowMap.forEach((row, eid) => {
        (activityTypeAllowedByEmployee.get(eid) || []).forEach((a) => {
          if (!row.internalActivitiesById[a.id]) row.internalActivitiesById[a.id] = createEmptyInternalActivityRow(a.id, a.name);
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
        if (projectMonth.getFullYear() !== selectedYear) return;
        ensureProjectHours(row, project, entry.project_member_id).plannedByMonth[projectMonth.getMonth()] += Number(entry.hours) || 0;
      });

      timesheets.forEach((entry) => {
        const meta = memberMetaById.get(entry.project_member_id);
        if (!meta) return;
        const project = projectById.get(meta.projectId);
        if (!project) return;
        const row = rowMap.get(meta.employeeId);
        if (!row) return;
        const month = Number(entry.work_date.substring(5, 7));
        if (month < 1 || month > 12) return;
        ensureProjectHours(row, project, entry.project_member_id).actualByMonth[month - 1] += Number(entry.hours) || 0;
      });

      activityEmployeeMonths.forEach((entry) => {
        if (Number(entry.year) !== selectedYear) return;
        const row = rowMap.get(entry.employee_id);
        if (!row) return;
        const a = row.internalActivitiesById[entry.activity_type_id];
        if (!a) return;
        const m = Number(entry.month);
        if (m < 1 || m > 12) return;
        a.plannedByMonth[m - 1] += Number(entry.hours) || 0;
      });

      activityTimesheets.forEach((entry) => {
        const row = rowMap.get(entry.employee_id);
        if (!row) return;
        const a = row.internalActivitiesById[entry.activity_type_id];
        if (!a) return;
        const m = Number(entry.work_date.substring(5, 7));
        if (m < 1 || m > 12) return;
        a.actualByMonth[m - 1] += Number(entry.hours) || 0;
      });

      const options = buildFilterOptions(scopedProjects);
      return {
        projects: scopedProjects.sort((a, b) => a.name.localeCompare(b.name)),
        rows: Array.from(rowMap.values()).sort((a, b) => a.employee.employeeName.localeCompare(b.employee.employeeName)),
        options,
      };
    },
    enabled: !!tenantId,
  });

  function buildFilterOptions(scopedProjects: ProjectScope[]): PlannerFilterOptions {
    return {
      teams: Array.from(new Map(scopedProjects.map((p) => [p.teamKey, p.teamLabel])).entries())
        .map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
      managers: Array.from(new Map(scopedProjects.map((p) => [p.managerId, p.managerName])).entries())
        .map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
      projects: scopedProjects.map((p) => ({ value: p.id, label: p.name })).sort((a, b) => a.label.localeCompare(b.label)),
    };
  }

  useEffect(() => { if (data?.options) onFilterOptionsChange?.(data.options); }, [data?.options, onFilterOptionsChange]);

  const scopedProjects = useMemo(() => {
    return (data?.projects || []).filter((p) => {
      if (filters.teamId !== 'all' && p.teamKey !== filters.teamId) return false;
      if (filters.managerId !== 'all' && p.managerId !== filters.managerId) return false;
      return true;
    });
  }, [data?.projects, filters.teamId, filters.managerId]);

  const visibleProjects = useMemo(() => {
    if (filters.projectId === 'all') return scopedProjects;
    return scopedProjects.filter((p) => p.id === filters.projectId);
  }, [scopedProjects, filters.projectId]);

  const rowsWithStatus = useMemo(() => {
    const projectIds = visibleProjects.map((p) => p.id);
    let sourceRows = (data?.rows || []).filter((row) => !isExcludedForYear(row.employee, selectedYear));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      sourceRows = sourceRows.filter((row) =>
        row.employee.employeeName.toLowerCase().includes(q) || row.employee.cargo.toLowerCase().includes(q)
      );
    }

    const builtRows = sourceRows.map((raw): AllocationPlannerRow => {
      const monthTotals: MonthTotal[] = MONTH_COLUMNS.map(({ month }) => {
        const cap = calculateMonthlyCapacity(toMonthKey(selectedYear, month), raw.employee.jornadaDiaria, holidays);
        const planned = projectIds.reduce((s, pid) => s + (raw.projectsById[pid]?.plannedByMonth[month - 1] || 0), 0)
          + Object.values(raw.internalActivitiesById).reduce((s, a) => s + (a.plannedByMonth[month - 1] || 0), 0);
        const actual = projectIds.reduce((s, pid) => s + (raw.projectsById[pid]?.actualByMonth[month - 1] || 0), 0)
          + Object.values(raw.internalActivitiesById).reduce((s, a) => s + (a.actualByMonth[month - 1] || 0), 0);
        return { monthKey: toMonthKey(selectedYear, month), month, planned, actual, capacityHours: cap };
      });

      const totalPlanned = monthTotals.reduce((s, m) => s + m.planned, 0);
      const totalActual = monthTotals.reduce((s, m) => s + m.actual, 0);
      const capacityAnnual = monthTotals.reduce((s, m) => s + m.capacityHours, 0);

      return {
        employeeId: raw.employee.employeeId, employeeName: raw.employee.employeeName, cargo: raw.employee.cargo,
        capacityHours: capacityAnnual, totalPlanned, totalActual,
        statusPlanned: getAllocationStatus(totalPlanned, capacityAnnual),
        statusActual: getAllocationStatus(totalActual, capacityAnnual),
        monthTotals,
        plannedUtilizationByMonth: monthTotals.map((m) => (m.capacityHours > 0 ? m.planned / m.capacityHours : 0)),
        projectsById: raw.projectsById, internalActivitiesById: raw.internalActivitiesById, employee: raw.employee,
      };
    });

    const visibleRows = filters.onlyConflicts
      ? builtRows.filter((r) => r.statusPlanned !== 'Adequado' || r.statusActual !== 'Adequado')
      : builtRows;

    return visibleRows.sort((a, b) => {
      const sa = Math.min(STATUS_ORDER[a.statusPlanned], STATUS_ORDER[a.statusActual]);
      const sb = Math.min(STATUS_ORDER[b.statusPlanned], STATUS_ORDER[b.statusActual]);
      if (sa !== sb) return sa - sb;
      return a.employeeName.localeCompare(b.employeeName);
    });
  }, [data?.rows, visibleProjects, selectedYear, holidays, searchQuery, filters.onlyConflicts]);

  const counts = useMemo<StatusDualCounts>(() => {
    const result: StatusDualCounts = { planned: emptyStatusCounts(), actual: emptyStatusCounts() };
    rowsWithStatus.forEach((r) => { result.planned[r.statusPlanned]++; result.actual[r.statusActual]++; });
    return result;
  }, [rowsWithStatus]);

  useEffect(() => { onStatusCountsChange?.(counts); }, [counts, onStatusCountsChange]);
  useEffect(() => { onKPIDataChange?.({ counts, total: rowsWithStatus.length }); }, [counts, rowsWithStatus.length, onKPIDataChange]);

  /* ─── Expanded row state ─── */

  const expandedRow = useMemo(() => {
    if (!expandedEmployeeId) return null;
    return rowsWithStatus.find((r) => r.employeeId === expandedEmployeeId) || null;
  }, [rowsWithStatus, expandedEmployeeId]);

  const closeExpanded = useCallback(() => {
    setExpandedEmployeeId(null);
    setDraftPlanned({});
    setOriginalPlanned({});
    setEditingCellKey(null);
    setEditingCellInitialValue(0);
  }, []);

  useEffect(() => { if (expandedEmployeeId && !expandedRow) closeExpanded(); }, [expandedEmployeeId, expandedRow, closeExpanded]);
  useEffect(() => { closeExpanded(); }, [selectedYear, filters.teamId, filters.managerId, filters.projectId, closeExpanded]);

  const initializeDraftForRow = (row: AllocationPlannerRow) => {
    const nextPlanned: Record<string, number> = {};
    const projectsForExpanded = visibleProjects.filter((p) => {
      const ph = row.projectsById[p.id];
      if (!ph) return false;
      return Boolean(ph.projectMemberId) || ph.plannedByMonth.some((v) => v > 0) || ph.actualByMonth.some((v) => v > 0);
    });

    projectsForExpanded.forEach((p) => {
      const ph = row.projectsById[p.id] || createEmptyProjectRow(p, null);
      MONTH_COLUMNS.forEach(({ month }) => {
        nextPlanned[draftProjectKey(p.id, month)] = ph.plannedByMonth[month - 1] || 0;
      });
    });

    Object.values(row.internalActivitiesById).sort((a, b) => a.activityName.localeCompare(b.activityName)).forEach((a) => {
      MONTH_COLUMNS.forEach(({ month }) => {
        nextPlanned[draftActivityKey(a.activityTypeId, month)] = a.plannedByMonth[month - 1] || 0;
      });
    });

    setDraftPlanned(nextPlanned);
    setOriginalPlanned(nextPlanned);
  };

  const toggleExpand = (row: AllocationPlannerRow) => {
    if (expandedEmployeeId === row.employeeId) { closeExpanded(); return; }
    setExpandedEmployeeId(row.employeeId);
    initializeDraftForRow(row);
  };

  const updateDraftCell = (key: string, nextValue: number) => {
    const safeValue = Math.max(0, Number.isFinite(nextValue) ? nextValue : 0);
    setDraftPlanned((prev) => ({ ...prev, [key]: safeValue }));
  };

  const expandedProjects = useMemo(() => {
    if (!expandedRow) return [];
    return visibleProjects.filter((p) => {
      const ph = expandedRow.projectsById[p.id];
      if (!ph) return false;
      return Boolean(ph.projectMemberId) || ph.plannedByMonth.some((v) => v > 0) || ph.actualByMonth.some((v) => v > 0);
    });
  }, [expandedRow, visibleProjects]);

  const expandedInternalActivities = useMemo(() => {
    if (!expandedRow) return [];
    return Object.values(expandedRow.internalActivitiesById).sort((a, b) => a.activityName.localeCompare(b.activityName));
  }, [expandedRow]);

  const expandedItems = useMemo<ExpandedAllocationItemRow[]>(() => {
    if (!expandedRow) return [];
    const projectItems: ExpandedAllocationItemRow[] = expandedProjects.map((p) => {
      const ph = expandedRow.projectsById[p.id] || createEmptyProjectRow(p, null);
      return {
        id: p.id, type: 'project', title: p.name,
        subtitle: `${p.managerName} · ${p.teamLabel}`,
        plannedByMonth: ph.plannedByMonth, actualByMonth: ph.actualByMonth,
        editableByMonth: MONTH_COLUMNS.map(({ month }) => isProjectMonthEditable(p, selectedYear, month)),
      };
    });
    const internalItems: ExpandedAllocationItemRow[] = expandedInternalActivities.map((a) => ({
      id: a.activityTypeId, type: 'internal_activity', title: a.activityName,
      subtitle: 'Atividade interna',
      plannedByMonth: a.plannedByMonth, actualByMonth: a.actualByMonth,
      editableByMonth: MONTH_COLUMNS.map(() => true),
    }));
    return [...projectItems, ...internalItems];
  }, [expandedInternalActivities, expandedProjects, expandedRow, selectedYear]);

  /* ─── Pending changes ─── */
  const pendingChanges = useMemo<ChangeEntry[]>(() => {
    if (!expandedRow) return [];
    const changes: ChangeEntry[] = [];

    expandedProjects.forEach((p) => {
      MONTH_COLUMNS.forEach(({ month, label }) => {
        if (!isProjectMonthEditable(p, selectedYear, month)) return;
        const key = draftProjectKey(p.id, month);
        const current = draftPlanned[key] ?? 0;
        const original = originalPlanned[key] ?? 0;
        if (Math.round(current * 10) !== Math.round(original * 10)) {
          changes.push({ itemTitle: p.name, monthLabel: label, from: original, to: current });
        }
      });
    });

    expandedInternalActivities.forEach((a) => {
      MONTH_COLUMNS.forEach(({ month, label }) => {
        const key = draftActivityKey(a.activityTypeId, month);
        const current = draftPlanned[key] ?? 0;
        const original = originalPlanned[key] ?? 0;
        if (Math.round(current * 10) !== Math.round(original * 10)) {
          changes.push({ itemTitle: a.activityName, monthLabel: label, from: original, to: current });
        }
      });
    });

    return changes;
  }, [expandedRow, expandedProjects, expandedInternalActivities, selectedYear, draftPlanned, originalPlanned]);

  const pendingChangesCount = pendingChanges.length;

  const handleCancelEdits = () => {
    setDraftPlanned(originalPlanned);
    setEditingCellKey(null);
  };

  const handleRequestSave = () => {
    if (pendingChangesCount === 0) return;
    setSaveDialogOpen(true);
  };

  const handleConfirmSave = async (reasonCode: string, justification: string) => {
    if (!expandedRow) return;

    setIsSaving(true);
    try {
      // Planned mode only
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
                .insert({ project_id: project.id, employee_id: expandedRow.employeeId, role: expandedRow.cargo || 'Colaborador', seniority: 'pleno', hours_per_month: plannedHours, hourly_rate: 0 })
                .select('id').single();
              if (createError) throw createError;
              projectMemberId = createdMember.id;
            }

            await upsertMemberMonth.mutateAsync({ projectMemberId, monthNumber, hours: plannedHours });
            persisted++;
          }
        }

        for (const activity of expandedInternalActivities) {
          for (const { month } of MONTH_COLUMNS) {
            const key = draftActivityKey(activity.activityTypeId, month);
            const original = activity.plannedByMonth[month - 1] || 0;
            const draft = draftPlanned[key] ?? original;
            if (Math.round(draft * 10) === Math.round(original * 10)) continue;

            const { error } = await supabase
              .from('activity_employee_months')
              .upsert([{
                tenant_id: tenantId,
                employee_id: expandedRow.employeeId,
                activity_type_id: activity.activityTypeId,
                year: selectedYear, month, hours: Math.max(0, draft),
                updated_at: new Date().toISOString(),
              }], { onConflict: 'employee_id,activity_type_id,year,month' });
            if (error) throw error;
            persisted++;
          }
        }

        if (persisted > 0) {
          await queryClient.invalidateQueries({ queryKey: ['allocation-overview-planner'] });
          toast({ title: 'Alocação atualizada', description: `${persisted} célula(s) salva(s) para ${expandedRow.employeeName}.` });
        } else {
          toast({ title: 'Sem alterações', description: 'Não houve mudanças para salvar.' });
        }

        setSaveDialogOpen(false);
        closeExpanded();
    } catch (error: unknown) {
      toast({ title: 'Erro ao salvar', description: error instanceof Error ? error.message : 'Não foi possível salvar as alterações.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const beginInlineEdit = (key: string, currentValue: number) => {
    if (isSaving) return;
    setEditingCellKey(key);
    setEditingCellInitialValue(currentValue);
  };

  const endInlineEdit = () => { setEditingCellKey(null); };

  const cancelInlineEdit = (key: string, initialValue: number) => {
    updateDraftCell(key, initialValue);
    setEditingCellKey(null);
  };

  /** P1.3 — Tab navigation between editable cells */
  const handleTabNavigate = useCallback(
    (rowIndex: number, colIndex: number, direction: 1 | -1) => {
      if (!expandedItems.length) return;
      let nextCol = colIndex + direction;
      let nextRow = rowIndex;

      while (nextRow >= 0 && nextRow < expandedItems.length) {
        while (nextCol >= 0 && nextCol < 12) {
          const item = expandedItems[nextRow];
          if (item.editableByMonth[nextCol]) {
            const key = item.type === 'project' ? draftProjectKey(item.id, nextCol + 1) : draftActivityKey(item.id, nextCol + 1);
            const val = draftPlanned[key] ?? item.plannedByMonth[nextCol] ?? 0;
            const val = draftMap[key] ?? fallback ?? 0;
            beginInlineEdit(key, val);
            return;
          }
          nextCol += direction;
        }
        nextRow += direction;
        nextCol = direction === 1 ? 0 : 11;
      }
    },
    [expandedItems, draftPlanned]
  );

  const totalColumns = 2 + MONTH_COLUMNS.length;

  /* ─── Render ─── */

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Planejador Anual de Alocação</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Expanda um funcionário para editar itens de alocação por mês no ano selecionado.
                </p>
              </div>
              {/* P2.4 — Scope badge */}
              <Badge variant="outline" className="flex items-center gap-1.5 shrink-0">
                {isAdmin ? <Building2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                {isAdmin ? 'Visão da empresa' : 'Meus projetos'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* P0.1 — Heatmap legend */}
            <AllocationHeatmapLegend />

            {visibleProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum projeto encontrado para os filtros selecionados.
              </p>
            ) : rowsWithStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum colaborador corresponde aos filtros selecionados.
              </p>
            ) : (
              <div className="overflow-auto border rounded-lg relative">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {/* P0.3 — Sticky left columns */}
                      <TableHead className="min-w-[240px] sticky left-0 z-20 bg-background shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">Pessoa</TableHead>
                      <TableHead className="min-w-[170px] sticky left-[240px] z-20 bg-background shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]">Cargo</TableHead>
                      {MONTH_COLUMNS.map((mc, idx) => (
                        <TableHead
                          key={mc.month}
                          className={cn(
                            'text-center min-w-[120px]',
                            idx === currentMonthIndex && 'border-b-2 border-primary bg-primary/5'
                          )}
                        >
                          <div>{mc.label}</div>
                          <div className="text-[10px] font-normal text-muted-foreground">Plan | Real</div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rowsWithStatus.map((row) => {
                      const isExpanded = expandedEmployeeId === row.employeeId;

                      return (
                        <Fragment key={row.employeeId}>
                          <TableRow className="cursor-pointer hover:bg-muted/40" onClick={() => toggleExpand(row)}>
                            {/* P0.3 — Sticky */}
                            <TableCell className="sticky left-0 z-10 bg-background shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                              <div className="flex items-center gap-2">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <span className="font-medium">{row.employeeName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground sticky left-[240px] z-10 bg-background shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                              {row.cargo}
                            </TableCell>

                            {row.monthTotals.map((mt, monthIndex) => {
                              const heatmap = getMonthlyHeatmapMeta(mt.planned, mt.actual, mt.capacityHours, mt.month, selectedYear);
                              const isCurrentMo = monthIndex === currentMonthIndex;

                              return (
                                <TableCell key={mt.monthKey} className={cn('py-2 text-center', isCurrentMo && 'bg-primary/5')}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex justify-center">
                                        <span className={cn('inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium', heatmap.className)}>
                                          <span>{mt.planned > 0 ? fmt(mt.planned) : '—'}</span>
                                          <span className="opacity-70">|</span>
                                          <span className="opacity-80">{mt.actual > 0 ? fmt(mt.actual) : '—'}</span>
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    {/* P2.2 — Rich tooltip */}
                                    <TooltipContent side="top" className="text-xs space-y-0.5">
                                      <p className="font-semibold">{MONTH_COLUMNS[monthIndex].label} {selectedYear}</p>
                                      <p>Planejado: {fmt(mt.planned)}</p>
                                      <p>Realizado: {fmt(mt.actual)}</p>
                                      <p>Capacidade: {fmt(mt.capacityHours)}</p>
                                      <p>Utilização: {mt.capacityHours > 0 ? `${Math.round((heatmap.referenceHours / mt.capacityHours) * 100)}%` : '—'} ({heatmap.referenceType === 'planned' ? 'Plan' : 'Real'})</p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <div className="mt-1 text-center text-[10px] text-muted-foreground">
                                    Cap: {fmt(mt.capacityHours)}
                                  </div>
                                </TableCell>
                              );
                            })}

                          </TableRow>

                          {/* ─── Expanded Panel ─── */}
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
                                      <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-foreground">Itens de alocação</p>
                                        {canEditActual && (
                                          <ToggleGroup
                                            type="single"
                                            value={editMode}
                                            onValueChange={(v) => { if (v) { setEditMode(v as 'planned' | 'actual'); setEditingCellKey(null); } }}
                                            size="sm"
                                            className="bg-muted rounded-md p-0.5"
                                          >
                                            <ToggleGroupItem value="planned" className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded">
                                              Planejado
                                            </ToggleGroupItem>
                                            <ToggleGroupItem value="actual" className="text-xs px-3 data-[state=on]:bg-background data-[state=on]:shadow-sm rounded">
                                              Real
                                            </ToggleGroupItem>
                                          </ToggleGroup>
                                        )}
                                      </div>
                                      <div className="overflow-auto border rounded-md bg-background">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="min-w-[300px]">Item</TableHead>
                                              {MONTH_COLUMNS.map((mc, monthIndex) => (
                                                <TableHead
                                                  key={`exp-${mc.month}`}
                                                  className={cn(
                                                    'min-w-[120px] text-center',
                                                    monthIndex === currentMonthIndex && 'bg-primary/5'
                                                  )}
                                                >
                                                  <div>{mc.label}</div>
                                                  <div className="text-[10px] font-normal text-muted-foreground">
                                                    Cap: {expandedRow.monthTotals[monthIndex] ? fmt(expandedRow.monthTotals[monthIndex].capacityHours) : '—'}
                                                  </div>
                                                </TableHead>
                                              ))}
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {expandedItems.map((item, rowIdx) => (
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
                                                  const key = item.type === 'project' ? draftProjectKey(item.id, month) : draftActivityKey(item.id, month);
                                                  const isActualMode = editMode === 'actual';
                                                  const plannedVal = item.plannedByMonth[monthIndex] || 0;
                                                  const actualVal = item.actualByMonth[monthIndex] || 0;

                                                  const draft = isActualMode
                                                    ? (draftActual[key] ?? actualVal)
                                                    : (draftPlanned[key] ?? plannedVal);
                                                  const origVal = isActualMode
                                                    ? (originalActual[key] ?? actualVal)
                                                    : (originalPlanned[key] ?? plannedVal);
                                                  const displayActual = isActualMode ? plannedVal : actualVal;

                                                  return (
                                                    <TableCell key={`${item.type}-${item.id}-${month}`} className={cn('py-2 align-middle text-center', monthIndex === currentMonthIndex && 'bg-primary/5')}>
                                                      <AllocationEditableCell
                                                        cellKey={key}
                                                        draft={draft}
                                                        actual={displayActual}
                                                        original={origVal}
                                                        editable={isActualMode ? canEditActual : item.editableByMonth[monthIndex]}
                                                        isEditing={editingCellKey === key}
                                                        isSaving={isSaving}
                                                        isCurrentMonth={monthIndex === currentMonthIndex}
                                                        onBeginEdit={beginInlineEdit}
                                                        onEndEdit={endInlineEdit}
                                                        onCancelEdit={cancelInlineEdit}
                                                        onUpdateDraft={updateDraftCell}
                                                        initialValue={editingCellInitialValue}
                                                        colIndex={monthIndex}
                                                        rowIndex={rowIdx}
                                                        onTabNavigate={handleTabNavigate}
                                                        mode={editMode}
                                                      />
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

                                  {/* P1.4 — Sticky footer with change summary */}
                                  <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-3 -mx-4 px-4 -mb-4 pb-4">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                                      <div className="text-sm text-muted-foreground">
                                        {pendingChangesCount > 0 ? (
                                          <span className="font-medium text-foreground">
                                            {pendingChangesCount} alteração(ões) pendente(s) ·{' '}
                                            {(() => {
                                              const delta = pendingChanges.reduce((s, c) => s + (c.to - c.from), 0);
                                              return `${delta >= 0 ? '+' : ''}${fmt(delta)} ${editMode === 'actual' ? 'reais' : 'planejadas'}`;
                                            })()}
                                          </span>
                                        ) : (
                                          'Nenhuma alteração pendente'
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button variant="ghost" onClick={handleCancelEdits} disabled={isSaving || pendingChangesCount === 0}>
                                          Cancelar alterações
                                        </Button>
                                        <Button onClick={handleRequestSave} disabled={isSaving || pendingChangesCount === 0 || upsertMemberMonth.isPending}>
                                          {isSaving || upsertMemberMonth.isPending ? 'Salvando...' : `Salvar alterações (${pendingChangesCount})`}
                                        </Button>
                                      </div>
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

        {/* P2.3 — Save confirmation dialog with audit */}
        {expandedRow && (
          <AllocationSaveDialog
            open={saveDialogOpen}
            onOpenChange={setSaveDialogOpen}
            changes={pendingChanges}
            employeeName={expandedRow.employeeName}
            isSaving={isSaving}
            onConfirm={handleConfirmSave}
            mode={editMode}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
