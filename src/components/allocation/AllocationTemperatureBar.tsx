import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AllocationMonth, AllocationPerson, AllocationStatusFilter } from '@/types/allocation';
import { getUtilizationStatus, UtilizationStatus } from '@/lib/utilization';
import { getRhythm, proRataFraction } from '@/lib/allocationSeverity';

// Segmentos na ordem do handoff: sobrecarga · cheio · saudável · subalocado.
const SEGMENTS: { status: UtilizationStatus; bg: string; filter: AllocationStatusFilter }[] = [
  { status: 'sobrecarga', bg: 'bg-destructive', filter: 'overloaded' },
  { status: 'cheio', bg: 'bg-warning', filter: 'all' },
  { status: 'saudavel', bg: 'bg-primary-deep', filter: 'all' },
  { status: 'subalocado', bg: 'bg-info', filter: 'unallocated' },
];

interface AllocationTemperatureBarProps {
  people: AllocationPerson[];
  referenceMonth: AllocationMonth | undefined;
  isLoading: boolean;
  activeFilter: AllocationStatusFilter;
  onStatusSelect: (status: AllocationStatusFilter) => void;
}

export function AllocationTemperatureBar({
  people,
  referenceMonth,
  isLoading,
  activeFilter,
  onStatusSelect,
}: AllocationTemperatureBarProps) {
  const stats = useMemo(() => {
    const counts: Record<UtilizationStatus, number> = { sobrecarga: 0, cheio: 0, saudavel: 0, subalocado: 0 };
    let totalPlanned = 0;
    let totalCapacity = 0;
    let semLancamento = 0;
    let atrasRitmo = 0;

    if (referenceMonth) {
      const fraction = proRataFraction(referenceMonth);
      people.forEach((person) => {
        const cell = person.cells[referenceMonth.key];
        if (!cell) return;
        const planned = Number(cell.plannedHours || 0);
        const capacity = Number(cell.capacityHours || 0);
        counts[getUtilizationStatus(planned, capacity).status] += 1;
        totalPlanned += planned;
        totalCapacity += capacity;
        const realized = Number(cell.actualProjectHours || 0) + Number(cell.internalHours || 0);
        const rhythm = getRhythm(realized, planned, fraction);
        if (rhythm.state === 'sem_lancamento') semLancamento += 1;
        else if (rhythm.state === 'atrasado') atrasRitmo += 1;
      });
    }

    const total = counts.sobrecarga + counts.cheio + counts.saudavel + counts.subalocado;
    const aggregatePercent = totalCapacity > 0 ? Math.round((totalPlanned / totalCapacity) * 100) : 0;
    return { counts, total, totalPlanned, totalCapacity, aggregatePercent, semLancamento, atrasRitmo };
  }, [people, referenceMonth]);

  if (isLoading) {
    return <Skeleton className="h-[68px] w-full rounded-lg" />;
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 shadow-card lg:flex-row lg:items-center lg:gap-4">
      <span className="ol-label shrink-0 text-muted-foreground">
        Temperatura{referenceMonth ? ` · ${referenceMonth.label}` : ''}
      </span>

      {/* Barra segmentada proporcional */}
      <div className="flex h-7 min-w-0 flex-1 overflow-hidden rounded-full">
        {stats.total === 0 ? (
          <div className="flex-1 bg-muted" />
        ) : (
          SEGMENTS.map((seg) => {
            const count = stats.counts[seg.status];
            if (count === 0) return null;
            const isActive =
              (seg.filter === 'overloaded' && activeFilter === 'overloaded') ||
              (seg.filter === 'unallocated' && activeFilter === 'unallocated');
            const clickable = seg.filter !== 'all';
            return (
              <button
                key={seg.status}
                type="button"
                disabled={!clickable}
                onClick={clickable ? () => onStatusSelect(activeFilter === seg.filter ? 'all' : seg.filter) : undefined}
                style={{ flexGrow: count }}
                className={cn(
                  'flex min-w-[36px] items-center justify-center text-xs font-semibold tabular-nums text-white transition-opacity',
                  seg.bg,
                  clickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default',
                  activeFilter !== 'all' && !isActive && clickable ? 'opacity-45' : 'opacity-100',
                )}
                title={`${count} ${seg.status}`}
              >
                {count}
              </button>
            );
          })
        )}
      </div>

      {/* Chips-resumo + agregado */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {stats.semLancamento > 0 && (
          <span className="rounded-full border border-destructive/30 px-2.5 py-1 text-xs font-medium text-destructive">
            {stats.semLancamento} sem lançamento
          </span>
        )}
        {stats.atrasRitmo > 0 && (
          <span className="rounded-full border border-warning/30 px-2.5 py-1 text-xs font-medium text-warning">
            {stats.atrasRitmo} com lançamento atrasado
          </span>
        )}
        <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
          {stats.aggregatePercent}% · {Math.round(stats.totalPlanned)}h/{Math.round(stats.totalCapacity)}h
        </span>
      </div>
    </div>
  );
}
