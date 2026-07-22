import { useCallback, useMemo, useRef, useState } from 'react';
import { format, addDays, parseISO, isAfter, startOfDay } from 'date-fns';
import {
  Briefcase,
  Building2,
  Check,
  ChevronRight,
  Eraser,
  Folder,
  HelpCircle,
  Info,
  Save,
  Send,
  Wand2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TimesheetWeekSelector } from '@/components/timesheets/TimesheetWeekSelector';
import { GlobalSaveIndicator } from '@/components/timesheets/GlobalSaveIndicator';
import { SubmitAllProjectsDialog } from '@/components/timesheets/SubmitWeekDialog';
import { WeeklyGridRow } from './WeeklyGridRow';
import { TimesheetOnboarding } from './TimesheetOnboarding';
import { useTimesheetOnboarding } from '@/hooks/useTimesheetOnboarding';
import { useAuth } from '@/contexts/AuthContext';
import { usePwaEnvironment } from '@/hooks/use-pwa-environment';
import { useMyProjectMemberships } from '@/hooks/useMyTimesheetData';
import {
  useTimesheetsByDateRange,
  getWeekStart,
  getWeekDays,
} from '@/hooks/useTimesheetData';
import {
  useUpsertTimesheet,
  useBatchUpsertTimesheets,
  useClearWeekProjectTimesheets,
} from '@/hooks/useProjectTimesheets';
import {
  useUpsertActivityTimesheet,
  useActivityTimesheetsByRange,
  useClearWeekActivityTimesheets,
} from '@/hooks/useActivityTimesheets';
import { useMyActivityTypes } from '@/hooks/useMyActivityTypes';
import { useSubmitAllProjects } from '@/hooks/useTimesheetSubmissions';
import { useHolidays, isHoliday } from '@/hooks/useHolidays';
import { useTimesheetPrefill } from '@/hooks/useTimesheetPrefill';
import { computeAdaptiveHints, AdaptiveRow } from '@/lib/timesheetDistribution';
import type { SaveStatusInfo } from '@/hooks/useCellAutosave';
import { toast } from 'sonner';

const WEEKDAY_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const GRID_COLS = 'minmax(220px,1fr) repeat(5, 72px) 66px 124px';

interface WeeklyTimesheetGridProps {
  selectedDate: Date;
  onDateChange: (d: Date) => void;
  viewMonth: Date;
  onViewMonthChange: (d: Date) => void;
}

function shallowEqualRecord(a: Record<string, number> | undefined, b: Record<string, number>): boolean {
  if (!a) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => a[k] === b[k]);
}

