import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { EmployeeAllocationPanel } from '@/components/allocation/EmployeeAllocationPanel';
import { getUtilizationStatus, UTILIZATION_GROUP_ORDER, UTILIZATION_META, UtilizationStatus } from '@/lib/utilization';
import { cellUtilization, getRhythm, proRataFraction } from '@/lib/allocationSeverity';
import { AllocationCell, AllocationMonth, AllocationPerson, AllocationProjectOption } from '@/types/allocation';

export type GridDensity = 'compact' | 'comfortable';

interface AllocationGridProps {
  tenantId: string | undefined;
  months: AllocationMonth[];
  people: AllocationPerson[];
  footerPeople: AllocationPerson[];
  referenceMonthKey: string;
  projectIdFilter: string;
  projectOptions: AllocationProjectOption[];
  roleOptions: string[];
  isLoading: boolean;
  density: GridDensity;
  page: number;
  pageSize: number;
  total: number;
  emptyMessage: string;
  onPageChange: (page: number) => void;
  onEmployeeOpen: (employeeId: string) => void;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

function signedHours(value: number) {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}h`;
  return `${rounded}h`;
}

function AllocationGridSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-card">
      {Array.from({ length: 6 }, (_, row) => (
        <div key={row} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Célula do mês vigente: chip de % + mini-barra pró-rata + lançado/desvio + nº projetos. */
function CurrentMonthCell({ cell, month, onOpen }: { cell: AllocationCell; month: AllocationMonth; onOpen: () => void }) {
  const planned = Number(cell.plannedHours || 0);
  const capacity = Number(cell.capacityHours || 0);
  const realized = Number(cell.actualProjectHours || 0) + Number(cell.internalHours || 0);
  const util = getUtilizationStatus(planned, capacity);
  const meta = UTILIZATION_META[util.status];
  const fraction = proRataFraction(month);
  const rhythm = getRhythm(realized, planned, fraction);

  const fillPct = planned > 0 ? Math.min(100, (realized / planned) * 100) : realized > 0 ? 100 : 0;
  const markerPct = Math.min(100, fraction * 100);

  // Ritmo é secundário: rótulo curto na célula, texto completo no tooltip da barra.
  const rhythmText =
    rhythm.state === 'sem_lancamento'
      ? 'sem lançamento'
      : rhythm.state === 'atrasado'
        ? `atrasado · faltam ${Math.round(Math.abs(rhythm.deviationHours))}h`
        : 'em dia';
  const rhythmTone = rhythm.state === 'em_dia' ? 'text-muted-foreground' : 'text-destructive';

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <span className={cn('shrink-0 rounded-md px-2 py-0.5 font-mono text-[12.5px] font-semibold tabular-nums', meta.bg, meta.text)}>
        {util.percent === 0 && planned === 0 && capacity === 0 ? '—' : `${Math.round(util.percent)}%`}
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <span className="relative hidden h-[5px] w-[70px] shrink-0 overflow-visible rounded-full bg-muted sm:block">
            <span className={cn('absolute inset-y-0 left-0 rounded-full', meta.dot)} style={{ width: `${fillPct}%` }} />
            <span className="absolute inset-y-[-2px] w-[1.5px] bg-foreground" style={{ left: `${markerPct}%` }} />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Esperado até hoje: {Math.round(rhythm.expectedHours)}h · lançado: {Math.round(realized)}h
        </TooltipContent>
      </Tooltip>

      <span className="min-w-0 flex-1 truncate font-mono text-[11px] tabular-nums">
        <span className="text-foreground">{Math.round(realized)}h</span>
        <span className={cn('ml-1', rhythmTone)}>· {rhythmText}</span>
      </span>

      <button
        type="button"
        onClick={onOpen}
        className="shrink-0 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        {cell.projects.length} proj
      </button>
    </div>
  );
}

/** Célula de mês futuro: heatmap com horas livres protagonistas. */
function FutureMonthCell({ cell }: { cell: AllocationCell }) {
  const planned = Number(cell.plannedHours || 0);
  const capacity = Number(cell.capacityHours || 0);
  const util = getUtilizationStatus(planned, capacity);
  const meta = UTILIZATION_META[util.status];
  const freeHours = capacity - planned;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('mx-2 flex items-center justify-center gap-1.5 rounded-md px-2 py-2', meta.bg)}>
          <span className={cn('font-mono text-[13.5px] font-semibold tabular-nums', meta.text)}>
            {capacity === 0 && planned === 0 ? '—' : signedHours(freeHours)}
          </span>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {capacity > 0 ? `${Math.round(util.percent)}%` : ''}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        Planejado {Math.round(planned)}h de {Math.round(capacity)}h de capacidade
      </TooltipContent>
    </Tooltip>
  );
}

export function AllocationGrid({
  tenantId,
  months,
  people,
  footerPeople,
  referenceMonthKey,
  projectIdFilter,
  projectOptions,
  roleOptions,
  isLoading,
  density,
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
  const selectedPerson = useMemo(() => people.find((p) => p.id === selectedEmployeeId) ?? null, [people, selectedEmployeeId]);

  const referenceMonth = useMemo(
    () => months.find((m) => m.key === referenceMonthKey) ?? months[0],
    [months, referenceMonthKey],
  );

  // Agrupa estritamente por STATUS DE UTILIZAÇÃO do mês vigente (único eixo
  // estrutural). Ritmo de lançamento nunca agrupa.
  const groups = useMemo(() => {
    const buckets: Record<UtilizationStatus, AllocationPerson[]> = {
      sobrecarga: [], subalocado: [], cheio: [], saudavel: [],
    };
    if (!referenceMonth) return buckets;
    people.forEach((person) => {
      const cell = person.cells[referenceMonth.key];
      const status = cell ? cellUtilization(cell) : 'saudavel';
      buckets[status].push(person);
    });
    return buckets;
  }, [people, referenceMonth]);

  const footerByMonth = useMemo(() => {
    return months.map((month) => {
      let plan = 0;
      let cap = 0;
      footerPeople.forEach((person) => {
        const cell = person.cells[month.key];
        if (!cell) return;
        plan += Number(cell.plannedHours || 0);
        cap += Number(cell.capacityHours || 0);
      });
      return { key: month.key, plan, cap, percent: cap > 0 ? Math.round((plan / cap) * 100) : 0 };
    });
  }, [months, footerPeople]);

  const openPerson = (employeeId: string, monthKey = referenceMonthKey || months[0]?.key || '') => {
    setSelectedEmployeeId(employeeId);
    setSelectedMonthKey(monthKey);
    onEmployeeOpen(employeeId);
  };

  const rowHeight = density === 'compact' ? 'min-h-[54px]' : 'min-h-[68px]';
  // grid: pessoa | colunas de mês | chevron
  const gridCols = `250px repeat(${months.length}, minmax(150px, 1fr)) 32px`;

  if (isLoading) return <AllocationGridSkeleton />;

  if (people.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
        <p className="font-semibold text-foreground">{emptyMessage}</p>
        <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou o período para ampliar a análise.</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border bg-card shadow-card">
        <div className="min-w-[900px]">
          {/* Cabeçalho */}
          <div className="grid items-end border-b bg-muted" style={{ gridTemplateColumns: gridCols }}>
            <div className="sticky left-0 z-20 bg-muted p-3">
              <span className="ol-label text-muted-foreground">Pessoa</span>
            </div>
            {months.map((month) => {
              const isReference = month.key === referenceMonthKey;
              return (
                <div key={month.key} className="p-3">
                  <span className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-normal text-foreground">
                    {month.label}
                    <span className="text-[11px] font-normal normal-case text-muted-foreground">· {month.workingDays}d</span>
                    {isReference && (
                      <Badge variant="outline" className="border-transparent bg-primary-deep/10 px-1.5 py-0 text-[10px] font-semibold normal-case text-primary-deep">
                        vigente
                      </Badge>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[11px] normal-case text-muted-foreground">
                    {isReference ? 'carga · lançado' : 'plan / capacidade'}
                  </span>
                </div>
              );
            })}
            <div className="p-3" />
          </div>

          {/* Grupos por status de utilização (Sobrecarga → Subalocado → Cheio → Saudável) */}
          {UTILIZATION_GROUP_ORDER.map((status) => {
            const bucket = groups[status];
            if (bucket.length === 0) return null;
            const meta = UTILIZATION_META[status];
            return (
              <div key={status}>
                <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-1.5">
                  <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
                  <span className="ol-label text-muted-foreground">{meta.label} · {bucket.length}</span>
                </div>

                {bucket.map((person) => (
                  <div
                    key={person.id}
                    className={cn('group grid items-stretch border-b border-l-[3px] last:border-b-0', rowHeight, meta.rail)}
                    style={{ gridTemplateColumns: gridCols }}
                  >
                    {/* Pessoa (sticky) */}
                    <button
                      type="button"
                      onClick={() => openPerson(person.id)}
                      className="sticky left-0 z-10 flex items-center gap-2.5 bg-card p-3 text-left transition-colors group-hover:bg-accent/50"
                    >
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">
                          {initials(person.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-tight text-foreground">{person.name}</p>
                        <p className="truncate text-[11px] leading-tight text-muted-foreground">{person.role}</p>
                        {person.terminationDate && (
                          <Badge variant="secondary" className="mt-0.5 rounded-full text-[10px]">Desligado</Badge>
                        )}
                      </div>
                    </button>

                    {/* Meses */}
                    {months.map((month) => {
                      const cell = person.cells[month.key];
                      const isReference = month.key === referenceMonthKey;
                      return (
                        <div key={`${person.id}-${month.key}`} className="flex items-center bg-card transition-colors group-hover:bg-accent/40">
                          {cell ? (
                            isReference ? (
                              <div className="w-full">
                                <CurrentMonthCell cell={cell} month={month} onOpen={() => openPerson(person.id, month.key)} />
                              </div>
                            ) : (
                              <div className="w-full">
                                <FutureMonthCell cell={cell} />
                              </div>
                            )
                          ) : null}
                        </div>
                      );
                    })}

                    {/* Chevron → drawer */}
                    <button
                      type="button"
                      onClick={() => openPerson(person.id)}
                      aria-label={`Abrir detalhe de ${person.name}`}
                      className="flex items-center justify-center bg-card text-muted-foreground transition-colors group-hover:bg-accent/40 hover:text-foreground"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Rodapé — Σ do tenant por mês */}
          <div className="grid items-center border-t-2 bg-muted/40" style={{ gridTemplateColumns: gridCols }}>
            <div className="sticky left-0 z-10 bg-muted/40 p-3">
              <span className="text-xs font-semibold text-foreground">Total</span>
            </div>
            {footerByMonth.map((f) => (
              <div key={f.key} className="p-3 text-center font-mono text-[11px] tabular-nums text-foreground">
                {Math.round(f.plan)}h / {Math.round(f.cap)}h
                <span className="ml-1 text-muted-foreground">· {f.percent}%</span>
              </div>
            ))}
            <div className="p-3" />
          </div>
        </div>
      </div>

      {pageCount > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 shadow-card sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Página {page} de {pageCount} — {total} funcionário{total !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
              Próxima <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {selectedPerson && (
        <EmployeeAllocationPanel
          open
          onOpenChange={(open) => !open && setSelectedEmployeeId(null)}
          tenantId={tenantId}
          employee={selectedPerson}
          months={months}
          monthKey={selectedMonthKey}
          projectIdFilter={projectIdFilter}
          projectOptions={projectOptions}
          roleOptions={roleOptions}
        />
      )}
    </div>
    </TooltipProvider>
  );
}
