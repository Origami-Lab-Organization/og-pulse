import { useMemo, useState } from 'react';
import { Search, TrendingUp, TrendingDown, MinusCircle, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { YearNavigator } from '@/components/timesheets/YearNavigator';
import {
  AllocationOverview,
  PlannerFilterOptions,
  PlannerFilters,
  StatusDualCounts,
  StatusLabel,
} from '@/components/timesheets/AllocationOverview';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type KPIConfig = {
  label: StatusLabel;
  icon: React.ElementType;
  iconClass: string;
};

const KPI_CONFIG: KPIConfig[] = [
  { label: 'Sobrealocado', icon: TrendingUp, iconClass: 'bg-red-100 text-red-700' },
  { label: 'Subalocado', icon: TrendingDown, iconClass: 'bg-yellow-100 text-yellow-700' },
  { label: 'Ocioso', icon: MinusCircle, iconClass: 'bg-muted text-muted-foreground' },
  { label: 'Adequado', icon: CheckCircle2, iconClass: 'bg-green-100 text-green-700' },
];

const EMPTY_COUNTS: StatusDualCounts = {
  planned: { Sobrealocado: 0, Subalocado: 0, Ocioso: 0, Adequado: 0 },
  actual: { Sobrealocado: 0, Subalocado: 0, Ocioso: 0, Adequado: 0 },
};

const EMPTY_OPTIONS: PlannerFilterOptions = {
  teams: [],
  managers: [],
  projects: [],
};

export default function Timesheets() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusCounts, setStatusCounts] = useState<StatusDualCounts>(EMPTY_COUNTS);
  const [options, setOptions] = useState<PlannerFilterOptions>(EMPTY_OPTIONS);

  const [filters, setFilters] = useState<PlannerFilters>({
    teamId: 'all',
    managerId: 'all',
    projectId: 'all',
    onlyConflicts: false,
  });

  const normalizedOptions = useMemo(() => {
    return {
      teams: options.teams,
      managers: options.managers,
      projects: options.projects,
    };
  }, [options]);

  const updateFilter = <K extends keyof PlannerFilters>(key: K, value: PlannerFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <AppLayout
      title="Alocação"
      description="Planeje e ajuste a alocação anual da equipe sem abrir cada projeto"
      breadcrumbs={[{ label: 'Alocação' }]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KPI_CONFIG.map(({ label, icon: Icon, iconClass }) => (
            <Card key={label} className="animate-scale-in">
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`rounded-lg p-3 ${iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{label}s</p>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Plan:</span> {statusCounts.planned[label]}
                    <span className="mx-2">|</span>
                    <span className="font-medium text-foreground">Real:</span> {statusCounts.actual[label]}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <YearNavigator selectedYear={selectedYear} onYearChange={setSelectedYear} />

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pessoa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full lg:w-[260px]"
              />
            </div>

            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Switch
                id="only-conflicts"
                checked={filters.onlyConflicts}
                onCheckedChange={(checked) => updateFilter('onlyConflicts', checked)}
              />
              <Label htmlFor="only-conflicts" className="text-sm cursor-pointer">Somente conflitos</Label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={filters.teamId} onValueChange={(value) => updateFilter('teamId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os times</SelectItem>
                {normalizedOptions.teams.map((team) => (
                  <SelectItem key={team.value} value={team.value}>{team.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.managerId} onValueChange={(value) => updateFilter('managerId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Gerente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os gerentes</SelectItem>
                {normalizedOptions.managers.map((manager) => (
                  <SelectItem key={manager.value} value={manager.value}>{manager.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.projectId} onValueChange={(value) => updateFilter('projectId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os projetos</SelectItem>
                {normalizedOptions.projects.map((project) => (
                  <SelectItem key={project.value} value={project.value}>{project.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <AllocationOverview
          searchQuery={searchQuery}
          selectedYear={selectedYear}
          filters={filters}
          onStatusCountsChange={setStatusCounts}
          onFilterOptionsChange={setOptions}
        />
      </div>
    </AppLayout>
  );
}
