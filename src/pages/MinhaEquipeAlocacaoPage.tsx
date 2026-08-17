import { Fragment, useEffect, useMemo, useState } from 'react';
import { addMonths, format, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CalendarRange, ChevronDown, ChevronRight, FolderKanban, LineChart, Search, Users } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AppLayout } from '@/components/layout/AppLayout';
import { MonthCell, PersonButton, ReferenceMonthCell } from '@/components/allocation/AllocationGrid';
import { CapacityBar, CapacityLegend } from '@/components/allocation/CapacityBar';
import { useAuth } from '@/contexts/AuthContext';
import { useAllocationGrid } from '@/hooks/useAllocationGrid';
import { useHolidays } from '@/hooks/useHolidays';
import { monthLoadKey, useEmployeeMonthlyLoad } from '@/hooks/useEmployeeMonthlyLoad';
import { buildManagerByProject, buildMonthBreakdown } from '@/lib/allocationBreakdown';
import { buildAllocationMonthsRange, emptyAllocationCell, getAllocationStatusClasses } from '@/lib/allocationGrid';
import { GPO_HEALTHY_MAX, GPO_HEALTHY_MIN } from '@/lib/gpoAllocation.constants';
import { cn } from '@/lib/utils';
import type {
  AllocationMonth,
  AllocationPerson,
  AllocationProjectOption,
  AllocationStatusKey,
  ManagerByProject,
  MonthBreakdown,
} from '@/types/allocation';

/** Janela de meses selecionável: 6 meses para trás até 17 para frente (mês atual = offset 0). */
const RANGE_MIN_OFFSET = -6;
const RANGE_MAX_OFFSET = 17;
const DEFAULT_FROM_OFFSET = 0;
const DEFAULT_TO_OFFSET = 3;

const EMPTY_FILTERS = {
  status: 'all',
  role: 'all',
  projectId: 'all',
  search: '',
  showTerminated: false,
} as const;

const VIEW = { people: 'people', projects: 'projects' } as const;
type ViewMode = (typeof VIEW)[keyof typeof VIEW];

const BUCKET = { overloaded: 'overloaded', healthy: 'healthy', slack: 'slack' } as const;
type HealthBucket = (typeof BUCKET)[keyof typeof BUCKET];

const ALL_OPTION = 'all';

function bucketForStatus(status: AllocationStatusKey): HealthBucket {
  if (status === 'limit' || status === 'critical') return BUCKET.overloaded;
  if (status === 'healthy') return BUCKET.healthy;
  return BUCKET.slack;
}

interface HealthCount {
  overloaded: number;
  healthy: number;
  slack: number;
}

function countHealth(
  people: AllocationPerson[],
  monthKey: string,
  lensManagerId: string | null,
  managerByProject: ManagerByProject,
): HealthCount {
  return people.reduce<HealthCount>(
    (acc, person) => {
      const cell = person.cells[monthKey];
      if (!cell) return acc;
      acc[bucketForBreakdown(buildMonthBreakdown(cell, lensManagerId ?? undefined, managerByProject))] += 1;
      return acc;
    },
    { overloaded: 0, healthy: 0, slack: 0 },
  );
}

function personIsInProject(person: AllocationPerson, projectId: string, months: AllocationMonth[]) {
  return months.some((month) => (person.cells[month.key]?.projects ?? []).some((pill) => pill.id === projectId));
}

function formatHours(value: number) {
  return `${Math.round(value)}h`;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

/** Régua única da tela: estourou > 100% · no ponto 90–100% (faixa saudável) · com folga < 90%. */
function statusFromBreakdown(breakdown: MonthBreakdown): AllocationStatusKey {
  if (breakdown.utilization === null) return 'unallocated';
  if (breakdown.utilization > GPO_HEALTHY_MAX) return breakdown.utilization > 115 ? 'critical' : 'limit';
  if (breakdown.utilization >= GPO_HEALTHY_MIN) return 'healthy';
  if (breakdown.utilization >= 40) return 'idle';
  return 'unallocated';
}

function bucketForBreakdown(breakdown: MonthBreakdown): HealthBucket {
  return bucketForStatus(statusFromBreakdown(breakdown));
}

function HealthChip({
  tone,
  label,
  value,
  active,
  onClick,
}: {
  tone: AllocationStatusKey;
  label: string;
  value: number;
  active?: boolean;
  onClick?: () => void;
}) {
  const classes = getAllocationStatusClasses(tone);
  const base = 'inline-flex items-center gap-1.5 rounded-pill border bg-card px-2.5 py-1 text-xs';
  const inner = (
    <>
      <span className={cn('h-1.5 w-1.5 rounded-full', classes.dot)} />
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </>
  );

  if (!onClick) return <span className={base}>{inner}</span>;

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      disabled={value === 0 && !active}
      className={cn(
        base,
        'transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        active && 'ring-2 ring-ring',
      )}
    >
      {inner}
    </button>
  );
}

