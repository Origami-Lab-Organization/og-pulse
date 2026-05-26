import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Building2, User, Wrench } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  differenceInCalendarMonths,
  eachDayOfInterval,
  endOfMonth,
  max as dateMax,
  min as dateMin,
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
import {
  AllocationDetailRpcRow,
  useAllocationEmployeeDetail,
  useAllocationEmployeeMonthSummary,
  useAllocationProjectOptions,
} from '@/hooks/useAllocationPlannerData';
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
  hireDate?: string;
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
  hideTerminated: boolean;
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
  projectEndDate?: string;
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
  endDate?: string;
  durationMonths: number;
  isContinuous: boolean;
  managerId: string;
  managerName: string;
  teamKey: string;
  teamLabel: string;
  portfolioStage: string | null;
}

interface RawRow {
  employee: EmployeeAllocation;
}

interface DetailAllocationData {
  projectsById: Record<string, ExpandedProjectRow>;
  projectScopesById: Record<string, ProjectScope>;
  internalActivitiesById: Record<string, ExpandedInternalActivityRow>;
}

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

function calculateEmployeeMonthlyCapacity(
  monthKey: string,
  jornadaDiaria: number,
  holidays: Holiday[],
  hireDate?: string,
  terminationDate?: string,
): number {
  const monthStart = parseISO(`${monthKey}-01`);
  const monthEnd = endOfMonth(monthStart);
  const effectiveStart = hireDate ? dateMax([monthStart, parseLocalDate(hireDate)]) : monthStart;
  const effectiveEnd = terminationDate ? dateMin([monthEnd, parseLocalDate(terminationDate)]) : monthEnd;
  if (effectiveStart > effectiveEnd) return 0;
  return countWorkingDays(effectiveStart, effectiveEnd, holidays) * jornadaDiaria;
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
  if (!project.isContinuous) {
    const effectiveDuration = project.endDate
      ? differenceInCalendarMonths(startOfMonth(parseLocalDate(project.endDate)), startOfMonth(parseLocalDate(project.startDate))) + 1
      : project.durationMonths;
    if (monthNumber > effectiveDuration) return false;
  }
  return true;
}

