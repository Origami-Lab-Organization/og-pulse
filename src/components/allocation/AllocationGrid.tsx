import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  getAllocationStatusClasses,
  getAllocationStatusLabel,
  getLoggedHours,
  getPlanVariance,
} from '@/lib/allocationGrid';
import { EmployeeAllocationPanel } from '@/components/allocation/EmployeeAllocationPanel';
import { AllocationCell, AllocationMonth, AllocationPerson, AllocationProjectOption, AllocationProjectPill } from '@/types/allocation';

interface AllocationGridProps {
  tenantId: string | undefined;
  months: AllocationMonth[];
  people: AllocationPerson[];
  referenceMonthKey: string;
  projectIdFilter: string;
  projectOptions: AllocationProjectOption[];
  roleOptions: string[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  total: number;
  emptyMessage: string;
  onPageChange: (page: number) => void;
  onEmployeeOpen: (employeeId: string) => void;
}

type AdherenceTone = 'onTrack' | 'under' | 'over' | 'missing' | 'unplanned' | 'neutral';

const comparisonWidthClasses = [
  'w-0',
  'w-[10%]',
  'w-[20%]',
  'w-[30%]',
  'w-[40%]',
  'w-[50%]',
  'w-[60%]',
  'w-[70%]',
  'w-[80%]',
  'w-[90%]',
  'w-full',
];

function comparisonWidthClass(percent: number | null) {
  if (percent === null || percent <= 0) return comparisonWidthClasses[0];
  const bucket = Math.max(0, Math.min(10, Math.ceil(Math.min(percent, 100) / 10)));
  return comparisonWidthClasses[bucket];
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

function formatSignedHours(value: number) {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}h`;
  return `${rounded}h`;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthModeLabel(monthKey: string) {
  const currentKey = currentMonthKey();
  if (monthKey === currentKey) return 'mês atual';
  if (monthKey > currentKey) return 'planejado';
  return 'realizado';
}

function getAdherenceInfo(cell: AllocationCell) {
  const plannedHours = Number(cell.plannedHours || 0);
  const loggedHours = getLoggedHours(cell);

  if (plannedHours <= 0 && loggedHours <= 0) {
    return { percent: null, label: 'Sem movimento', tone: 'neutral' as AdherenceTone };
  }

  if (plannedHours <= 0) {
    return { percent: null, label: 'Lançado sem plano', tone: 'unplanned' as AdherenceTone };
  }

  const percent = Math.round((loggedHours / plannedHours) * 100);

  if (loggedHours === 0) return { percent, label: 'Sem lançamento', tone: 'missing' as AdherenceTone };
  if (percent < 90) return { percent, label: 'Abaixo do plano', tone: 'under' as AdherenceTone };
  if (percent <= 110) return { percent, label: 'Dentro do plano', tone: 'onTrack' as AdherenceTone };
  return { percent, label: 'Acima do plano', tone: 'over' as AdherenceTone };
}

function adherenceClasses(tone: AdherenceTone) {
  const classes: Record<AdherenceTone, { bar: string; soft: string; text: string; dot: string }> = {
    onTrack: {
      bar: 'bg-success',
      soft: 'bg-success/10 text-success',
      text: 'text-success',
      dot: 'bg-success',
    },
    under: {
      bar: 'bg-warning',
      soft: 'bg-warning/10 text-warning',
      text: 'text-warning',
      dot: 'bg-warning',
    },
    over: {
      bar: 'bg-destructive',
      soft: 'bg-destructive/10 text-destructive',
      text: 'text-destructive',
      dot: 'bg-destructive',
    },
    missing: {
      bar: 'bg-destructive',
      soft: 'bg-destructive/10 text-destructive',
      text: 'text-destructive',
      dot: 'bg-destructive',
    },
    unplanned: {
      bar: 'bg-warning',
      soft: 'bg-warning/10 text-warning',
      text: 'text-warning',
      dot: 'bg-warning',
    },
    neutral: {
      bar: 'bg-muted-foreground',
      soft: 'bg-muted text-muted-foreground',
      text: 'text-muted-foreground',
      dot: 'bg-muted-foreground',
    },
  };

  return classes[tone];
}

function StatusBadge({
  label,
  tone,
  compact = false,
}: {
  label: string;
  tone: AdherenceTone;
  compact?: boolean;
}) {
  const classes = adherenceClasses(tone);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold leading-none',
        compact ? 'px-2 py-1 text-[10px]' : 'px-2.5 py-1.5 text-[11px]',
        classes.soft,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', classes.dot)} />
      {label}
    </span>
  );
}

function AllocationGridSkeleton({ months }: { months: AllocationMonth[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
      <table className="w-full min-w-[1120px] table-fixed border-collapse">
        <thead>
          <tr>
            <th className="w-[220px] border-b border-r bg-muted p-4 text-left">
              <Skeleton className="h-4 w-20" />
            </th>
            {Array.from({ length: Math.max(months.length, 1) }, (_, index) => (
              <th key={index} className="border-b border-r bg-muted p-4 text-left last:border-r-0">
                <Skeleton className="h-4 w-24" />
              </th>
            ))}
            <th className="w-12 border-b bg-muted p-4" />
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, row) => (
            <tr key={row}>
              <td className="border-r border-t p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </td>
              {Array.from({ length: Math.max(months.length, 1) }, (_, column) => (
                <td key={`${row}-${column}`} className="border-r border-t p-4 last:border-r-0">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="mt-3 h-2 w-full" />
                  <Skeleton className="mt-3 h-4 w-20" />
                </td>
              ))}
              <td className="border-t p-4">
                <Skeleton className="h-5 w-5 rounded-full" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AllocationPaginationFooter({
  page,
  pageCount,
  total,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (pageCount <= 1) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-card sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Página {page} de {pageCount} - {total} funcionário{total !== 1 ? 's' : ''}
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PersonButton({
  person,
  onOpen,
}: {
  person: AllocationPerson;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-[72px] w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Avatar className="h-9 w-9">
        <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
          {initials(person.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{person.name}</p>
        <p className="truncate text-xs text-muted-foreground">{person.role}</p>
        {person.terminationDate && (
          <Badge variant="secondary" className="mt-1 rounded-full text-[10px]">Desligado</Badge>
        )}
      </div>
    </button>
  );
}

function DetailButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onOpen}
      className="h-8 w-8 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
      aria-label="Abrir detalhe"
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  );
}

function ProjectCountButton({
  projects,
  onOpen,
}: {
  projects: AllocationProjectPill[];
  onOpen: () => void;
}) {
  if (projects.length === 0) {
    return <span className="text-[11px] text-muted-foreground">sem projetos</span>;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-[11px] font-medium text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {projects.length} projeto{projects.length !== 1 ? 's' : ''}
    </button>
  );
}

function varianceLabel(variance: number) {
  if (variance > 0) return `${formatSignedHours(variance)} acima`;
  if (variance < 0) return `${formatSignedHours(variance)} livre`;
  return 'no plano';
}

function ExpandedMonthCell({
  cell,
  onOpen,
}: {
  cell: AllocationCell;
  onOpen: () => void;
}) {
  const loggedHours = getLoggedHours(cell);
  const variance = getPlanVariance(cell);
  const adherence = getAdherenceInfo(cell);
  const classes = adherenceClasses(adherence.tone);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="min-h-[96px] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-mono text-lg font-semibold leading-none tabular-nums text-foreground">
                  {formatHours(loggedHours)}
                </span>
                <span className="text-[11px] text-muted-foreground">lançado</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  / {formatHours(cell.plannedHours)} plan. · {formatHours(cell.capacityHours)} cap.
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                projetos {formatHours(cell.actualProjectHours)} · internas {formatHours(cell.internalHours)}
              </p>
            </div>
            <span className={cn('rounded-full px-2 py-1 font-mono text-[11px] font-semibold leading-none tabular-nums', classes.soft)}>
              {adherence.percent === null ? '—' : `${adherence.percent}%`}
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full', classes.bar, comparisonWidthClass(adherence.percent))} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge label={adherence.label} tone={adherence.tone} compact />
            <ProjectCountButton projects={cell.projects} onOpen={onOpen} />
            <span className={cn('text-[11px] font-semibold', classes.text)}>{varianceLabel(variance)}</span>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          Planejado: {formatHours(cell.plannedHours)} · Lançado: {formatHours(loggedHours)} · Capacidade: {formatHours(cell.capacityHours)}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function CompactMonthCell({
  cell,
  month,
}: {
  cell: AllocationCell;
  month: AllocationMonth;
}) {
  const isFuture = month.key > currentMonthKey();
  const visibleHours = isFuture ? Number(cell.plannedHours || 0) : getLoggedHours(cell);
  const capacityClasses = getAllocationStatusClasses(cell.status);
  const utilizationLabel = cell.utilization === null ? '—' : `${cell.utilization}%`;
  const statusLabel = Number(cell.plannedHours || 0) <= 0 && visibleHours === 0
    ? 'SEM PLANO'
    : getAllocationStatusLabel(cell.status);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="min-h-[96px] p-4">
          <div className="flex items-start gap-2">
            <span className={cn('mt-1.5 h-2 w-2 rounded-full', capacityClasses.dot)} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                <span className="font-mono text-sm font-semibold tabular-nums text-foreground">{formatHours(visibleHours)}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">/ {formatHours(cell.capacityHours)}</span>
              </div>
              <p className={cn('mt-1 text-[10px] font-semibold uppercase leading-tight', capacityClasses.text)}>
                {statusLabel} <span className="font-mono font-normal tabular-nums">{utilizationLabel}</span>
              </p>
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {isFuture ? 'Planejado' : 'Lançado'}: {formatHours(visibleHours)} · Capacidade: {formatHours(cell.capacityHours)}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function AllocationLegend() {
  const items: Array<{ label: string; tone: AdherenceTone }> = [
    { label: 'Dentro do plano 90-110%', tone: 'onTrack' },
    { label: 'Abaixo do plano', tone: 'under' },
    { label: 'Acima do plano', tone: 'over' },
    { label: 'Sem lançamento', tone: 'missing' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
      <span className="ol-label text-muted-foreground">Status</span>
      {items.map((item) => {
        const classes = adherenceClasses(item.tone);
        return (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', classes.dot)} />
            {item.label}
          </span>
        );
      })}
    </div>
  );
}

export function AllocationGrid({
  tenantId,
  months,
  people,
  referenceMonthKey,
  projectIdFilter,
  projectOptions,
  roleOptions,
  isLoading,
  page,
  pageSize,
  total,
  emptyMessage,
  onPageChange,
  onEmployeeOpen,
}: AllocationGridProps) {
  const pageCount = Math.ceil(total / pageSize);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(referenceMonthKey || months[0]?.key || '');
  const selectedPerson = useMemo(
    () => people.find((person) => person.id === selectedEmployeeId) ?? null,
    [people, selectedEmployeeId],
  );

  const openPerson = (employeeId: string, monthKey = referenceMonthKey || months[0]?.key || '') => {
    setSelectedEmployeeId(employeeId);
    setSelectedMonthKey(monthKey);
    onEmployeeOpen(employeeId);
  };

  if (isLoading) return <AllocationGridSkeleton months={months} />;

  if (people.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
        <p className="font-semibold text-foreground">{emptyMessage}</p>
        <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou o período para ampliar a análise.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
        <table className="w-full min-w-[1120px] table-fixed border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-[220px] border-b border-r bg-muted p-4 text-left">
                <span className="ol-label text-muted-foreground">Pessoa</span>
              </th>
              {months.map((month) => {
                const isReference = month.key === referenceMonthKey;
                return (
                  <th
                    key={month.key}
                    className={cn(
                      'border-b border-r bg-muted p-4 text-left last:border-r-0',
                      isReference ? 'w-[360px]' : 'w-[190px]',
                    )}
                  >
                    <span className="block text-sm font-semibold uppercase tracking-normal text-foreground">
                      {month.label}
                      <span className="ml-1 text-[11px] font-normal normal-case text-muted-foreground">
                        · {month.workingDays}d
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {monthModeLabel(month.key)}
                      {isReference ? ' · planejado / realizado' : ' / capacidade'}
                    </span>
                  </th>
                );
              })}
              <th className="w-12 border-b bg-muted" />
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id} className="group">
                <td className="sticky left-0 z-10 border-r border-t bg-card p-0 transition-colors group-hover:bg-accent/60">
                  <PersonButton person={person} onOpen={() => openPerson(person.id)} />
                </td>

                {months.map((month) => {
                  const cell = person.cells[month.key];
                  const isReference = month.key === referenceMonthKey;

                  return (
                    <td key={`${person.id}-${month.key}`} className="border-r border-t bg-card p-0 align-top transition-colors last:border-r-0 group-hover:bg-accent/50">
                      {isReference ? (
                        <ExpandedMonthCell cell={cell} onOpen={() => openPerson(person.id, month.key)} />
                      ) : (
                        <CompactMonthCell cell={cell} month={month} />
                      )}
                    </td>
                  );
                })}

                <td className="border-t bg-card p-2 text-center align-middle transition-colors group-hover:bg-accent/50">
                  <DetailButton onOpen={() => openPerson(person.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AllocationLegend />

      <AllocationPaginationFooter
        page={page}
        pageCount={pageCount}
        total={total}
        onPageChange={onPageChange}
      />

      <EmployeeAllocationPanel
        open={Boolean(selectedEmployeeId)}
        onOpenChange={(open) => !open && setSelectedEmployeeId(null)}
        tenantId={tenantId}
        employee={selectedPerson}
        months={months}
        monthKey={selectedMonthKey}
        projectIdFilter={projectIdFilter}
        projectOptions={projectOptions}
        roleOptions={roleOptions}
      />
    </div>
  );
}