function AllocatedCellValue({ breakdown, lensLabel }: { breakdown: MonthBreakdown; lensLabel: string | null }) {
  if (breakdown.plannedHours <= 0) return <span className="text-muted-foreground">—</span>;

  const byManager = new Map<string, number>();
  breakdown.others.forEach((slice) => {
    const name = slice.managerName ?? 'Sem GP';
    byManager.set(name, (byManager.get(name) ?? 0) + slice.hours);
  });
  const managers = Array.from(byManager, ([name, hours]) => ({ name, hours })).sort((a, b) => b.hours - a.hours);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help border-b border-dotted border-muted-foreground/60 font-semibold text-foreground">
          {formatHours(breakdown.plannedHours)}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {lensLabel && breakdown.mineHours > 0 && (
          <p className="font-semibold">
            {lensLabel}: {formatHours(breakdown.mineHours)}
          </p>
        )}
        {managers.length > 0 && (
          <>
            <p className={cn('font-semibold', lensLabel && breakdown.mineHours > 0 && 'mt-1')}>
              {lensLabel ? 'Outros GPs — negociar com:' : 'Por GP:'}
            </p>
            {managers.map((manager) => (
              <p key={manager.name}>
                {manager.name} — {formatHours(manager.hours)}
              </p>
            ))}
          </>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

const MONTH_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

interface MonthProjectSlice {
  projectId: string;
  projectName: string;
  managerName: string | null;
  isMine: boolean;
  hours: number;
}

function MonthRunwayRow({
  label,
  capacity,
  planned,
  isCurrent,
  projects,
  expanded,
  onToggle,
}: {
  label: string;
  capacity: number;
  planned: number;
  isCurrent: boolean;
  projects: MonthProjectSlice[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const free = Math.max(0, capacity - planned);
  const over = Math.max(0, planned - capacity);
  const scale = Math.max(capacity, planned, 1);
  const filledPct = (Math.min(planned, capacity) / scale) * 100;
  const overPct = (over / scale) * 100;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Ocultar' : 'Ver'} projetos planejados em ${label}`}
        className="flex w-full items-center gap-3 rounded-md px-1 py-1 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span
          className={cn(
            'w-9 shrink-0 text-[11px] font-semibold uppercase',
            isCurrent ? 'text-primary-deep' : 'text-muted-foreground',
          )}
        >
          {label}
        </span>
        <span className="flex h-2.5 flex-1 items-stretch gap-[2px] overflow-hidden rounded-sm bg-muted">
          {filledPct > 0 && <span className="rounded-sm bg-chart-2" style={{ width: `${filledPct}%` }} />}
          {overPct > 0 && <span className="rounded-sm bg-destructive" style={{ width: `${overPct}%` }} />}
        </span>
        <span className="w-[104px] shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
          {formatHours(planned)}/{formatHours(capacity)}
        </span>
        <span
          className={cn(
            'w-[104px] shrink-0 text-right font-mono text-sm font-bold tabular-nums',
            over > 0 ? 'text-destructive' : free > 0 ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {over > 0 ? `−${formatHours(over)}` : free > 0 ? `${formatHours(free)} livres` : 'lotado'}
        </span>
      </button>

      {expanded && (
        <ul className="mb-1 ml-[30px] mt-1 space-y-1 border-l pl-3">
          {projects.length === 0 ? (
            <li className="py-1 text-xs text-muted-foreground">Nada planejado neste mês.</li>
          ) : (
            projects.map((slice) => (
              <li key={slice.projectId} className="flex items-center gap-2 text-xs">
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-sm', slice.isMine ? 'bg-chart-1' : 'bg-chart-2')} />
                <span className="min-w-0 flex-1 truncate text-foreground">{slice.projectName}</span>
                <span className="shrink-0 truncate text-muted-foreground">{slice.managerName ?? 'Sem GP'}</span>
                <span className="w-12 shrink-0 text-right font-mono font-semibold tabular-nums text-foreground">
                  {formatHours(slice.hours)}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/** Espaço planejado × capacidade nos próximos meses; cada mês abre os projetos e o GP que planejou. */
function PersonExpandedDetail({
  tenantId,
  employeeId,
  year,
  currentMonthNumber,
  lensManagerId,
  managerByProject,
}: {
  tenantId: string | undefined;
  employeeId: string;
  year: number;
  currentMonthNumber: number;
  lensManagerId: string | null;
  managerByProject: ManagerByProject;
}) {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const { data, isLoading, isError } = useEmployeeMonthlyLoad({ tenantId, employeeId, years: [year] });

  const runway = Array.from({ length: 6 }, (_, index) => currentMonthNumber + index)
    .filter((month) => month <= 12)
    .map((month) => {
      const load = data?.[monthLoadKey(year, month)];
      const projects: MonthProjectSlice[] = (load?.byProject ?? [])
        .map((entry) => {
          const owner = managerByProject.get(entry.projectId);
          return {
            projectId: entry.projectId,
            projectName: entry.projectName,
            managerName: owner?.managerName ?? null,
            isMine: !!lensManagerId && owner?.managerId === lensManagerId,
            hours: Math.round(entry.hours),
          };
        })
        .sort((a, b) => b.hours - a.hours);

      return {
        month,
        capacity: Math.round(load?.capacityHours ?? 0),
        planned: Math.round(load?.totalPlanned ?? 0),
        projects,
      };
    });

  return (
    <section className="max-w-3xl">
      <h3 className="ol-label mb-2 flex items-center gap-1.5 text-muted-foreground">
        <LineChart className="h-3.5 w-3.5" aria-hidden />
        Espaço nos próximos meses
      </h3>
      {isLoading ? (
        <Skeleton className="h-24 w-full rounded-md" />
      ) : isError ? (
        <p className="text-sm text-muted-foreground">Não foi possível carregar os próximos meses.</p>
      ) : (
        <div className="space-y-0.5">
          {runway.map((entry) => (
            <MonthRunwayRow
              key={entry.month}
              label={MONTH_SHORT[entry.month - 1]}
              capacity={entry.capacity}
              planned={entry.planned}
              isCurrent={entry.month === currentMonthNumber}
              projects={entry.projects}
              expanded={expandedMonth === entry.month}
              onToggle={() => setExpandedMonth((current) => (current === entry.month ? null : entry.month))}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PeopleCapacityTable({
  rows,
  lensLabel,
  expandedPersonId,
  onToggleExpand,
  onOpen,
  temporal,
}: {
  rows: Array<{ person: AllocationPerson; breakdown: MonthBreakdown }>;
  lensLabel: string | null;
  expandedPersonId: string | null;
  onToggleExpand: (personId: string) => void;
  onOpen: (personId: string) => void;
  temporal: {
    tenantId: string | undefined;
    year: number;
    currentMonthNumber: number;
    lensManagerId: string | null;
    managerByProject: ManagerByProject;
  };
}) {
  const columnCount = 7;
  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
      <table className="w-full min-w-[860px] border-collapse">
        <thead>
          <tr className="border-b bg-muted/60">
            <th className="w-[240px] px-4 py-2.5 text-left">
              <span className="ol-label text-muted-foreground">Pessoa</span>
            </th>
            <th className="px-4 py-2.5 text-left">
              <span className="ol-label whitespace-nowrap text-muted-foreground">Capacidade planejada</span>
            </th>
            <th className="w-[104px] px-3 py-2.5 text-right">
              <span className="ol-label whitespace-nowrap text-muted-foreground">Capacidade</span>
            </th>
            <th className="w-[104px] px-3 py-2.5 text-right">
              <span className="ol-label whitespace-nowrap text-muted-foreground">Planejado</span>
            </th>
            <th className="w-[140px] px-3 py-2.5 text-right">
              <span className="ol-label whitespace-nowrap text-foreground">Livre p/ alocar</span>
            </th>
            <th className="w-[92px] px-4 py-2.5 text-right">
              <span className="ol-label whitespace-nowrap text-muted-foreground">% plan.</span>
            </th>
            <th className="w-[52px] px-2 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map(({ person, breakdown }) => {
            const expanded = expandedPersonId === person.id;
            const status = statusFromBreakdown(breakdown);
            const statusClasses = getAllocationStatusClasses(status);
            const over = breakdown.overflowHours > 0;

            return (
              <Fragment key={person.id}>
                <tr className="border-b last:border-b-0 hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onOpen(person.id)}
                      className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <span className="block truncate text-sm font-semibold text-foreground">{person.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{person.role}</span>
                    </button>
                  </td>

                  <td className="px-4 py-3">
                    <CapacityBar breakdown={breakdown} lensLabel={lensLabel} showLabel={false} />
                  </td>

                  <td className="px-3 py-3 text-right font-mono text-sm tabular-nums text-muted-foreground">
                    {formatHours(breakdown.capacityHours)}
                  </td>

                  <td className="px-3 py-3 text-right font-mono text-sm tabular-nums">
                    <AllocatedCellValue breakdown={breakdown} lensLabel={lensLabel} />
                  </td>

                  <td className="px-3 py-3 text-right">
                    {over ? (
                      <>
                        <span className="block font-mono text-xl font-bold leading-none tabular-nums text-destructive">
                          −{formatHours(breakdown.overflowHours)}
                        </span>
                        <span className="mt-1 block text-[11px] leading-none text-destructive">estourou</span>
                      </>
                    ) : breakdown.freeHours > 0 ? (
                      <>
                        <span className="block font-mono text-xl font-bold leading-none tabular-nums text-foreground">
                          {formatHours(breakdown.freeHours)}
                        </span>
                        <span className="mt-1 block text-[11px] leading-none text-muted-foreground">disponível</span>
                      </>
                    ) : (
                      <>
                        <span className="block font-mono text-xl font-bold leading-none tabular-nums text-muted-foreground">
                          0h
                        </span>
                        <span className="mt-1 block text-[11px] leading-none text-muted-foreground">lotado</span>
                      </>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right">
                    <span className={cn('font-mono text-sm font-semibold tabular-nums', statusClasses.text)}>
                      {breakdown.utilization === null ? '—' : `${breakdown.utilization}%`}
                    </span>
                  </td>

                  <td className="px-2 py-3 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-expanded={expanded}
                      aria-label={expanded ? `Ocultar histórico de ${person.name}` : `Ver histórico de ${person.name}`}
                      onClick={() => onToggleExpand(person.id)}
                    >
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                  </td>
                </tr>

                {expanded && (
                  <tr className="border-b bg-muted/30 last:border-b-0">
                    <td colSpan={columnCount} className="px-4 py-3">
                      <PersonExpandedDetail
                        tenantId={temporal.tenantId}
                        employeeId={person.id}
                        year={temporal.year}
                        currentMonthNumber={temporal.currentMonthNumber}
                        lensManagerId={temporal.lensManagerId}
                        managerByProject={temporal.managerByProject}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AllocationRowTable({
  people,
  months,
  referenceMonthKey,
  onOpen,
}: {
  people: AllocationPerson[];
  months: AllocationMonth[];
  referenceMonthKey: string;
  onOpen: (employeeId: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full min-w-[900px] table-fixed border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-[220px] border-b border-r bg-muted p-3 text-left">
              <span className="ol-label text-muted-foreground">Pessoa</span>
            </th>
            {months.map((month) => {
              const isReference = month.key === referenceMonthKey;
              return (
                <th
                  key={month.key}
                  className={cn(
                    'border-b border-r bg-muted p-3 text-left last:border-r-0',
                    isReference ? 'min-w-[320px] bg-success-subtle/40' : 'w-[150px]',
                  )}
                >
                  <span className="block text-sm font-semibold uppercase tracking-normal text-foreground">
                    {month.label}
                    {isReference && <span className="ml-1.5 text-[10px] font-semibold normal-case text-primary-deep">hoje</span>}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">% carga · planejado / cap.</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {people.map((person) => (
            <tr key={person.id} className="group">
              <td className="sticky left-0 z-[1] border-r border-t bg-card p-0 transition-colors group-hover:bg-accent/60">
                <PersonButton person={person} onOpen={() => onOpen(person.id)} />
              </td>
              {months.map((month) => {
                const isReference = month.key === referenceMonthKey;
                const cell = person.cells[month.key] ?? emptyAllocationCell(month.key);
                return (
                  <td
                    key={`${person.id}-${month.key}`}
                    className={cn(
                      'border-r border-t p-0 align-middle last:border-r-0 transition-colors group-hover:bg-accent/50',
                      isReference ? 'bg-success-subtle/40' : 'bg-card',
                    )}
                  >
                    {isReference ? (
                      <ReferenceMonthCell cell={cell} month={month} onOpen={() => onOpen(person.id)} />
                    ) : (
                      <MonthCell cell={cell} month={month} onOpen={() => onOpen(person.id)} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectSection({
  project,
  people,
  months,
  referenceMonthKey,
  showManager,
  lensManagerId,
  managerByProject,
  onOpen,
}: {
  project: AllocationProjectOption;
  people: AllocationPerson[];
  months: AllocationMonth[];
  referenceMonthKey: string;
  showManager: boolean;
  lensManagerId: string | null;
  managerByProject: ManagerByProject;
  onOpen: (employeeId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const health = countHealth(people, referenceMonthKey, lensManagerId, managerByProject);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border bg-card shadow-card">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          )}
          <FolderKanban className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{project.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {showManager && project.managerName ? `GP ${project.managerName} · ` : ''}
              {people.length} pessoa{people.length !== 1 ? 's' : ''} no time
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            {health.overloaded > 0 && <HealthChip tone="critical" label="sobrecarregados" value={health.overloaded} />}
            {health.healthy > 0 && <HealthChip tone="healthy" label="no ponto" value={health.healthy} />}
            {health.slack > 0 && <HealthChip tone="idle" label="com folga" value={health.slack} />}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t p-4">
          {people.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Ninguém alocado neste projeto no período.</p>
          ) : (
            <AllocationRowTable people={people} months={months} referenceMonthKey={referenceMonthKey} onOpen={onOpen} />
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function MinhaEquipeAlocacaoPage() {
  const navigate = useNavigate();
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const employeeId = employee?.id;
  const isAdmin = !!employee?.isAdmin;
  const baseDate = useMemo(() => new Date(), []);
  const [view, setView] = useState<ViewMode>(VIEW.people);
  const [managerFilter, setManagerFilter] = useState<string>(ALL_OPTION);
  const [fromOffset, setFromOffset] = useState<number>(DEFAULT_FROM_OFFSET);
  const [toOffset, setToOffset] = useState<number>(DEFAULT_TO_OFFSET);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>(ALL_OPTION);
  const [focusBucket, setFocusBucket] = useState<HealthBucket | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: RANGE_MAX_OFFSET - RANGE_MIN_OFFSET + 1 }, (_, index) => {
        const offset = RANGE_MIN_OFFSET + index;
        const date = addMonths(startOfMonth(baseDate), offset);
        return {
          offset,
          label: format(date, "MMM/yy", { locale: ptBR }).replace('.', ''),
        };
      }),
    [baseDate],
  );

  const { data: holidays = [] } = useHolidays();
  const monthsOverride = useMemo(
    () =>
      buildAllocationMonthsRange(
        addMonths(startOfMonth(baseDate), fromOffset),
        addMonths(startOfMonth(baseDate), Math.max(fromOffset, toOffset)),
        holidays,
        baseDate,
      ),
    [baseDate, fromOffset, toOffset, holidays],
  );

  const { data, isLoading, isError, refetch } = useAllocationGrid({
    tenantId,
    filters: { ...EMPTY_FILTERS },
    offsetStart: fromOffset,
    periodLength: Math.max(1, toOffset - fromOffset + 1),
    baseDate,
    monthsOverride,
  });

  const months = useMemo(() => data?.months ?? [], [data?.months]);
  const referenceMonth =
    months.find((month) => month.year === baseDate.getFullYear() && month.month === baseDate.getMonth() + 1) ?? months[0];
  const referenceMonthKey = referenceMonth?.key ?? '';
  const activeMonthKey = selectedMonthKey ?? referenceMonthKey;
  const activeMonth = months.find((month) => month.key === activeMonthKey) ?? referenceMonth;

  const managerByProject = useMemo(() => buildManagerByProject(data?.projects ?? []), [data?.projects]);

  const myLensId = isAdmin ? (managerFilter !== ALL_OPTION ? managerFilter : null) : (employeeId ?? null);

  // Sem lente (admin vendo todos os GPs) não existe "meus" — a coluna vira "Alocado".
  const lensLabel = useMemo(() => {
    if (!myLensId) return null;
    if (!isAdmin) return 'Meus';
    const selected = (data?.projects ?? []).find((project) => project.managerId === myLensId);
    const firstName = selected?.managerName?.trim().split(/\s+/)[0];
    return firstName ? `Com ${firstName}` : 'Do GP';
  }, [myLensId, isAdmin, data?.projects]);

  const myProjects = useMemo(() => {
    const all = data?.projects ?? [];
    if (isAdmin) {
      return managerFilter === ALL_OPTION ? all : all.filter((project) => project.managerId === managerFilter);
    }
    return all.filter((project) => project.managerId && project.managerId === employeeId);
  }, [data?.projects, isAdmin, managerFilter, employeeId]);

  const managerOptions = useMemo(() => {
    const map = new Map<string, string>();
    (data?.projects ?? []).forEach((project) => {
      if (project.managerId) map.set(project.managerId, project.managerName ?? 'Sem nome');
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [data?.projects]);

  const projectTeams = useMemo(() => {
    const people = data?.people ?? [];
    return myProjects.map((project) => ({
      project,
      people: people
        .filter((person) => personIsInProject(person, project.id, months))
        .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    }));
  }, [data?.people, myProjects, months]);

  const uniquePeople = useMemo(() => {
    const unique = new Map<string, AllocationPerson>();
    projectTeams
      .filter(({ project }) => projectFilter === ALL_OPTION || project.id === projectFilter)
      .forEach(({ people }) => people.forEach((person) => unique.set(person.id, person)));

    const term = normalizeText(search.trim());
    return Array.from(unique.values()).filter((person) => {
      if (term && !normalizeText(person.name).includes(term)) return false;
      return true;
    });
  }, [projectTeams, projectFilter, search]);

  const overallHealth = useMemo(
    () => countHealth(uniquePeople, activeMonthKey, myLensId, managerByProject),
    [uniquePeople, activeMonthKey, myLensId, managerByProject],
  );

  const personRows = useMemo(() => {
    return uniquePeople
      .map((person) => ({
        person,
        breakdown: buildMonthBreakdown(person.cells[activeMonthKey], myLensId ?? undefined, managerByProject),
        bucket: bucketForBreakdown(
          buildMonthBreakdown(person.cells[activeMonthKey], myLensId ?? undefined, managerByProject),
        ),
      }))
      .filter((row) => (focusBucket ? row.bucket === focusBucket : true))
      .sort((a, b) => (b.breakdown.utilization ?? -1) - (a.breakdown.utilization ?? -1));
  }, [uniquePeople, activeMonthKey, myLensId, managerByProject, focusBucket]);

  useEffect(() => {
    if (selectedMonthKey && !months.some((month) => month.key === selectedMonthKey)) {
      setSelectedMonthKey(null);
    }
  }, [months, selectedMonthKey]);

  const activeFilterCount = [
    fromOffset !== DEFAULT_FROM_OFFSET || toOffset !== DEFAULT_TO_OFFSET,
    search.trim().length > 0,
    projectFilter !== ALL_OPTION,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFromOffset(DEFAULT_FROM_OFFSET);
    setToOffset(DEFAULT_TO_OFFSET);
    setSearch('');
    setProjectFilter(ALL_OPTION);
  };

  const openPerson = (id: string) => navigate(`/analises/alocacoes/pessoa/${id}`);
  const toggleBucket = (bucket: HealthBucket) => setFocusBucket((current) => (current === bucket ? null : bucket));

  return (
    <AppLayout title="Meu Time">
      <div className="space-y-4">
        <header className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" aria-hidden />
              <h1 className="text-lg font-semibold text-foreground">
                {isAdmin ? 'Alocação por time' : 'Alocação do meu time'}
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && managerOptions.length > 0 && (
                <Select value={managerFilter} onValueChange={setManagerFilter}>
                  <SelectTrigger className="w-[210px]" aria-label="Filtrar por GP">
                    <SelectValue placeholder="Todos os GPs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_OPTION}>Todos os GPs</SelectItem>
                    {managerOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <ToggleGroup
                type="single"
                value={view}
                onValueChange={(value) => value && setView(value as ViewMode)}
                aria-label="Modo de visualização"
              >
                <ToggleGroupItem value={VIEW.people}>Pessoas</ToggleGroupItem>
                <ToggleGroupItem value={VIEW.projects}>Projetos</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Planejamento de capacidade: quanto de cada pessoa já está comprometido e quanto ainda dá para alocar,
            separando o que é seu do que está com outros GPs — para negociar antes de alocar. Não mostra horas
            lançadas; acompanhamento de lançamento fica na Alocação da Equipe.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1">
              <CalendarRange className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <Select value={String(fromOffset)} onValueChange={(value) => setFromOffset(Number(value))}>
                <SelectTrigger className="h-7 w-[104px] border-0 bg-transparent text-xs shadow-none" aria-label="Mês inicial">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.offset} value={String(option.offset)}>
                      {option.label}
                      {option.offset === 0 ? ' (atual)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">até</span>
              <Select value={String(toOffset)} onValueChange={(value) => setToOffset(Number(value))}>
                <SelectTrigger className="h-7 w-[104px] border-0 bg-transparent text-xs shadow-none" aria-label="Mês final">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions
                    .filter((option) => option.offset >= fromOffset)
                    .map((option) => (
                      <SelectItem key={option.offset} value={String(option.offset)}>
                        {option.label}
                        {option.offset === 0 ? ' (atual)' : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar pessoa"
                aria-label="Buscar pessoa"
                className="h-9 w-[190px] pl-8 text-xs"
              />
            </div>

            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-9 w-[190px] text-xs" aria-label="Filtrar por projeto">
                <SelectValue placeholder="Todos os projetos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_OPTION}>Todos os projetos</SelectItem>
                {myProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFilterCount > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                Limpar filtros ({activeFilterCount})
              </Button>
            )}
          </div>

          {activeMonth && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <HealthChip
                tone="critical"
                label="sobrecarregados"
                value={overallHealth.overloaded}
                active={focusBucket === BUCKET.overloaded}
                onClick={() => toggleBucket(BUCKET.overloaded)}
              />
              <HealthChip
                tone="healthy"
                label="no ponto"
                value={overallHealth.healthy}
                active={focusBucket === BUCKET.healthy}
                onClick={() => toggleBucket(BUCKET.healthy)}
              />
              <HealthChip
                tone="idle"
                label="com folga"
                value={overallHealth.slack}
                active={focusBucket === BUCKET.slack}
                onClick={() => toggleBucket(BUCKET.slack)}
              />
              <span className="text-[11px] text-muted-foreground">em {activeMonth.label}</span>
            </div>
          )}
        </header>

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-3">
              Não foi possível carregar a alocação do time.
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : view === VIEW.people ? (
          uniquePeople.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
              <p className="font-semibold text-foreground">
                {isAdmin ? 'Nenhuma pessoa alocada no recorte atual' : 'Você ainda não é o gerente de nenhum projeto'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isAdmin
                  ? 'Ajuste o filtro de GP ou o período.'
                  : 'Esta visão mostra a alocação dos projetos em que você é o GP responsável.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <ToggleGroup
                type="single"
                value={activeMonthKey}
                onValueChange={(value) => value && setSelectedMonthKey(value)}
                aria-label="Mês analisado"
              >
                {months.map((month) => (
                  <ToggleGroupItem key={month.key} value={month.key} className="text-xs">
                    {month.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>

              <PeopleCapacityTable
                rows={personRows}
                lensLabel={lensLabel}
                expandedPersonId={expandedPersonId}
                onToggleExpand={(personId) =>
                  setExpandedPersonId((current) => (current === personId ? null : personId))
                }
                onOpen={openPerson}
                temporal={{ tenantId, year: baseDate.getFullYear(), currentMonthNumber: baseDate.getMonth() + 1, lensManagerId: myLensId, managerByProject }}
              />

              <CapacityLegend lensLabel={lensLabel} />
            </div>
          )
        ) : myProjects.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
            <p className="font-semibold text-foreground">
              {isAdmin ? 'Nenhum projeto para exibir' : 'Você ainda não é o gerente de nenhum projeto'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin ? 'Ajuste o filtro de GP.' : 'Esta visão mostra os projetos em que você é o GP responsável.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {projectTeams.map(({ project, people }) => (
              <ProjectSection
                key={project.id}
                project={project}
                people={people}
                months={months}
                referenceMonthKey={referenceMonthKey}
                showManager={isAdmin}
                lensManagerId={myLensId}
                managerByProject={managerByProject}
                onOpen={openPerson}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