function createEmptyProjectRow(project: ProjectScope, projectMemberId: string | null): ExpandedProjectRow {
  return {
    projectId: project.id, projectName: project.name, projectMemberId,
    plannedByMonth: Array(12).fill(0), actualByMonth: Array(12).fill(0),
    projectStartDate: project.startDate, projectEndDate: project.endDate,
    durationMonths: project.durationMonths, isContinuous: project.isContinuous,
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
  ytdMonth?: number;
  onStatusCountsChange?: (counts: StatusDualCounts) => void;
  onFilterOptionsChange?: (options: PlannerFilterOptions) => void;
  onKPIDataChange?: (data: { counts: StatusDualCounts; total: number; capacityAnnual: number; capacityCurrentMonth: number; capacityYtd: number }) => void;
}

/* ─── Component ─── */

export function AllocationOverview({
  searchQuery = '',
  selectedYear,
  filters,
  ytdMonth,
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

  const { data: projectOptions = [], isLoading: isLoadingOptions } = useAllocationProjectOptions(tenantId, isAdmin, currentEmployeeId);
  const { data: summaryRows = [], isLoading: isLoadingSummary } = useAllocationEmployeeMonthSummary({
    tenantId,
    selectedYear,
    isAdmin,
    currentEmployeeId,
    managerId: filters.managerId,
    projectId: filters.projectId,
    teamId: filters.teamId,
  });
  const { data: detailRows = [], isLoading: isLoadingDetail } = useAllocationEmployeeDetail({
    tenantId,
    selectedYear,
    employeeId: expandedEmployeeId,
    isAdmin,
    currentEmployeeId,
    managerId: filters.managerId,
    projectId: filters.projectId,
    teamId: filters.teamId,
  });
  const isLoading = isLoadingOptions || isLoadingSummary;

  function buildFilterOptions(scopedProjects: ProjectScope[]): PlannerFilterOptions {
    return {
      teams: Array.from(new Map(scopedProjects.map((p) => [p.teamKey, p.teamLabel])).entries())
        .map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
      managers: Array.from(new Map(scopedProjects.map((p) => [p.managerId, p.managerName])).entries())
        .map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
      projects: scopedProjects.map((p) => ({ value: p.id, label: p.name })).sort((a, b) => a.label.localeCompare(b.label)),
    };
  }

  const scopedProjects = useMemo(() => {
    return projectOptions.map((project): ProjectScope => ({
      id: project.id,
      name: project.name,
      startDate: '',
      durationMonths: 1,
      isContinuous: false,
      managerId: project.managerId,
      managerName: project.managerName,
      teamKey: project.teamKey,
      teamLabel: project.teamLabel,
      portfolioStage: project.portfolioStage,
    })).filter((p) => {
      if (filters.teamId !== 'all' && p.teamKey !== filters.teamId) return false;
      if (filters.managerId !== 'all' && p.managerId !== filters.managerId) return false;
      return true;
    });
  }, [projectOptions, filters.teamId, filters.managerId]);

  const filterOptions = useMemo(() => buildFilterOptions(scopedProjects), [scopedProjects]);
  useEffect(() => { onFilterOptionsChange?.(filterOptions); }, [filterOptions, onFilterOptionsChange]);

  const visibleProjects = useMemo(() => {
    if (filters.projectId === 'all') return scopedProjects;
    return scopedProjects.filter((p) => p.id === filters.projectId);
  }, [scopedProjects, filters.projectId]);

  const rowsWithStatus = useMemo(() => {
    const rowMap = new Map<string, RawRow>();

    summaryRows.forEach((summary) => {
      if (!rowMap.has(summary.employee_id)) {
        rowMap.set(summary.employee_id, {
          employee: {
            employeeId: summary.employee_id,
            employeeName: summary.employee_name,
            cargo: summary.cargo,
            jornadaDiaria: Number(summary.jornada_diaria) || 8,
            status: summary.status ?? 'ativo',
            hireDate: summary.hire_date || undefined,
            terminationDate: summary.termination_date || undefined,
          },
        });
      }
    });

    let sourceRows = Array.from(rowMap.values()).filter((row) => !isExcludedForYear(row.employee, selectedYear));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      sourceRows = sourceRows.filter((row) =>
        row.employee.employeeName.toLowerCase().includes(q) || row.employee.cargo.toLowerCase().includes(q)
      );
    }

    const builtRows = sourceRows.map((raw): AllocationPlannerRow => {
      const monthTotals: MonthTotal[] = MONTH_COLUMNS.map(({ month }) => {
        const summary = summaryRows.find((row) => row.employee_id === raw.employee.employeeId && Number(row.month) === month);
        const fallbackCapacity = calculateEmployeeMonthlyCapacity(
          toMonthKey(selectedYear, month),
          raw.employee.jornadaDiaria,
          holidays,
          raw.employee.hireDate,
          raw.employee.terminationDate,
        );
        const cap = summary?.capacity_hours != null ? Number(summary.capacity_hours) : fallbackCapacity;
        const planned = Number(summary?.planned_hours) || 0;
        const actual = Number(summary?.actual_hours) || 0;
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
        projectsById: {}, internalActivitiesById: {}, employee: raw.employee,
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
  }, [summaryRows, selectedYear, holidays, searchQuery, filters.onlyConflicts]);

  const counts = useMemo<StatusDualCounts>(() => {
    const result: StatusDualCounts = { planned: emptyStatusCounts(), actual: emptyStatusCounts() };
    rowsWithStatus.forEach((r) => { result.planned[r.statusPlanned]++; result.actual[r.statusActual]++; });
    return result;
  }, [rowsWithStatus]);

  const capacityTotals = useMemo(() => {
    const annual = rowsWithStatus.reduce((s, r) => s + r.capacityHours, 0);
    const month = currentMonthIndex >= 0
      ? rowsWithStatus.reduce((s, r) => s + (r.monthTotals[currentMonthIndex]?.capacityHours || 0), 0)
      : 0;
    const ytd = ytdMonth && ytdMonth > 0
      ? rowsWithStatus.reduce((s, r) => {
          let sum = 0;
          for (let i = 0; i < ytdMonth; i++) sum += r.monthTotals[i]?.capacityHours || 0;
          return s + sum;
        }, 0)
      : 0;
    return { annual, month, ytd };
  }, [rowsWithStatus, currentMonthIndex, ytdMonth]);

  useEffect(() => { onStatusCountsChange?.(counts); }, [counts, onStatusCountsChange]);
  useEffect(() => {
    onKPIDataChange?.({
      counts,
      total: rowsWithStatus.length,
      capacityAnnual: capacityTotals.annual,
      capacityCurrentMonth: capacityTotals.month,
      capacityYtd: capacityTotals.ytd,
    });
  }, [counts, rowsWithStatus.length, capacityTotals, onKPIDataChange]);

  const tableRows = useMemo(() => {
    if (!filters.hideTerminated) return rowsWithStatus;
    return rowsWithStatus.filter((r) => !r.employee.terminationDate);
  }, [rowsWithStatus, filters.hideTerminated]);

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

  const detailData = useMemo<DetailAllocationData>(() => {
    const projectsById: Record<string, ExpandedProjectRow> = {};
    const projectScopesById: Record<string, ProjectScope> = {};
    const internalActivitiesById: Record<string, ExpandedInternalActivityRow> = {};

    detailRows.forEach((row: AllocationDetailRpcRow) => {
      const monthIndex = Number(row.month) - 1;
      if (monthIndex < 0 || monthIndex > 11) return;

      if (row.item_type === 'project') {
        const projectId = row.project_id || row.item_id;
        if (!projectId) return;

        const projectScope: ProjectScope = projectScopesById[projectId] ?? {
          id: projectId,
          name: row.title,
          startDate: row.project_start_date || `${selectedYear}-01-01`,
          endDate: row.project_end_date || undefined,
          durationMonths: Number(row.duration_months) || 1,
          isContinuous: Boolean(row.is_continuous),
          managerId: row.manager_id || '',
          managerName: row.manager_name || 'Sem gerente',
          teamKey: row.team_key || '__sem_time__',
          teamLabel: row.team_label || 'Sem linha de serviço',
          portfolioStage: null,
        };
        projectScopesById[projectId] = projectScope;

        if (!projectsById[projectId]) {
          projectsById[projectId] = createEmptyProjectRow(projectScope, row.project_member_id);
        }
        if (!projectsById[projectId].projectMemberId && row.project_member_id) {
          projectsById[projectId].projectMemberId = row.project_member_id;
        }
        projectsById[projectId].plannedByMonth[monthIndex] += Number(row.planned_hours) || 0;
        projectsById[projectId].actualByMonth[monthIndex] += Number(row.actual_hours) || 0;
        return;
      }

      const activityTypeId = row.item_id;
      if (!internalActivitiesById[activityTypeId]) {
        internalActivitiesById[activityTypeId] = createEmptyInternalActivityRow(activityTypeId, row.title);
      }
      internalActivitiesById[activityTypeId].plannedByMonth[monthIndex] += Number(row.planned_hours) || 0;
      internalActivitiesById[activityTypeId].actualByMonth[monthIndex] += Number(row.actual_hours) || 0;
    });

    return { projectsById, projectScopesById, internalActivitiesById };
  }, [detailRows, selectedYear]);

  const initializeDraftFromDetail = useCallback((data: DetailAllocationData) => {
    const nextPlanned: Record<string, number> = {};
    const projectsForExpanded = Object.values(data.projectScopesById).sort((a, b) => a.name.localeCompare(b.name));

    projectsForExpanded.forEach((p) => {
      const ph = data.projectsById[p.id] || createEmptyProjectRow(p, null);
      MONTH_COLUMNS.forEach(({ month }) => {
        nextPlanned[draftProjectKey(p.id, month)] = ph.plannedByMonth[month - 1] || 0;
      });
    });

    Object.values(data.internalActivitiesById).sort((a, b) => a.activityName.localeCompare(b.activityName)).forEach((a) => {
      MONTH_COLUMNS.forEach(({ month }) => {
        nextPlanned[draftActivityKey(a.activityTypeId, month)] = a.plannedByMonth[month - 1] || 0;
      });
    });

    setDraftPlanned(nextPlanned);
    setOriginalPlanned(nextPlanned);
  }, []);

  useEffect(() => {
    if (!expandedRow || isLoadingDetail) return;
    initializeDraftFromDetail(detailData);
  }, [expandedRow, detailData, initializeDraftFromDetail, isLoadingDetail]);

  const toggleExpand = (row: AllocationPlannerRow) => {
    if (expandedEmployeeId === row.employeeId) { closeExpanded(); return; }
    setExpandedEmployeeId(row.employeeId);
    setDraftPlanned({});
    setOriginalPlanned({});
    setEditingCellKey(null);
    setEditingCellInitialValue(0);
  };

  const updateDraftCell = (key: string, nextValue: number) => {
    const safeValue = Math.max(0, Number.isFinite(nextValue) ? nextValue : 0);
    setDraftPlanned((prev) => ({ ...prev, [key]: safeValue }));
  };

  const expandedProjects = useMemo(() => {
    if (!expandedRow) return [];
    return Object.values(detailData.projectScopesById)
      .filter((project) => {
        const rowProject = detailData.projectsById[project.id];
        return Boolean(rowProject?.projectMemberId) || Boolean(rowProject?.plannedByMonth.some((v) => v > 0)) || Boolean(rowProject?.actualByMonth.some((v) => v > 0));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [detailData, expandedRow]);

  const expandedInternalActivities = useMemo(() => {
    if (!expandedRow) return [];
    return Object.values(detailData.internalActivitiesById).sort((a, b) => a.activityName.localeCompare(b.activityName));
  }, [detailData, expandedRow]);

  const expandedItems = useMemo<ExpandedAllocationItemRow[]>(() => {
    if (!expandedRow) return [];
    const projectItems: ExpandedAllocationItemRow[] = expandedProjects.map((p) => {
      const ph = detailData.projectsById[p.id] || createEmptyProjectRow(p, null);
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
  }, [detailData, expandedInternalActivities, expandedProjects, expandedRow, selectedYear]);

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
          const rowProject = detailData.projectsById[project.id];
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
          await queryClient.invalidateQueries({ queryKey: ['allocation-employee-month-summary'] });
          await queryClient.invalidateQueries({ queryKey: ['allocation-employee-detail'] });
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
            ) : tableRows.length === 0 ? (
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
                    {tableRows.map((row) => {
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
                                  {isLoadingDetail ? (
                                    <div className="space-y-3">
                                      <Skeleton className="h-6 w-44" />
                                      <Skeleton className="h-24 w-full" />
                                    </div>
                                  ) : expandedItems.length === 0 ? (
                                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                                      Nenhum item de alocação disponível para este funcionário com os filtros atuais.
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-foreground">Itens de alocação</p>
                                        {canEditActual && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-xs gap-1.5"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setCorrectionEmployeeId(expandedRow.employeeId);
                                              setCorrectionEmployeeName(expandedRow.employeeName);
                                              setCorrectionDialogOpen(true);
                                            }}
                                          >
                                            <Wrench className="h-3.5 w-3.5" />
                                            Corrigir lançamentos
                                          </Button>
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
                                                  const plannedVal = item.plannedByMonth[monthIndex] || 0;
                                                  const actualVal = item.actualByMonth[monthIndex] || 0;

                                                  const draft = draftPlanned[key] ?? plannedVal;
                                                  const origVal = originalPlanned[key] ?? plannedVal;

                                                  return (
                                                    <TableCell key={`${item.type}-${item.id}-${month}`} className={cn('py-2 align-middle text-center', monthIndex === currentMonthIndex && 'bg-primary/5')}>
                                                      <AllocationEditableCell
                                                        cellKey={key}
                                                        draft={draft}
                                                        actual={actualVal}
                                                        original={origVal}
                                                        editable={item.editableByMonth[monthIndex]}
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
                                              return `${delta >= 0 ? '+' : ''}${fmt(delta)} planejadas`;
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
          />
        )}

        {/* Correction dialog */}
        {correctionEmployeeId && tenantId && (
          <AllocationCorrectionDialog
            open={correctionDialogOpen}
            onOpenChange={(open) => {
              setCorrectionDialogOpen(open);
              if (!open) {
                queryClient.invalidateQueries({ queryKey: ['allocation-employee-month-summary'] });
                queryClient.invalidateQueries({ queryKey: ['allocation-employee-detail'] });
              }
            }}
            employeeId={correctionEmployeeId}
            employeeName={correctionEmployeeName}
            tenantId={tenantId}
          />
        )}
      </div>
    </TooltipProvider>
  );
}
