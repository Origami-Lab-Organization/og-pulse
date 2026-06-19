import { Download, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { AllocationFiltersState, AllocationStatusFilter } from '@/types/allocation';

interface AllocationFiltersProps {
  filters: AllocationFiltersState;
  roles: string[];
  projects: Array<{ id: string; name: string }>;
  offsetStart: number;
  periodLength: number;
  activeFiltersCount: number;
  periodLabel: string;
  referenceLabel: string;
  onFilterChange: <K extends keyof AllocationFiltersState>(key: K, value: AllocationFiltersState[K]) => void;
  onPeriodChange: (offsetStart: number, periodLength: number) => void;
  onClear: () => void;
  onExport: () => void;
}

export function AllocationFilters({
  filters,
  roles,
  projects,
  offsetStart,
  periodLength,
  activeFiltersCount,
  periodLabel,
  referenceLabel,
  onFilterChange,
  onPeriodChange,
  onClear,
  onExport,
}: AllocationFiltersProps) {
  const fieldLabelClass = 'text-[13px] font-semibold text-foreground';
  const statusItemClass = 'h-8 shrink-0 whitespace-nowrap px-3 text-xs leading-none';

  return (
    <section className="rounded-lg border bg-card p-4 shadow-card">
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
        <div className="grid gap-4 lg:grid-cols-[auto_190px_220px_minmax(220px,1fr)] lg:items-end">
          <div className="space-y-2">
            <p className={fieldLabelClass}>Status</p>
            <ToggleGroup
              type="single"
              value={filters.status}
              onValueChange={(value) => value && onFilterChange('status', value as AllocationStatusFilter)}
              className="max-w-full justify-start overflow-x-auto rounded-md border bg-background p-1 scrollbar-hide"
            >
              <ToggleGroupItem value="all" className={statusItemClass}>Todos</ToggleGroupItem>
              <ToggleGroupItem value="abovePlan" className={statusItemClass}>Acima do plano</ToggleGroupItem>
              <ToggleGroupItem value="missingLogs" className={statusItemClass}>Sem lançamento</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <p className={fieldLabelClass}>Cargo</p>
            <Select value={filters.role} onValueChange={(value) => onFilterChange('role', value)}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Todos os cargos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cargos</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className={fieldLabelClass}>Projeto</p>
            <Select value={filters.projectId} onValueChange={(value) => onFilterChange('projectId', value)}>
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Todos os projetos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os projetos</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className={fieldLabelClass}>Pessoa</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.search}
                onChange={(event) => onFilterChange('search', event.target.value)}
                placeholder="Buscar pessoa"
                className="h-10 pl-9"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2">
            <p className={fieldLabelClass}>Período</p>
            <Select value={`${offsetStart}:${periodLength}`} onValueChange={(value) => {
              const [nextOffset, nextLength] = value.split(':').map(Number);
              onPeriodChange(nextOffset, nextLength);
            }}>
              <SelectTrigger className="h-10 w-[248px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0:1">Somente mês atual</SelectItem>
                <SelectItem value="0:4">Mês atual + 3 próximos</SelectItem>
                <SelectItem value="-1:5">1 passado + atual + 3 próximos</SelectItem>
                <SelectItem value="-2:6">2 passados + atual + 3 próximos</SelectItem>
                <SelectItem value="1:4">Próximos 4 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-ring/50">
            <Switch
              checked={filters.showTerminated}
              onCheckedChange={(value) => onFilterChange('showTerminated', value)}
            />
            Mostrar desligados
          </label>

          <div className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{referenceLabel}</span>
            <span>{periodLabel}</span>
          </div>

          {activeFiltersCount > 0 && <Badge variant="secondary">{activeFiltersCount} filtros ativos</Badge>}
          {activeFiltersCount > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={onClear} className="h-8 gap-1">
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onExport} className="h-8 gap-2">
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>
    </section>
  );
}
