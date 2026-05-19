import { useState, useMemo } from 'react';
import { format, subWeeks, startOfWeek, subDays } from 'date-fns';
import { Search } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { YearNavigator } from '@/components/timesheets/YearNavigator';
import {
  AllocationOverview,
  PlannerFilterOptions,
  PlannerFilters,
} from '@/components/timesheets/AllocationOverview';
import { AllocationTypeKPIRow } from '@/components/timesheets/AllocationTypeKPIRow';
import { useAllocationTypeKpis } from '@/hooks/useAllocationTypeKpis';
import { useAuth } from '@/contexts/AuthContext';
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
  const [kpiData, setKpiData] = useState<{ counts: any; total: number; capacityAnnual: number; capacityCurrentMonth: number; capacityYtd: number }>({
    counts: {}, total: 0, capacityAnnual: 0, capacityCurrentMonth: 0, capacityYtd: 0,
  });

  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const isAdmin = employee?.isAdmin ?? false;
  const currentEmployeeId = employee?.id;

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth() + 1;
  const weekCutoffDate = useMemo(() => format(subWeeks(now, 1), 'yyyy-MM-dd'), [now]);

  // Last Friday before current week (Monday - 3 days)
  const ytdCutoffDate = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    return format(subDays(weekStart, 3), 'yyyy-MM-dd');
  }, [now]);
  const ytdMonth = useMemo(() => {
    const [, m] = ytdCutoffDate.split('-').map(Number);
    return m;
  }, [ytdCutoffDate]);

  const [filters, setFilters] = useState<PlannerFilters>({
    teamId: 'all',
    managerId: 'all',
    projectId: 'all',
    onlyConflicts: false,
    hideTerminated: false,
  });

  const { data: typeKpis, isLoading: isLoadingTypeKpis } = useAllocationTypeKpis({
    tenantId,
    selectedYear,
    currentMonth,
    weekCutoffDate,
    ytdCutoffDate,
    managerId: filters.managerId,
    projectId: filters.projectId,
    teamId: filters.teamId,
    isAdmin,
    currentEmployeeId,
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
        <AllocationTypeKPIRow
          data={typeKpis}
          isLoading={isLoadingTypeKpis}
          capacityAnnual={kpiData.capacityAnnual}
          capacityYtd={kpiData.capacityYtd}
          capacityMonth={kpiData.capacityCurrentMonth}
          selectedYear={selectedYear}
          currentMonth={currentMonth}
          weekCutoffDate={weekCutoffDate}
          ytdCutoffDate={ytdCutoffDate}
        />

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
              <SelectTrigger className="w-full sm:w-[160px] lg:w-[180px]">
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
              <SelectTrigger className="w-full sm:w-[160px] lg:w-[180px]">
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os projetos</SelectItem>
                {options.projects.map((project) => (
                  <SelectItem key={project.value} value={project.value}>{project.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Checkbox
                id="hide-terminated"
                checked={filters.hideTerminated}
                onCheckedChange={(v) => updateFilter('hideTerminated', Boolean(v))}
              />
              <label
                htmlFor="hide-terminated"
                className="text-sm text-muted-foreground cursor-pointer select-none whitespace-nowrap"
              >
                Ocultar desligados
              </label>
            </div>
          </div>
        </div>

        <AllocationOverview
          searchQuery={searchQuery}
          selectedYear={selectedYear}
          filters={filters}
          ytdMonth={ytdMonth}
          onFilterOptionsChange={setOptions}
          onKPIDataChange={setKpiData}
        />
      </div>
    </AppLayout>
  );
}