export function WeeklyTimesheetGrid({
  selectedDate,
  onDateChange,
  viewMonth,
  onViewMonthChange,
}: WeeklyTimesheetGridProps) {
  const { employee } = useAuth();
  const { isOnline } = usePwaEnvironment();
  const jornada = employee?.jornada_diaria ?? 8;
  const onboarding = useTimesheetOnboarding();

  const weekStart = getWeekStart(selectedDate);
  const weekEnd = addDays(weekStart, 4);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const startDate = format(weekStart, 'yyyy-MM-dd');
  const endDate = format(weekEnd, 'yyyy-MM-dd');

  const today = startOfDay(new Date());
  const currentWeekStart = getWeekStart(new Date());
  const isFutureWeek = weekStart > currentWeekStart;
  const allWeekDaysReady = weekEnd <= today;
  const isFriday = new Date().getDay() === 5;
  const isCurrentWeek = !isFutureWeek && weekStart <= today;

  const { data: projects = [], isLoading: loadingProjects } = useMyProjectMemberships(
    employee?.id,
    startDate,
    endDate
  );
  const { data: timesheetEntries = [], isLoading: loadingEntries } = useTimesheetsByDateRange(
    startDate,
    endDate
  );
  const { data: myActivityTypes = [] } = useMyActivityTypes(employee?.id, endDate);
  const { data: activityEntries = [] } = useActivityTimesheetsByRange(
    employee?.id,
    startDate,
    endDate
  );
  const { data: holidays = [] } = useHolidays();

  const rawPrefill = useTimesheetPrefill(employee?.id, weekDays, projects);
  const prefillByProject = useMemo(
    () => (isFutureWeek ? {} : rawPrefill),
    [isFutureWeek, rawPrefill]
  );

  const upsertProject = useUpsertTimesheet();
  const upsertActivity = useUpsertActivityTimesheet();
  const batchUpsert = useBatchUpsertTimesheets();
  const clearProjectWeek = useClearWeekProjectTimesheets();
  const clearActivityWeek = useClearWeekActivityTimesheets();
  const submitAll = useSubmitAllProjects();

  const [realValuesByRow, setRealValuesByRow] = useState<Record<string, Record<string, number>>>({});
  const [saveStatuses, setSaveStatuses] = useState<Record<string, SaveStatusInfo>>({});
  const [activitiesExpanded, setActivitiesExpanded] = useState(false);
  const [resetNonce, setResetNonce] = useState(0);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // ---- helpers de identidade de linha ----
  const projectRowId = (memberId: string) => memberId;
  const activityRowId = (activityTypeId: string) => `act:${activityTypeId}`;

  // ---- entryHours memoizados (estáveis até o refetch) ----
  const entryHoursByRow = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const project of projects) {
      const member = project.members[0];
      if (!member) continue;
      const rec: Record<string, number> = {};
      for (const e of timesheetEntries) {
        if (e.projectMemberId === member.memberId) rec[e.workDate] = e.hours;
      }
      map[projectRowId(member.memberId)] = rec;
    }
    for (const at of myActivityTypes) {
      const rec: Record<string, number> = {};
      for (const e of activityEntries) {
        if (e.activity_type_id === at.id) rec[e.work_date] = e.hours;
      }
      map[activityRowId(at.id)] = rec;
    }
    return map;
  }, [projects, myActivityTypes, timesheetEntries, activityEntries]);

  // ---- lock por data ----
  const projectLockedByRow = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const project of projects) {
      const member = project.members[0];
      if (!member) continue;
      const set = new Set<string>();
      for (const e of timesheetEntries) {
        if (e.projectMemberId === member.memberId && e.isLocked) set.add(e.workDate);
      }
      map[projectRowId(member.memberId)] = set;
    }
    return map;
  }, [projects, timesheetEntries]);

  const activityLockedByRow = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const at of myActivityTypes) {
      const set = new Set<string>();
      for (const e of activityEntries) {
        if (e.activity_type_id === at.id && e.is_locked) set.add(e.work_date);
      }
      map[activityRowId(at.id)] = set;
    }
    return map;
  }, [myActivityTypes, activityEntries]);

  // ---- callbacks estáveis reportados pelas linhas ----
  const handleRealValuesChange = useCallback((id: string, real: Record<string, number>) => {
    setRealValuesByRow((prev) => {
      if (shallowEqualRecord(prev[id], real)) return prev;
      return { ...prev, [id]: real };
    });
  }, []);

  const handleSaveStatusChange = useCallback((id: string, info: SaveStatusInfo) => {
    setSaveStatuses((prev) => {
      const cur = prev[id];
      if (cur && cur.status === info.status && cur.lastSavedAt === info.lastSavedAt) return prev;
      return { ...prev, [id]: info };
    });
  }, []);

  // ---- totais reais por dia (só valores lançados; sugestões não contam) ----
  const dayRealTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const day of weekDays) totals[day.date] = 0;
    for (const rowId of Object.keys(realValuesByRow)) {
      const rec = realValuesByRow[rowId];
      for (const date of Object.keys(rec)) {
        if (totals[date] !== undefined) totals[date] += rec[date] || 0;
      }
    }
    return totals;
  }, [realValuesByRow, weekDays]);

  const overByDate = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const day of weekDays) map[day.date] = (dayRealTotals[day.date] ?? 0) > jornada;
    return map;
  }, [weekDays, dayRealTotals, jornada]);

  // ---- sugestões adaptativas por projeto (peso = prefill; fecha a jornada) ----
  const suggestionsByRow = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    for (const day of weekDays) {
      const date = day.date;
      const entered = dayRealTotals[date] ?? 0;
      const rows: AdaptiveRow[] = projects.map((p) => {
        const member = p.members[0];
        const rowId = projectRowId(member?.memberId ?? p.projectId);
        const weight = prefillByProject[p.projectId]?.[date] ?? 0;
        const hasReal = realValuesByRow[rowId]?.[date] !== undefined;
        return { rowId, weight, hasReal };
      });
      const hints = computeAdaptiveHints(rows, entered, jornada);
      for (const rowId of Object.keys(hints)) {
        if (!result[rowId]) result[rowId] = {};
        result[rowId][date] = hints[rowId];
      }
    }
    return result;
  }, [weekDays, projects, prefillByProject, realValuesByRow, dayRealTotals, jornada]);

  // ---- navegação por teclado (coordenada na página) ----
  const registerRef = useCallback((rowIndex: number, dayIndex: number, el: HTMLInputElement | null) => {
    const key = `${rowIndex}:${dayIndex}`;
    if (el) inputRefs.current.set(key, el);
    else inputRefs.current.delete(key);
  }, []);

  // Limite seguro para a navegação por teclado: linhas de atividade colapsadas
  // e vazias simplesmente não têm ref registrada, então o loop as pula.
  const orderedRowCount = projects.length + myActivityTypes.length;

  const onArrowNavigate = useCallback(
    (rowIndex: number, dayIndex: number, dRow: number, dCol: number) => {
      if (dRow !== 0) {
        let r = rowIndex + dRow;
        while (r >= 0 && r < orderedRowCount) {
          const el = inputRefs.current.get(`${r}:${dayIndex}`);
          if (el) { el.focus(); return; }
          r += dRow;
        }
      } else if (dCol !== 0) {
        let c = dayIndex + dCol;
        while (c >= 0 && c < weekDays.length) {
          const el = inputRefs.current.get(`${rowIndex}:${c}`);
          if (el) { el.focus(); return; }
          c += dCol;
        }
      }
    },
    [orderedRowCount, weekDays.length]
  );

  // ---- modo de célula ----
  const holidayName = useCallback(
    (date: string) => isHoliday(parseISO(date), holidays)?.name,
    [holidays]
  );

  const cellModeFor = useCallback(
    (date: string, lockedSet: Set<string> | undefined): 'edit' | 'locked' | 'holiday' | 'future' => {
      if (isHoliday(parseISO(date), holidays)) return 'holiday';
      if (isAfter(startOfDay(parseISO(date)), today)) return 'future';
      if (lockedSet?.has(date)) return 'locked';
      return 'edit';
    },
    [holidays, today]
  );

  const onExceedMax = useCallback((max: number) => {
    toast.error(`O máximo permitido por dia é ${max}h`, { duration: 3000 });
  }, []);

  const onOfflineBlocked = useCallback(() => {
    toast.error('Sem conexão. Reconecte para salvar.');
  }, []);

  const dateLabels = useMemo(
    () => weekDays.map((d) => format(parseISO(d.date), 'dd/MM')),
    [weekDays]
  );

  // ---- status por linha ----
  const projectRowStatus = (memberId: string): 'locked' | 'draft' | 'none' => {
    const rowId = projectRowId(memberId);
    const locked = projectLockedByRow[rowId];
    const entries = entryHoursByRow[rowId] ?? {};
    const dates = Object.keys(entries);
    if (dates.length > 0 && dates.every((d) => locked?.has(d))) return 'locked';
    const hasReal = Object.keys(realValuesByRow[rowId] ?? {}).length > 0;
    return hasReal ? 'draft' : 'none';
  };

  const activityRowStatus = (activityTypeId: string): 'locked' | 'draft' | 'none' => {
    const rowId = activityRowId(activityTypeId);
    const locked = activityLockedByRow[rowId];
    const entries = entryHoursByRow[rowId] ?? {};
    const dates = Object.keys(entries);
    if (dates.length > 0 && dates.every((d) => locked?.has(d))) return 'locked';
    const hasReal = Object.keys(realValuesByRow[rowId] ?? {}).length > 0;
    return hasReal ? 'draft' : 'none';
  };

  const statusBadge = (status: 'locked' | 'draft' | 'none') => {
    if (status === 'none') return null;
    return (
      <span
        className={cn(
          'mx-auto inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold',
          status === 'locked'
            ? 'bg-[hsl(var(--success-subtle))] text-[hsl(var(--success-emphasis))]'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {status === 'locked' ? 'Enviado' : 'Rascunho'}
      </span>
    );
  };

  // ---- estados agregados de envio ----
  const allProjectsLocked = useMemo(() => {
    if (projects.length === 0) return false;
    return projects.every((p) => {
      const member = p.members[0];
      if (!member) return false;
      const es = timesheetEntries.filter((e) => e.projectMemberId === member.memberId);
      return es.length > 0 && es.every((e) => e.isLocked);
    });
  }, [projects, timesheetEntries]);

  const totalRealAllProjects = useMemo(() => {
    let total = 0;
    for (const p of projects) {
      const member = p.members[0];
      if (!member) continue;
      const rec = realValuesByRow[projectRowId(member.memberId)] ?? {};
      total += Object.values(rec).reduce((s, h) => s + (h || 0), 0);
    }
    return total;
  }, [projects, realValuesByRow]);

  const totalSuggested = useMemo(() => {
    let total = 0;
    for (const p of projects) {
      const member = p.members[0];
      if (!member) continue;
      const rec = suggestionsByRow[projectRowId(member.memberId)] ?? {};
      total += Object.values(rec).reduce((s, h) => s + (h || 0), 0);
    }
    return total;
  }, [projects, suggestionsByRow]);

  const totalRealAllActivities = useMemo(() => {
    let total = 0;
    for (const at of myActivityTypes) {
      const rec = realValuesByRow[activityRowId(at.id)] ?? {};
      total += Object.values(rec).reduce((s, h) => s + (h || 0), 0);
    }
    return total;
  }, [myActivityTypes, realValuesByRow]);

  const activitiesWithHoursCount = useMemo(
    () => myActivityTypes.filter((at) => Object.keys(realValuesByRow[activityRowId(at.id)] ?? {}).length > 0).length,
    [myActivityTypes, realValuesByRow]
  );

  const daysClosed = weekDays.filter((d) => (dayRealTotals[d.date] ?? 0) === jornada).length;
  const anyPending = Object.values(saveStatuses).some(
    (s) => s.status === 'saving' || s.status === 'unsaved'
  );
  const hasSuggestions = totalSuggested > 0;

  // ---- ações de semana ----
  const handleAcceptSuggested = () => {
    const inputs = [] as { projectId: string; projectMemberId: string; workDate: string; hours: number }[];
    for (const p of projects) {
      const member = p.members[0];
      if (!member) continue;
      const rec = suggestionsByRow[projectRowId(member.memberId)] ?? {};
      for (const date of Object.keys(rec)) {
        inputs.push({
          projectId: p.projectId,
          projectMemberId: member.memberId,
          workDate: date,
          hours: rec[date],
        });
      }
    }
    if (inputs.length === 0) return;
    batchUpsert.mutate(inputs);
  };

  const handleClear = () => {
    const memberIds = projects.map((p) => p.members[0]?.memberId).filter(Boolean) as string[];
    clearProjectWeek.mutate({ projectMemberIds: memberIds, weekStart: startDate, weekEnd: endDate });
    if (employee?.id) {
      clearActivityWeek.mutate({ employeeId: employee.id, weekStart: startDate, weekEnd: endDate });
    }
    setRealValuesByRow({});
    setResetNonce((n) => n + 1);
  };

  const handleSubmit = () => {
    const submitSuggestions: Record<string, Record<string, number>> = {};
    const projectsToSubmit = projects.map((p) => {
      const member = p.members[0];
      const rowId = projectRowId(member?.memberId ?? p.projectId);
      const realRec = realValuesByRow[rowId] ?? {};
      const total = Object.values(realRec).reduce((s, h) => s + (h || 0), 0);
      const sug = suggestionsByRow[rowId];
      if (sug && Object.keys(sug).length > 0) submitSuggestions[p.projectId] = sug;
      return {
        projectId: p.projectId,
        totalHours: total,
        memberIds: p.members.map((m) => m.memberId),
      };
    });
    submitAll.mutate(
      {
        projects: projectsToSubmit,
        weekStart: startDate,
        weekDays: weekDays.map((d) => d.date),
        suggestions: submitSuggestions,
      },
      { onSuccess: () => setShowSubmitDialog(false) }
    );
  };

  const isLoading = loadingProjects || loadingEntries;
  const submitDisabled = !allWeekDaysReady || allProjectsLocked || submitAll.isPending || !isOnline;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Carregando…
        </CardContent>
      </Card>
    );
  }

  const emptyState = projects.length === 0 && myActivityTypes.length === 0;

  return (
    <Card>
      <CardContent className="pt-4">
        {/* Chips de semana + ações */}
        <div className="border-b border-border px-3 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TimesheetWeekSelector
              selectedDate={selectedDate}
              onDateChange={onDateChange}
              viewMonth={viewMonth}
              onViewMonthChange={onViewMonthChange}
              part="chips"
            />
            {!emptyState && (
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={allProjectsLocked || anyPending || isFutureWeek || !hasSuggestions}
                  onClick={handleAcceptSuggested}
                  className="h-7 gap-1 px-2.5 text-xs font-medium"
                  data-tour="accept-suggested-week"
                >
                  <Wand2 className="h-3 w-3" /> Aceitar semana sugerida
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={anyPending}
                  onClick={handleClear}
                  className="h-7 gap-1 px-2.5 text-xs font-medium"
                >
                  <Eraser className="h-3 w-3" /> Limpar
                </Button>
                {onboarding.canReopen && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={onboarding.reopen}
                          aria-label="Como funciona a nova timesheet"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Como funciona a nova timesheet</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>
        </div>

        {emptyState ? (
          <div className="py-12 text-center text-muted-foreground">
            <Building2 className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>Você não está alocado em nenhum projeto ativo nesta semana.</p>
            <p className="text-sm">Navegue para outra semana ou aguarde ser incluído em um projeto.</p>
          </div>
        ) : (
          <>
            {isFutureWeek && (
              <div className="mx-1 mt-3 flex items-start gap-2.5 rounded-md border-l-4 border-info bg-[hsl(var(--info-subtle))] px-3 py-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
                <p className="text-sm text-foreground">
                  Esta semana ainda não começou. Você poderá lançar horas a partir de{' '}
                  {format(weekStart, 'dd/MM/yyyy')}.
                </p>
              </div>
            )}

            {isFriday && isCurrentWeek && !allProjectsLocked && (
              <div className="mx-1 mt-3 flex items-start gap-2.5 rounded-md border-l-4 border-[hsl(var(--warning))] bg-[hsl(var(--warning-subtle))] px-3 py-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning-emphasis))]" />
                <p className="text-sm text-foreground">
                  <span className="font-medium">Lembrete:</span> envie suas horas até o final do dia.
                  Após o envio, somente seu gerente ou admin poderá fazer alterações.
                </p>
              </div>
            )}

            {hasSuggestions && (
              <div className="mx-1 mt-3 flex items-start gap-2.5 rounded-md border-l-4 border-[hsl(var(--success)/0.4)] bg-[hsl(var(--success-subtle))] px-3 py-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--success-emphasis))]" />
                <p className="text-sm text-muted-foreground">
                  As células <span className="italic">tracejadas</span> são{' '}
                  <span className="font-medium">sugestões</span> a partir da sua alocação. Ajuste o que
                  precisar e clique em <span className="font-medium">Enviar semana</span> para lançá-las.
                </p>
              </div>
            )}

            {/* Cabeçalho: Projetos + dias + Total + Status */}
            <div
              className="grid items-end border-b border-border pb-3 pt-4"
              style={{ gridTemplateColumns: GRID_COLS, columnGap: 14 }}
            >
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <span className="ui-h3">Projetos</span>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                  {projects.length}
                </span>
              </div>
              {dateLabels.map((d, i) => (
                <div key={i} className="text-center">
                  <div className="text-sm font-semibold text-foreground">{WEEKDAY_LABELS[i]}</div>
                  <div className="ui-caption">{d}</div>
                </div>
              ))}
              <div className="ui-label text-center">Total</div>
              <div className="ui-label text-center">Status</div>
            </div>

            {projects.map((p, i) => {
              const member = p.members[0];
              if (!member) return null;
              const rowId = projectRowId(member.memberId);
              return (
                <WeeklyGridRow
                  key={`${rowId}:${resetNonce}`}
                  rowId={rowId}
                  rowIndex={i}
                  name={p.projectName}
                  subtitle={p.clientName ?? ''}
                  weekDays={weekDays}
                  weekdayLabels={WEEKDAY_LABELS}
                  dateLabels={dateLabels}
                  gridCols={GRID_COLS}
                  isOnline={isOnline}
                  trackSuggestions
                  suggestions={suggestionsByRow[rowId]}
                  entryHours={entryHoursByRow[rowId] ?? {}}
                  persist={(date, hours) =>
                    upsertProject.mutateAsync({
                      projectId: p.projectId,
                      projectMemberId: member.memberId,
                      workDate: date,
                      hours,
                    })
                  }
                  cellMode={(date) => cellModeFor(date, projectLockedByRow[rowId])}
                  holidayName={holidayName}
                  overByDate={overByDate}
                  statusContent={statusBadge(projectRowStatus(member.memberId))}
                  onExceedMax={onExceedMax}
                  onOfflineBlocked={onOfflineBlocked}
                  onRealValuesChange={handleRealValuesChange}
                  onSaveStatusChange={handleSaveStatusChange}
                  registerRef={registerRef}
                  onArrowNavigate={onArrowNavigate}
                />
              );
            })}

            {/* Atividades internas — a seta colapsa só as linhas ainda vazias;
                linhas com qualquer horas lançadas na semana ficam sempre visíveis. */}
            {myActivityTypes.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setActivitiesExpanded((v) => !v)}
                  className="flex w-full items-center justify-between gap-2 rounded-md pb-2 pt-5 text-left transition-colors hover:bg-muted/30"
                  data-tour="activities-toggle"
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="ui-h3">Atividades internas</span>
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
                      {myActivityTypes.length}
                    </span>
                  </div>
                  <ChevronRight
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform',
                      activitiesExpanded && 'rotate-90'
                    )}
                  />
                </button>

                {myActivityTypes.map((at, ai) => {
                  const rowId = activityRowId(at.id);
                  const hasData = Object.keys(realValuesByRow[rowId] ?? {}).length > 0;
                  if (!hasData && !activitiesExpanded) return null;

                  return (
                    <WeeklyGridRow
                      key={`${rowId}:${resetNonce}`}
                      rowId={rowId}
                      rowIndex={projects.length + ai}
                      name={at.name}
                      subtitle="Atividade interna"
                      weekDays={weekDays}
                      weekdayLabels={WEEKDAY_LABELS}
                      dateLabels={dateLabels}
                      gridCols={GRID_COLS}
                      isOnline={isOnline}
                      trackSuggestions={false}
                      entryHours={entryHoursByRow[rowId] ?? {}}
                      persist={(date, hours) =>
                        upsertActivity.mutateAsync({
                          employeeId: employee!.id,
                          activityTypeId: at.id,
                          workDate: date,
                          hours,
                        })
                      }
                      cellMode={(date) => cellModeFor(date, activityLockedByRow[rowId])}
                      holidayName={holidayName}
                      overByDate={overByDate}
                      statusContent={statusBadge(activityRowStatus(at.id))}
                      onExceedMax={onExceedMax}
                      onRealValuesChange={handleRealValuesChange}
                      onSaveStatusChange={handleSaveStatusChange}
                      registerRef={registerRef}
                      onArrowNavigate={onArrowNavigate}
                    />
                  );
                })}
              </>
            )}

            {/* Total / dia */}
            <div
              className="mt-2 grid items-center border-t-2 border-border py-3"
              style={{ gridTemplateColumns: GRID_COLS, columnGap: 14 }}
            >
              <div className="text-xs font-bold uppercase tracking-wide text-foreground">Total / dia</div>
              {weekDays.map((day) => {
                const total = dayRealTotals[day.date] ?? 0;
                return (
                  <div
                    key={day.date}
                    className={cn(
                      'text-center text-sm font-bold tabular-nums',
                      total === 0 && 'text-muted-foreground',
                      total === jornada && 'text-[hsl(var(--success-emphasis))]',
                      total > 0 && total < jornada && 'text-[hsl(var(--warning-emphasis))]',
                      total > jornada && 'text-[hsl(var(--destructive-emphasis))]'
                    )}
                  >
                    {total}h
                  </div>
                );
              })}
              <div />
              <div />
            </div>

            {/* Rodapé de envio */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t bg-background px-3 py-2.5">
              <div className="text-xs text-muted-foreground">
                Jornada: {jornada}h/dia · {daysClosed}/{weekDays.length} dias fechados
              </div>
              <div className="flex items-center gap-3">
                <GlobalSaveIndicator saveStatuses={saveStatuses} />
                {allProjectsLocked ? (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-[hsl(var(--success-emphasis))]" /> Semana enviada
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Save className="h-4 w-4" /> Rascunho salvo
                  </span>
                )}
                <Button
                  type="button"
                  onClick={() => setShowSubmitDialog(true)}
                  disabled={submitDisabled}
                  className="h-10 rounded-full px-5"
                >
                  <Send className="h-4 w-4" /> Enviar semana
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      <SubmitAllProjectsDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        pendingCount={projects.length}
        activityCount={activitiesWithHoursCount}
        weekStart={weekStart}
        weekEnd={weekEnd}
        totalHours={totalRealAllProjects + totalSuggested + totalRealAllActivities}
        onConfirm={handleSubmit}
        isSubmitting={submitAll.isPending}
      />

      {!emptyState && <TimesheetOnboarding open={onboarding.open} onDismiss={onboarding.dismiss} />}
    </Card>
  );
}
