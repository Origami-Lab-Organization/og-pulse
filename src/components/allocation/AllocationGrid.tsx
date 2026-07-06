import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { getAllocationStatusClasses } from '@/lib/allocationGrid';
import { EmployeeAllocationPanel } from '@/components/allocation/EmployeeAllocationPanel';
import { AllocationCell, AllocationMonth, AllocationPerson, AllocationProjectOption, AllocationStatusKey } from '@/types/allocation';

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

// Mirrors allocationService.isFutureMonth: only months AFTER the current one
// are "planejado". The current month already reflects realized hours, since
// that's what cell.totalHours/utilization are computed from server-side.
function isFutureMonth(monthKey: string) {
  return monthKey > currentMonthKey();
}

function monthHeaderSubtitle(monthKey: string) {
  return isFutureMonth(monthKey) ? '% alocação · planejado / cap.' : '% alocação · realizado / cap.';
}

function AllocationGridSkeleton({ months }: { months: AllocationMonth[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
      <table className="w-full min-w-[900px] table-fixed border-collapse">
        <thead>
          <tr>
            <th className="w-[200px] border-b border-r bg-muted p-3 text-left">
              <Skeleton className="h-4 w-20" />
            </th>
            {Array.from({ length: Math.max(months.length, 1) }, (_, index) => (
              <th key={index} className="border-b border-r bg-muted p-3 text-left last:border-r-0">
                <Skeleton className="h-4 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, row) => (
            <tr key={row}>
              <td className="border-r border-t p-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </td>
              {Array.from({ length: Math.max(months.length, 1) }, (_, column) => (
                <td key={`${row}-${column}`} className="border-r border-t p-3 last:border-r-0">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-3.5 w-10" />
                    <Skeleton className="h-3 w-10" />
                    <Skeleton className="ml-auto h-3 w-8" />
                  </div>
                </td>
              ))}
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
        Página {page} de {pageCount} — {total} funcionário{total !== 1 ? 's' : ''}
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
      className="flex min-h-[48px] w-full items-center gap-2.5 p-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
          {initials(person.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground leading-tight">{person.name}</p>
        <p className="truncate text-[11px] text-muted-foreground leading-tight">{person.role}</p>
        {person.terminationDate && (
          <Badge variant="secondary" className="mt-0.5 rounded-full text-[10px]">Desligado</Badge>
        )}
      </div>
    </button>
  );
}

function MonthCell({
  cell,
  month,
  onOpen,
}: {
  cell: AllocationCell;
  month: AllocationMonth;
  onOpen: () => void;
}) {
  const isFuture = isFutureMonth(month.key);
  // cell.totalHours is exactly the numerator used to compute cell.utilization
  // (planejado for future months, realizado for current/past) — using it here
  // guarantees the hours shown and the % shown always agree.
  const hours = Number(cell.totalHours || 0);
  const statusClasses = getAllocationStatusClasses(cell.status);
  const utilizationLabel = cell.utilization === null ? '—' : `${cell.utilization}%`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-[48px] w-full flex-col items-start justify-center gap-0.5 p-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none"
        >
          <span className={cn('font-mono text-base font-bold leading-none tabular-nums', statusClasses.text)}>
            {utilizationLabel}
          </span>
          <span className="font-mono text-[11px] leading-none tabular-nums text-muted-foreground">
            {formatHours(hours)} / {formatHours(cell.capacityHours)}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {isFuture ? 'Planejado' : 'Realizado'}: {formatHours(hours)} de {formatHours(cell.capacityHours)} de capacidade
          {' '}— {utilizationLabel} de alocação no mês
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function AllocationLegend() {
  const items: Array<{ label: string; key: AllocationStatusKey }> = [
    { label: 'Saudável 70–100%', key: 'healthy' },
    { label: 'Ocioso < 70%', key: 'idle' },
    { label: 'Desalocado < 40%', key: 'unallocated' },
    { label: 'Limite 100–115%', key: 'limit' },
    { label: 'Sobrecarga > 115%', key: 'critical' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground">
      <span className="ol-label text-muted-foreground">Utilização</span>
      {items.map((item) => {
        const classes = getAllocationStatusClasses(item.key);
        return (
          <span key={item.key} className="inline-flex items-center gap-1.5">
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
        <table className="w-full min-w-[900px] table-fixed border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 w-[200px] border-b border-r bg-muted p-3 text-left">
                <span className="ol-label text-muted-foreground">Pessoa</span>
              </th>
              {months.map((month) => {
                const isReference = month.key === referenceMonthKey;
                return (
                  <th key={month.key} className="w-[160px] border-b border-r bg-muted p-3 text-left last:border-r-0">
                    <span className="block text-sm font-semibold uppercase tracking-normal text-foreground">
                      {month.label}
                      {isReference && (
                        <span className="ml-1.5 text-[10px] font-semibold normal-case text-primary-deep">hoje</span>
                      )}
                      <span className="ml-1 text-[11px] font-normal normal-case text-muted-foreground">
                        · {month.workingDays}d
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      {monthHeaderSubtitle(month.key)}
                    </span>
                  </th>
                );
              })}
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

                  return (
                    <td key={`${person.id}-${month.key}`} className="border-r border-t bg-card p-0 align-middle last:border-r-0 transition-colors group-hover:bg-accent/50">
                      <MonthCell cell={cell} month={month} onOpen={() => openPerson(person.id, month.key)} />
                    </td>
                  );
                })}
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
