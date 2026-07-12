import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { AllocationFiltersState, AllocationMetrics, AllocationStatusFilter } from '@/types/allocation';

interface AllocationToolbarProps {
  filters: AllocationFiltersState;
  roles: string[];
  projects: Array<{ id: string; name: string }>;
  metrics: AllocationMetrics;
  isLoading: boolean;
  referenceLabel: string;
  activeFiltersCount: number;
  onFilterChange: <K extends keyof AllocationFiltersState>(key: K, value: AllocationFiltersState[K]) => void;
  onClear: () => void;
  onExport: () => void;
}

function AttentionChip({
  label,
  value,
  dotClass,
  active,
  isLoading,
  onClick,
}: {
  label: string;
  value: number | null;
  dotClass: string;
  active: boolean;
  isLoading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-3 text-xs font-semibold transition-colors',
        'hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        active ? 'border-transparent bg-accent/60' : 'border-border bg-background',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} />
      {label}
      {isLoading ? <Skeleton className="h-3 w-4" /> : <span className="font-mono tabular-nums">{value ?? '—'}</span>}
    </button>
  );
}

export function AllocationToolbar({
  filters,
  roles,
  projects,
  metrics,
  isLoading,
  referenceLabel,
  activeFiltersCount,
  onFilterChange,
  onClear,
  onExport,
}: AllocationToolbarProps) {
  const toggleStatus = (status: AllocationStatusFilter) =>
    onFilterChange('status', filters.status === status ? 'all' : status);

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 shadow-card">
      <div className="relative w-full sm:w-56">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(event) => onFilterChange('search', event.target.value)}
          placeholder="Buscar pessoa"
          className="h-9 pl-9"
        />
      </div>

      <Select value={filters.role} onValueChange={(value) => onFilterChange('role', value)}>
        <SelectTrigger className="h-9 w-[168px] shrink-0">
          <SelectValue placeholder="Todos os cargos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os cargos</SelectItem>
          {roles.map((role) => (
            <SelectItem key={role} value={role}>{role}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.projectId} onValueChange={(value) => onFilterChange('projectId', value)}>
        <SelectTrigger className="h-9 w-[168px] shrink-0">
          <SelectValue placeholder="Todos os projetos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os projetos</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <span className="ol-label shrink-0 text-muted-foreground">Atenção</span>
        <AttentionChip
          label="Fora do plano"
          value={metrics.outOfPace}
          dotClass="bg-info"
          active={filters.status === 'outOfPace'}
          isLoading={isLoading}
          onClick={() => toggleStatus('outOfPace')}
        />
        <AttentionChip
          label="Sobrecarregados"
          value={metrics.overloaded}
          dotClass="bg-destructive"
          active={filters.status === 'overloaded'}
          isLoading={isLoading}
          onClick={() => toggleStatus('overloaded')}
        />
        <AttentionChip
          label="Desalocados"
          value={metrics.unallocated}
          dotClass="bg-warning"
          active={filters.status === 'unallocated'}
          isLoading={isLoading}
          onClick={() => toggleStatus('unallocated')}
        />
      </div>

      <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        {activeFiltersCount > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear} className="h-8 gap-1">
            Limpar {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''}
          </Button>
        )}
        {isLoading ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          <span className="font-mono tabular-nums">
            Billable {referenceLabel} {metrics.billablePercent === null ? '—' : `${metrics.billablePercent}%`}
            {' '}· {metrics.availableHours === null ? '—' : `${metrics.availableHours}h`} livres
          </span>
        )}
        <Button type="button" variant="outline" size="sm" onClick={onExport} className="h-8 gap-2">
          <Download className="h-4 w-4" />
          CSV
        </Button>
      </div>
    </section>
  );
}
