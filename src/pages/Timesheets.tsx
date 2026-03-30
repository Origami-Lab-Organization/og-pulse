import { useState } from 'react';
import { Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { YearNavigator } from '@/components/timesheets/YearNavigator';
import {
  AllocationOverview,
  PlannerFilterOptions,
  PlannerFilters,
} from '@/components/timesheets/AllocationOverview';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const EMPTY_OPTIONS: PlannerFilterOptions = {
  teams: [],
  managers: [],
  projects: [],
};

export default function Timesheets() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState<PlannerFilterOptions>(EMPTY_OPTIONS);

  const [filters, setFilters] = useState<PlannerFilters>({
    teamId: 'all',
    managerId: 'all',
    projectId: 'all',
    onlyConflicts: false,
  });

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
        <div className="flex flex-col gap-4">
          <div className="flex flex-col xl:flex-row xl:items-center gap-3">
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

            <Select value={filters.managerId} onValueChange={(value) => updateFilter('managerId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Gerente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os gerentes</SelectItem>
                {options.managers.map((manager) => (
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
                {options.projects.map((project) => (
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
          onFilterOptionsChange={setOptions}
        />
      </div>
    </AppLayout>
  );
}
