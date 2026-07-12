import { CalendarDays, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
  offsetStart: number;
  periodLength: number;
  periodLabel: string;
  onFilterChange: <K extends keyof AllocationFiltersState>(key: K, value: AllocationFiltersState[K]) => void;
  onClear: () => void;
  onPeriodChange: (offsetStart: number, periodLength: number) => void;
}

const PERIOD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '0:1', label: 'Somente mês atual' },
  { value: '-1:4', label: 'Anterior + atual + 2 próximos' },
  { value: '0:4', label: 'Mês atual + 3 próximos' },
  { value: '-1:5', label: '1 passado + atual + 3 próximos' },
  { value: '-2:6', label: '2 passados + atual + 3 próximos' },
  { value: '1:4', label: 'Próximos 4 meses' },
];

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
        'flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill border px-2.5 text-xs font-semibold transition-colors',
        'hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        active ? 'border-primary bg-accent/60 text-primary-deep' : 'border-border bg-background text-muted-foreground',
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
  offsetStart,
  periodLength,
  periodLabel,
  onFilterChange,
  onClear,
  onPeriodChange,
}: AllocationToolbarProps) {
  const toggleStatus = (status: AllocationStatusFilter) =>
    onFilterChange('status', filters.status === status ? 'all' : status);

  return (
    <div className="-mx-4 -mt-4 mb-4 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 sm:-mx-6 sm:-mt-6 sm:mb-6">
      {/* Row A — título · subtítulo · período · desligados */}
      <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-4 py-2.5 sm:px-6">
        <h1 className="text-lg font-bold tracking-tight text-foreground">Alocação da Equipe</h1>
        <span className="hidden border-l pl-3 text-xs text-muted-foreground md:inline">
          Planejado vs. lançado no timesheet — sem custo
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Select
            value={`${offsetStart}:${periodLength}`}
            onValueChange={(value) => {
              const [nextOffset, nextLength] = value.split(':').map(Number);
              onPeriodChange(nextOffset, nextLength);
            }}
          >
            <SelectTrigger className="h-8 w-auto gap-2 px-2.5 text-xs">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {PERIOD_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="hidden font-mono text-[11px] tabular-nums text-muted-foreground lg:inline">{periodLabel}</span>
          <label className="flex h-8 items-center gap-2 rounded-md border bg-background px-2.5 text-xs text-muted-foreground transition-colors hover:border-ring/50">
            <Switch
              checked={filters.showTerminated}
              onCheckedChange={(value) => onFilterChange('showTerminated', value)}
            />
            Desligados
          </label>
        </div>
      </div>

      {/* Row B — busca · cargo · projeto · atenção (chips) · meta */}
      <div className="flex min-h-[52px] flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
        <div className="relative w-44">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(event) => onFilterChange('search', event.target.value)}
            placeholder="Buscar pessoa"
            className="h-8 pl-8 text-xs"
          />
        </div>

        <Select value={filters.role} onValueChange={(value) => onFilterChange('role', value)}>
          <SelectTrigger className="h-8 w-[150px] text-xs">
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
          <SelectTrigger className="h-8 w-[150px] text-xs">
            <SelectValue placeholder="Todos os projetos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="mx-1 hidden h-6 w-px bg-border sm:inline-block" />
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
        {activeFiltersCount > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear} className="h-7 gap-1 px-2 text-xs text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}

        <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <>
              Billable {referenceLabel} {metrics.billablePercent === null ? '—' : `${metrics.billablePercent}%`}
              {' · '}
              {metrics.availableHours === null ? '—' : `${metrics.availableHours}h`} livres
            </>
          )}
        </span>
      </div>
    </div>
  );
}
