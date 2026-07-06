import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AllocationMetrics, AllocationStatusFilter } from '@/types/allocation';

interface AllocationMetricsBarProps {
  metrics: AllocationMetrics;
  isLoading: boolean;
  activeFilter: AllocationStatusFilter;
  onStatusSelect: (status: AllocationStatusFilter) => void;
}

const CELL_BASE =
  'relative flex-1 min-w-0 px-5 py-4 border-r last:border-r-0 text-left transition-[background] duration-150';

function Dot({ className }: { className: string }) {
  return <span className={cn('absolute top-3 right-3 h-2 w-2 rounded-full', className)} />;
}

function MetricCell({
  label,
  value,
  subtitle,
  dotClass,
  clickable,
  active,
  onClick,
  isLoading,
}: {
  label: string;
  value: string;
  subtitle?: string;
  dotClass?: string;
  clickable?: boolean;
  active?: boolean;
  onClick?: () => void;
  isLoading: boolean;
}) {
  const Tag = clickable ? 'button' : 'div';
  return (
    <Tag
      type={clickable ? 'button' : undefined}
      onClick={clickable ? onClick : undefined}
      className={cn(
        CELL_BASE,
        clickable && 'hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        active && 'bg-accent/60',
      )}
    >
      {dotClass && <Dot className={dotClass} />}
      <p className="ol-label text-muted-foreground truncate pr-4">{label}</p>
      {isLoading ? (
        <div className="mt-1 space-y-1.5">
          <Skeleton className="h-7 w-16" />
          {subtitle !== undefined && <Skeleton className="h-3 w-20" />}
        </div>
      ) : (
        <>
          <p className="font-mono text-[1.75rem] font-semibold leading-none tabular-nums mt-1 truncate">
            {value}
          </p>
          {subtitle !== undefined && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          )}
        </>
      )}
    </Tag>
  );
}

export function AllocationMetricsBar({ metrics, isLoading, activeFilter, onStatusSelect }: AllocationMetricsBarProps) {
  const toggle = (status: AllocationStatusFilter) =>
    onStatusSelect(activeFilter === status ? 'all' : status);

  const m = metrics;

  return (
    <div className="flex divide-x overflow-hidden rounded-lg border bg-card shadow-card">
      <MetricCell
        label="Sobrecarregados"
        value={m.overloaded === null ? '—' : String(m.overloaded)}
        dotClass="bg-destructive"
        clickable
        active={activeFilter === 'overloaded'}
        onClick={() => toggle('overloaded')}
        isLoading={isLoading}
      />
      <MetricCell
        label="Desalocados"
        value={m.unallocated === null ? '—' : String(m.unallocated)}
        dotClass="bg-warning"
        clickable
        active={activeFilter === 'unallocated'}
        onClick={() => toggle('unallocated')}
        isLoading={isLoading}
      />
      <MetricCell
        label="Utilização Média"
        value={m.avgUtilization === null ? '—' : `${m.avgUtilization}%`}
        isLoading={isLoading}
      />
      <MetricCell
        label="Horas Disponíveis"
        value={m.availableHours === null ? '—' : `${m.availableHours}h`}
        isLoading={isLoading}
      />
      <MetricCell
        label="Membros Ativos"
        value={m.activeMembers === null ? '—' : String(m.activeMembers)}
        subtitle={
          m.unallocated !== null && m.unallocated > 0
            ? `${m.unallocated} sem alocação`
            : undefined
        }
        isLoading={isLoading}
      />
    </div>
  );
}
