import { useEffect, useMemo, useState } from 'react';
import * as amplitude from '@amplitude/analytics-browser';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock, HelpCircle, Lock, PlusCircle, Wrench, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  formatSignedHours,
  getAllocationStatus,
  getAllocationStatusClasses,
  getAllocationStatusLabel,
  getExpectedHoursToDate,
  snapWidthClass,
} from '@/lib/allocationGrid';
import { useEmployeeAvailability } from '@/hooks/useEmployeeAvailability';
import {
  PlannedHoursChange,
  useAllocateEmployeeToProject,
  useDeallocateEmployeeFromProject,
  useEmployeeAllocationPanel,
  useSaveEmployeeAllocationPanel,
} from '@/hooks/useEmployeeAllocationPanel';
import { AllocationMonth, AllocationPanelProjectRow, AllocationPerson, AllocationProjectOption } from '@/types/allocation';
import { useAuth } from '@/contexts/AuthContext';
import { SENIORITY_OPTIONS } from '@/types/project';
import { AllocationCorrectionDialog } from '@/components/timesheets/AllocationCorrectionDialog';

interface EmployeeAllocationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | undefined;
  employee: AllocationPerson | null;
  months: AllocationMonth[];
  monthKey: string;
  projectIdFilter: string;
  projectOptions: AllocationProjectOption[];
  roleOptions: string[];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function formatHours(value: number) {
  return `${Math.round(value)}h`;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function rowKey(row: AllocationPanelProjectRow) {
  return `${row.allocationId ?? row.projectId}:${row.monthKey}`;
}

const PANEL_ROW_GRID = 'grid grid-cols-[minmax(0,1fr)_84px_84px_28px] items-center gap-2';

function titleCaseStatus(label: string) {
  return label
    .toLocaleLowerCase('pt-BR')
    .replace(/(^|\s)\S/g, (match) => match.toLocaleUpperCase('pt-BR'));
}

function monthTitle(month: AllocationMonth | undefined) {
  if (!month) return 'Mês';
  return `${month.label} ${month.year}`;
}

function statusCopy(utilization: number | null) {
  if (utilization === null) return '—';
  if (utilization === 0) return '0% (Mínimo 40%)';
  return `${utilization}%`;
}

function PanelSkeleton() {
  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-72 w-full rounded-lg" />
      <Skeleton className="h-16 w-full rounded-lg" />
    </div>
  );
}

function EditableHoursPill({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="relative w-full">
      <Input
        type="number"
        min={0}
        step={1}
        value={Number.isFinite(value) ? value : 0}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className="h-8 rounded-full border-success/20 bg-success/10 pr-7 text-right font-mono text-xs font-semibold tabular-nums text-success disabled:bg-muted disabled:text-muted-foreground"
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">h</span>
    </div>
  );
}

function ReadOnlyHours({ value, muted = false }: { value: number | null; muted?: boolean }) {
  return (
    <span className={cn('font-mono text-xs font-semibold tabular-nums', muted ? 'text-muted-foreground' : 'text-foreground')}>
      {value === null ? '—' : formatHours(value)}
    </span>
  );
}

export function EmployeeAllocationPanel({
  open,
  onOpenChange,
  tenantId,
  employee,
  months,
  monthKey,
  projectIdFilter,
  projectOptions,
  roleOptions,
}: EmployeeAllocationPanelProps) {
  const { employee: currentUser } = useAuth();
  const [focusedMonthKey, setFocusedMonthKey] = useState(monthKey);
  const [draftHours, setDraftHours] = useState<Record<string, number>>({});
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [addForm, setAddForm] = useState({ projectId: '', role: '', hoursPerMonth: 40 });
  const [rowToRemove, setRowToRemove] = useState<AllocationPanelProjectRow | null>(null);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const canCorrectActuals = Boolean(currentUser?.isAdmin || currentUser?.is_gerente);

  const panelQuery = useEmployeeAllocationPanel({
    tenantId,
    employee,
    months,
    projectId: projectIdFilter,
    enabled: open,
  });
  const saveMutation = useSaveEmployeeAllocationPanel({ tenantId, employeeId: employee?.id });
  const allocateMutation = useAllocateEmployeeToProject({ tenantId, employeeId: employee?.id });
  const deallocateMutation = useDeallocateEmployeeFromProject({ tenantId, employeeId: employee?.id });

  const monthIndex = months.findIndex((month) => month.key === focusedMonthKey);
  const focusedMonth = months[monthIndex] ?? months[0];
  const availabilityQuery = useEmployeeAvailability({
    tenantId,
    employeeId: employee?.id,
    startDate: focusedMonth?.startDate,
    endDate: focusedMonth?.endDate,
    enabled: open,
  });
  const previousMonth = monthIndex > 0 ? months[monthIndex - 1] : undefined;
  const nextMonth = monthIndex >= 0 && monthIndex < months.length - 1 ? months[monthIndex + 1] : undefined;
  const panelData = panelQuery.data;
  const focusedMonthData = panelData?.months.find((monthData) => monthData.month.key === focusedMonth?.key);
  const previousMonthData = previousMonth ? panelData?.months.find((monthData) => monthData.month.key === previousMonth.key) : undefined;
  const nextMonthData = nextMonth ? panelData?.months.find((monthData) => monthData.month.key === nextMonth.key) : undefined;
  const isFocusedMonthLocked = Boolean(focusedMonth && focusedMonth.key < currentMonthKey());

  const rows = useMemo(() => {
    return (focusedMonthData?.projects ?? []).map((row) => ({
      ...row,
      plannedHours: draftHours[rowKey(row)] ?? row.plannedHours,
    }));
  }, [draftHours, focusedMonthData?.projects]);

  // ADR-0002: edição de projeto é por recurso — admin edita tudo; gerente só onde for o manager_id.
  // A RLS já bloqueia no banco; aqui apenas refletimos a regra na UI para não cair em erro silencioso.
  const canEditProject = useMemo(() => {
    const managerByProject = new Map(projectOptions.map((project) => [project.id, project.managerId]));
    return (projectId: string) =>
      Boolean(currentUser?.isAdmin) || (currentUser?.id != null && managerByProject.get(projectId) === currentUser.id);
  }, [projectOptions, currentUser?.id, currentUser?.isAdmin]);

  const managerNameByProject = useMemo(
    () => new Map(projectOptions.map((project) => [project.id, project.managerName])),
    [projectOptions],
  );

  const readOnlyMessage = (projectId: string) => {
    const managerName = managerNameByProject.get(projectId);
    return managerName
      ? `Você não é gerente deste projeto. Fale com ${managerName} sobre a alocação.`
      : 'Você não é gerente deste projeto. Fale com o gestor responsável sobre a alocação.';
  };
  const readOnlyRowMessage = (row: AllocationPanelProjectRow) => {
    if (!row.allocationId) {
      return 'Há lançamento realizado neste projeto, mas ainda não existe planejamento editável no modelo novo para este mês.';
    }
    return readOnlyMessage(row.projectId);
  };

  const internalHours = focusedMonthData?.internalHours ?? 0;
  const plannedTotal = rows.reduce((sum, row) => sum + row.plannedHours, 0);
  const actualTotal = rows.reduce((sum, row) => sum + row.actualHours, 0) + internalHours;
  const fallbackCapacityHours = focusedMonth && employee ? Number(employee.cells[focusedMonth.key]?.capacityHours || 0) : 0;
  const capacityHours = Number(availabilityQuery.data?.capacityHours ?? fallbackCapacityHours);
  const isPastMonth = Boolean(focusedMonth && focusedMonth.key < currentMonthKey());
  const isCurrentMonth = focusedMonth?.key === currentMonthKey();
  // Mês fechado avalia o que foi realizado; mês atual/futuro avalia o planejado.
  const utilizationBasisHours = isPastMonth ? actualTotal : plannedTotal;
  const utilization = capacityHours > 0 ? Math.round((utilizationBasisHours / capacityHours) * 100) : null;
  const status = getAllocationStatus(utilization);
  const statusClasses = getAllocationStatusClasses(status);
  const excessHours = isPastMonth ? 0 : Math.max(plannedTotal - capacityHours, 0);
  const isEmpty = rows.length === 0 && plannedTotal === 0 && actualTotal === 0;
  const expectedHours = focusedMonth ? getExpectedHoursToDate(plannedTotal, focusedMonth) : 0;
  const paceVarianceHours = actualTotal - expectedHours;
  const canEditRow = (row: AllocationPanelProjectRow) => Boolean(row.allocationId) && canEditProject(row.projectId);

  const changedRows = rows.filter((row) =>
    canEditRow(row)
    && draftHours[rowKey(row)] !== undefined
    && draftHours[rowKey(row)] !== focusedMonthData?.projects.find((project) => rowKey(project) === rowKey(row))?.plannedHours,
  );
  const suggestedRow = rows
    .filter((row) => canEditRow(row) && row.plannedHours > row.actualHours)
    .sort((left, right) => (right.plannedHours - right.actualHours) - (left.plannedHours - left.actualHours))[0];

  useEffect(() => {
    if (open) {
      setFocusedMonthKey(monthKey);
      setIsAddingProject(false);
      setRowToRemove(null);
      amplitude.track('allocation_panel_opened', {
        employeeId: employee?.id,
        monthKey,
      });
    }
  }, [employee?.id, monthKey, open]);

  useEffect(() => {
    if (!panelData) return;

    const nextDraft = Object.fromEntries(
      panelData.months.flatMap((monthData) =>
        monthData.projects.map((project) => [rowKey(project), project.plannedHours]),
      ),
    );
    setDraftHours(nextDraft);
  }, [panelData]);

  const availableProjects = useMemo(() => {
    const allocatedProjectIds = new Set(rows.filter((row) => row.allocationId).map((row) => row.projectId));
    return projectOptions.filter((project) => !allocatedProjectIds.has(project.id) && canEditProject(project.id));
  }, [projectOptions, rows, canEditProject]);

  const hasReadOnlyRows = rows.some((row) => !canEditRow(row));

  const roleSuggestions = useMemo(() => {
    const unique = new Set<string>();
    if (employee?.role) unique.add(employee.role);
    roleOptions.forEach((role) => role && unique.add(role));
    return Array.from(unique).sort((left, right) => left.localeCompare(right, 'pt-BR'));
  }, [employee?.role, roleOptions]);

  const updateDraft = (row: AllocationPanelProjectRow, hours: number) => {
    setDraftHours((current) => ({ ...current, [rowKey(row)]: Math.max(0, Math.round(hours)) }));
    amplitude.track('allocation_planned_hours_edited', {
      employeeId: employee?.id,
      projectId: row.projectId,
      monthKey: row.monthKey,
    });
  };

  const applySuggestedCut = () => {
    if (!suggestedRow || excessHours <= 0) return;
    const nextHours = Math.max(suggestedRow.actualHours, suggestedRow.plannedHours - excessHours);
    updateDraft(suggestedRow, nextHours);
    amplitude.track('allocation_conflict_resolved', {
      employeeId: employee?.id,
      projectId: suggestedRow.projectId,
      monthKey: suggestedRow.monthKey,
    });
  };

  const saveChanges = () => {
    if (!tenantId) return;
    const changes: PlannedHoursChange[] = changedRows.map((row) => ({
      tenantId,
      allocationId: row.allocationId as string,
      hours: row.plannedHours,
    }));

    saveMutation.mutate(changes);
  };

  const openAddProject = () => {
    setAddForm({ projectId: '', role: employee?.role ?? '', hoursPerMonth: 40 });
    setIsAddingProject(true);
  };

  const cancelAddProject = () => {
    setIsAddingProject(false);
  };

  const confirmAddProject = () => {
    if (!tenantId || !addForm.projectId || !addForm.role.trim() || !employee || !focusedMonth || !canEditProject(addForm.projectId)) return;
    allocateMutation.mutate(
      {
        projectId: addForm.projectId,
        tenantId,
        employeeId: employee.id,
        role: addForm.role.trim(),
        year: focusedMonth.year,
        month: focusedMonth.month,
        plannedHours: Math.max(0, Math.round(addForm.hoursPerMonth)),
      },
      {
        onSuccess: () => {
          setIsAddingProject(false);
          amplitude.track('allocation_member_added', { employeeId: employee.id, projectId: addForm.projectId });
        },
      },
    );
  };

  const confirmDeallocate = () => {
    if (!tenantId || !rowToRemove || !employee || !canEditRow(rowToRemove)) return;
    deallocateMutation.mutate(
      { tenantId, projectId: rowToRemove.projectId, employeeId: employee.id },
      {
        onSuccess: () => {
          amplitude.track('allocation_member_removed', { employeeId: employee?.id, projectId: rowToRemove.projectId });
          setRowToRemove(null);
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto p-0 sm:max-w-md">
        {panelQuery.isLoading || !employee || !focusedMonth ? (
          <PanelSkeleton />
        ) : (
          <>
            <SheetHeader className="border-b px-5 py-4 text-left">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
                    {initials(employee.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="truncate text-xl">{employee.name}</SheetTitle>
                  <SheetDescription className="sr-only">
                    Detalhe de alocação mensal do colaborador, com horas planejadas editáveis e horas lançadas em leitura.
                  </SheetDescription>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{employee.role}</p>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-4 px-5 py-4">
              <section className={cn('rounded-lg border p-4', statusClasses.soft)}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="ol-label">{isPastMonth ? 'Utilização realizada' : 'Utilização planejada'}</p>
                    <div className="mt-2 flex flex-wrap items-baseline gap-2">
                      <span className="font-mono text-2xl font-semibold leading-none tabular-nums">
                        {statusCopy(utilization)}
                      </span>
                      <span className="text-sm font-semibold">{titleCaseStatus(getAllocationStatusLabel(status))}</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-semibold tabular-nums">
                    {formatHours(utilizationBasisHours)} / {formatHours(capacityHours)} capacidade
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-background/70">
                  <div className={cn('h-full rounded-full', statusClasses.bg, snapWidthClass(utilization))} />
                </div>
              </section>

              {isCurrentMonth && (
                <section className="flex items-start gap-2.5 rounded-lg border bg-card p-3 text-sm">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">Aderência:</span>
                    {' '}{formatHours(actualTotal)} lançadas vs. {formatHours(expectedHours)} esperadas até hoje
                    {' '}({formatSignedHours(paceVarianceHours)}). Dia útil {focusedMonth?.workingDaysElapsed} de {focusedMonth?.workingDays}.
                  </p>
                </section>
              )}

              <div className="flex items-center justify-between rounded-md border bg-card px-2 py-2">
                <Button type="button" variant="ghost" size="icon" disabled={monthIndex <= 0} onClick={() => previousMonth && setFocusedMonthKey(previousMonth.key)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  {monthTitle(focusedMonth)}
                </div>
                <Button type="button" variant="ghost" size="icon" disabled={monthIndex >= months.length - 1} onClick={() => nextMonth && setFocusedMonthKey(nextMonth.key)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {isEmpty ? (
                <section className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border bg-card p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CalendarDays className="h-8 w-8" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">Sem Atividade Registrada</h3>
                  <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    este colaborador ainda não possui alocações para este mês.
                  </p>
                  <div className="mt-6 grid w-full grid-cols-2 gap-3">
                    <div className="rounded-md border bg-background p-3 text-left">
                      <p className="ol-label text-muted-foreground">Início</p>
                      <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">{employee.hireDate ?? '—/—'}</p>
                    </div>
                    <div className="rounded-md border bg-background p-3 text-left">
                      <p className="ol-label text-muted-foreground">Término</p>
                      <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">{employee.terminationDate ?? '—/—'}</p>
                    </div>
                  </div>
                </section>
              ) : (
                <>
                  <section className="overflow-hidden rounded-lg border bg-card">
                    <div className="flex items-center justify-between gap-2 border-b bg-muted px-4 py-3">
                      <p className="ol-label text-muted-foreground">Projetos ativos & planejamento</p>
                      <div className="flex items-center gap-1">
                        {canCorrectActuals && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 px-2 text-xs"
                            onClick={() => setCorrectionDialogOpen(true)}
                          >
                            <Wrench className="h-3.5 w-3.5" />
                            Corrigir lançamentos
                          </Button>
                        )}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs">
                              <HelpCircle className="h-3.5 w-3.5" />
                              Ajuda
                            </Button>
                          </PopoverTrigger>
                        <PopoverContent align="end" className="w-80 text-sm">
                          <p className="font-semibold text-foreground">Como ler esta tabela</p>
                          <dl className="mt-3 space-y-2.5 text-muted-foreground">
                            <div>
                              <dt className="font-medium text-foreground">Planejado</dt>
                              <dd>Horas que você planeja alocar no mês neste projeto. Editável — clique no valor para ajustar e salve as alterações.</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-foreground">Realizado</dt>
                              <dd>
                                Horas já lançadas no timesheet pelo colaborador. Somente leitura aqui — depois de
                                submetido, apenas o gerente do projeto pode corrigir um lançamento, pelo botão
                                "Corrigir lançamentos".
                              </dd>
                            </div>
                            <div>
                              <dt className="font-medium text-foreground">Capacidade</dt>
                              <dd>Total de horas disponíveis do colaborador no mês, considerando jornada e dias úteis. É o limite de referência usado para calcular a utilização.</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-foreground">Total Planejado</dt>
                              <dd>Soma do planejado no mês. Fica em vermelho quando ultrapassa a capacidade do colaborador.</dd>
                            </div>
                          </dl>
                        </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className={cn(PANEL_ROW_GRID, 'border-b bg-muted/50 px-4 py-2 ol-label text-muted-foreground')}>
                      <span>Projeto</span>
                      <span className="text-right">Planejado</span>
                      <span className="text-right">Realizado</span>
                      <span className="sr-only">Ações</span>
                    </div>
                    <div className="divide-y">
                      {rows.map((row) => (
                        <div key={rowKey(row)} className={cn(PANEL_ROW_GRID, 'group px-4 py-3')}>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">{row.projectName}</p>
                            <p className="truncate text-xs text-muted-foreground">{row.clientName}</p>
                          </div>
                          {canEditRow(row) ? (
                            <EditableHoursPill
                              value={row.plannedHours}
                              disabled={isFocusedMonthLocked || saveMutation.isPending}
                              onChange={(value) => updateDraft(row, value)}
                            />
                          ) : (
                            <div className="flex h-8 w-full items-center justify-end rounded-full border bg-muted px-3 font-mono text-xs font-semibold tabular-nums text-muted-foreground">
                              {formatHours(row.plannedHours)}
                            </div>
                          )}
                          <div className="text-right">
                            <ReadOnlyHours value={focusedMonth.key > currentMonthKey() ? null : row.actualHours} />
                          </div>
                          <div className="flex justify-end">
                            {canEditRow(row) ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label={`Desalocar de ${row.projectName}`}
                                title="Desalocar deste projeto"
                                className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                                onClick={() => setRowToRemove(row)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            ) : (
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      aria-label={readOnlyRowMessage(row)}
                                      className="flex h-7 w-7 cursor-help items-center justify-center text-muted-foreground"
                                    >
                                      <Lock className="h-3.5 w-3.5" aria-hidden />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" align="end" className="max-w-[220px]">
                                    {readOnlyRowMessage(row)}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      ))}

                      {internalHours > 0 && (
                        <div className={cn(PANEL_ROW_GRID, 'bg-muted/20 px-4 py-3')}>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                              <span className="h-2 w-2 shrink-0 rounded-sm bg-brand-slate" />
                              Atividades internas
                            </p>
                            <p className="truncate text-xs text-muted-foreground">Administrativo · não billable</p>
                          </div>
                          <div className="text-right"><ReadOnlyHours value={null} muted /></div>
                          <div className="text-right"><ReadOnlyHours value={internalHours} /></div>
                          <span aria-hidden />
                        </div>
                      )}

                      {previousMonthData && (
                        <div className={cn(PANEL_ROW_GRID, 'bg-muted/35 px-4 py-3 text-muted-foreground')}>
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 truncate text-sm font-medium italic">
                              <Lock className="h-3.5 w-3.5" />
                              {monthTitle(previousMonth)} (Fechado)
                            </p>
                          </div>
                          <div className="text-right"><ReadOnlyHours value={previousMonthData.plannedHours} muted /></div>
                          <div className="text-right"><ReadOnlyHours value={previousMonthData.actualHours} muted /></div>
                          <span aria-hidden />
                        </div>
                      )}

                      {nextMonthData && (
                        <div className={cn(PANEL_ROW_GRID, 'bg-muted/20 px-4 py-3 text-muted-foreground')}>
                          <p className="truncate text-sm font-medium">{monthTitle(nextMonth)} (Projeção)</p>
                          <div className="text-right"><ReadOnlyHours value={nextMonthData.plannedHours} muted /></div>
                          <div className="text-right"><ReadOnlyHours value={null} muted /></div>
                          <span aria-hidden />
                        </div>
                      )}

                      <div className={cn(PANEL_ROW_GRID, 'border-t-2 bg-muted/40 px-4 py-3 font-semibold')}>
                        <span className="text-sm text-foreground">Total Planejado</span>
                        <span className={cn('text-right font-mono text-sm tabular-nums', excessHours > 0 ? 'text-destructive' : 'text-foreground')}>
                          {formatHours(plannedTotal)}
                        </span>
                        <span className="text-right font-mono text-sm tabular-nums text-foreground">{formatHours(actualTotal)}</span>
                        <span aria-hidden />
                      </div>
                    </div>
                  </section>

                  {hasReadOnlyRows && (
                    <p className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3 shrink-0" aria-hidden />
                      Projetos com cadeado estão sem planejamento editável no mês ou pertencem a outro gestor.
                    </p>
                  )}

                  {excessHours > 0 && (
                    <section className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive">
                      <div className="flex gap-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">
                            Conflito de capacidade: reduzir {formatHours(excessHours)}
                          </p>
                          <p className="mt-1 text-xs">
                            Sugestão: cortar de {suggestedRow?.projectName ?? 'um projeto com folga entre planejado e lançado'}.
                          </p>
                          {suggestedRow && (
                            <Button type="button" variant="outline" size="sm" className="mt-3 h-8 border-destructive/30 bg-background text-destructive hover:bg-destructive/10" onClick={applySuggestedCut}>
                              Aplicar ajuste sugerido
                            </Button>
                          )}
                        </div>
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>

            <footer className="space-y-3 border-t bg-card px-5 py-4">
              {changedRows.length > 0 && (
                <Button type="button" className="h-11 w-full" disabled={saveMutation.isPending} onClick={saveChanges}>
                  {saveMutation.isPending ? 'Salvando...' : `Salvar ${changedRows.length} alteração${changedRows.length > 1 ? 'ões' : ''}`}
                </Button>
              )}

              {isAddingProject ? (
                <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Adicionar a um projeto</p>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Cancelar" onClick={cancelAddProject}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="ol-label text-muted-foreground">Projeto</Label>
                    <Select value={addForm.projectId} onValueChange={(value) => setAddForm((current) => ({ ...current, projectId: value }))}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={availableProjects.length ? 'Selecione um projeto' : 'Sem projetos disponíveis'} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="ol-label text-muted-foreground">Papel no projeto</Label>
                    <Select value={addForm.role} onValueChange={(value) => setAddForm((current) => ({ ...current, role: value }))}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione o papel" />
                      </SelectTrigger>
                      <SelectContent>
                        {roleSuggestions.map((role) => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="ol-label text-muted-foreground">Horas no mês</Label>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={addForm.hoursPerMonth}
                      onChange={(event) => setAddForm((current) => ({ ...current, hoursPerMonth: Number(event.target.value || 0) }))}
                      className="h-9"
                    />
                  </div>

                  <Button
                    type="button"
                    className="h-10 w-full"
                    disabled={!addForm.projectId || !addForm.role.trim() || allocateMutation.isPending}
                    onClick={confirmAddProject}
                  >
                    {allocateMutation.isPending ? 'Alocando...' : 'Confirmar alocação'}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full gap-2"
                  disabled={availableProjects.length === 0}
                  title={availableProjects.length === 0 ? 'Você só pode alocar em projetos sob sua gestão' : undefined}
                  onClick={openAddProject}
                >
                  <PlusCircle className="h-4 w-4" />
                  Adicionar a um projeto
                </Button>
              )}

              {isEmpty && !isAddingProject && (
                <div className="text-center">
                  <Badge variant="secondary" className="rounded-full text-[10px] uppercase tracking-normal">
                    Disponível para novos projetos
                  </Badge>
                </div>
              )}
            </footer>

            <AlertDialog open={Boolean(rowToRemove)} onOpenChange={(next) => !next && setRowToRemove(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desalocar de {rowToRemove?.projectName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {employee?.name} deixará de fazer parte da equipe deste projeto. O planejamento de horas dessa alocação será removido. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deallocateMutation.isPending}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deallocateMutation.isPending}
                    onClick={(event) => {
                      event.preventDefault();
                      confirmDeallocate();
                    }}
                  >
                    {deallocateMutation.isPending ? 'Desalocando...' : 'Desalocar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {canCorrectActuals && tenantId && (
              <AllocationCorrectionDialog
                open={correctionDialogOpen}
                onOpenChange={setCorrectionDialogOpen}
                employeeId={employee.id}
                employeeName={employee.name}
                tenantId={tenantId}
              />
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
