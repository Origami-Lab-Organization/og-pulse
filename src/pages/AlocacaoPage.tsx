import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as amplitude from '@amplitude/analytics-browser';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import { AllocationGrid } from '@/components/allocation/AllocationGrid';
import { AllocationToolbar } from '@/components/allocation/AllocationToolbar';
import { useAuth } from '@/contexts/AuthContext';
import { useAllocationGrid } from '@/hooks/useAllocationGrid';
import { calculateMetrics, filterAllocationPeople, getAllocationStatus } from '@/lib/allocationGrid';
import { formatDate } from '@/lib/formatters';
import { AllocationFiltersState, AllocationMonth, AllocationPerson, AllocationProjectPill, AllocationStatusFilter } from '@/types/allocation';

const PAGE_SIZE = 15;
const DEFAULT_OFFSET_START = -1;

const DEFAULT_FILTERS: AllocationFiltersState = {
  status: 'all',
  role: 'all',
  projectId: 'all',
  search: '',
  showTerminated: false,
};

const EMPTY_MONTHS: AllocationMonth[] = [];

function readNumber(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function activeFiltersCount(filters: AllocationFiltersState) {
  return [
    filters.status !== 'all',
    filters.role !== 'all',
    filters.projectId !== 'all',
    filters.search.trim().length > 0,
    filters.showTerminated,
  ].filter(Boolean).length;
}

const JOAOZINHO_VISUAL_PROJECTS: AllocationProjectPill[] = [
  { id: 'fixture-meridian', code: 'MER', name: 'Diagnóstico de Inovação — Meridian 2C', hours: 36, plannedHours: 20, actualHours: 36 },
  { id: 'fixture-atlas', code: 'ATL', name: 'Portal do Cliente — Atlas', hours: 12, plannedHours: 8, actualHours: 12 },
  { id: 'fixture-nimbo', code: 'NIM', name: 'Automação Financeira — Nimbo', hours: 10, plannedHours: 8, actualHours: 10 },
  { id: 'fixture-prumo', code: 'PRU', name: 'App Operacional — Prumo', hours: 8, plannedHours: 6, actualHours: 8 },
  { id: 'fixture-kai', code: 'KAI', name: 'Integração BI — Kai Analytics', hours: 6, plannedHours: 4, actualHours: 6 },
  { id: 'fixture-aurora', code: 'AUR', name: 'Jornada Comercial — Aurora', hours: 7, plannedHours: 4, actualHours: 7 },
  { id: 'fixture-vertice', code: 'VER', name: 'Discovery de Produto — Vértice', hours: 9, plannedHours: 6, actualHours: 9 },
  { id: 'fixture-bry', code: 'BRY', name: 'Sustentação Cloud — Bry', hours: 5, plannedHours: 3, actualHours: 5 },
  { id: 'fixture-fenix', code: 'FEN', name: 'Pesquisa UX — Fênix', hours: 4, plannedHours: 2, actualHours: 4 },
  { id: 'fixture-origami', code: 'ORI', name: 'Planejamento Executivo — Origami Lab', hours: 7, plannedHours: 3, actualHours: 7 },
];

function readStatusFilter(value: string | null): AllocationStatusFilter {
  if (value === 'abovePlan' || value === 'missingLogs' || value === 'overloaded' || value === 'unallocated' || value === 'outOfPace') return value;
  if (value === 'overallocated') return 'overloaded';
  return DEFAULT_FILTERS.status;
}

function normalizePersonName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function applyVisualFixture(people: AllocationPerson[], referenceMonthKey: string, fixture: string) {
  if (!import.meta.env.DEV || fixture !== 'joaozinho-10-projetos' || !referenceMonthKey) return people;

  return people.map((person) => {
    if (normalizePersonName(person.name) !== 'joaozinho 2') return person;

    const cell = person.cells[referenceMonthKey];
    if (!cell) return person;

    const plannedHours = JOAOZINHO_VISUAL_PROJECTS.reduce((sum, project) => sum + Number(project.plannedHours || 0), 0);
    const actualProjectHours = JOAOZINHO_VISUAL_PROJECTS.reduce((sum, project) => sum + Number(project.actualHours || project.hours || 0), 0);
    const utilization = cell.capacityHours > 0 ? Math.round((actualProjectHours / cell.capacityHours) * 100) : null;

    return {
      ...person,
      cells: {
        ...person.cells,
        [referenceMonthKey]: {
          ...cell,
          plannedHours,
          actualProjectHours,
          totalHours: actualProjectHours,
          utilization,
          status: getAllocationStatus(utilization),
          projects: JOAOZINHO_VISUAL_PROJECTS,
        },
      },
    };
  });
}

export default function AlocacaoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const baseDate = useMemo(() => new Date(), []);
  const visualFixture = searchParams.get('teste') ?? '';

  const [filters, setFilters] = useState<AllocationFiltersState>({
    status: readStatusFilter(searchParams.get('status')),
    role: searchParams.get('role') || DEFAULT_FILTERS.role,
    projectId: searchParams.get('project') || DEFAULT_FILTERS.projectId,
    search: searchParams.get('q') || DEFAULT_FILTERS.search,
    showTerminated: searchParams.get('desligados') === '1',
  });
  const [offsetStart, setOffsetStart] = useState(readNumber(searchParams.get('offset'), DEFAULT_OFFSET_START));
  const [periodLength, setPeriodLength] = useState(readNumber(searchParams.get('months'), 4));
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useAllocationGrid({
    tenantId,
    filters,
    offsetStart,
    periodLength,
    baseDate,
  });

  const months = data?.months ?? EMPTY_MONTHS;
  const referenceMonth = months.find((month) => month.year === baseDate.getFullYear() && month.month === baseDate.getMonth() + 1) ?? months[0];
  const referenceMonthKey = referenceMonth?.key ?? '';
  const referenceLabel = referenceMonth?.label ?? 'MÊS';
  const periodBounds = useMemo(() => {
    const firstLoadedMonth = months[0];
    const lastLoadedMonth = months[months.length - 1];

    if (firstLoadedMonth && lastLoadedMonth) {
      return {
        startDate: firstLoadedMonth.startDate,
        endDate: lastLoadedMonth.endDate,
      };
    }

    const firstDate = startOfMonth(addMonths(baseDate, Math.max(-2, Math.min(4, offsetStart))));
    const lastDate = endOfMonth(addMonths(firstDate, Math.max(1, Math.min(6, periodLength)) - 1));

    return {
      startDate: format(firstDate, 'yyyy-MM-dd'),
      endDate: format(lastDate, 'yyyy-MM-dd'),
    };
  }, [baseDate, months, offsetStart, periodLength]);

  const filteredPeople = useMemo(() => {
    if (!data || !referenceMonth) return [];
    const sourcePeople = applyVisualFixture(data.people, referenceMonthKey, visualFixture);
    return [...filterAllocationPeople(sourcePeople, filters, referenceMonth)]
      .sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
  }, [data, filters, referenceMonth, referenceMonthKey, visualFixture]);

  const metrics = useMemo(
    () => calculateMetrics(filteredPeople, referenceMonth),
    [filteredPeople, referenceMonth],
  );

  const paginatedPeople = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredPeople.slice(start, start + PAGE_SIZE);
  }, [filteredPeople, page]);

  const filterCount = activeFiltersCount(filters);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (filters.status !== 'all') nextParams.set('status', filters.status);
    if (filters.role !== 'all') nextParams.set('role', filters.role);
    if (filters.projectId !== 'all') nextParams.set('project', filters.projectId);
    if (filters.search.trim()) nextParams.set('q', filters.search.trim());
    if (filters.showTerminated) nextParams.set('desligados', '1');
    if (offsetStart !== DEFAULT_OFFSET_START) nextParams.set('offset', String(offsetStart));
    if (periodLength !== 4) nextParams.set('months', String(periodLength));
    if (visualFixture) nextParams.set('teste', visualFixture);
    setSearchParams(nextParams, { replace: true });
  }, [filters, offsetStart, periodLength, setSearchParams, visualFixture]);

  useEffect(() => {
    amplitude.track('allocation_grid_viewed', {
      period: months.map((month) => month.key).join(','),
    });
  }, [months]);

  useEffect(() => {
    setPage(1);
    amplitude.track('allocation_filter_applied', {
      status: filters.status,
      role: filters.role,
      projectId: filters.projectId,
      hasSearch: filters.search.trim().length > 0,
      showTerminated: filters.showTerminated,
    });
  }, [filters]);

  const updateFilter = <K extends keyof AllocationFiltersState>(key: K, value: AllocationFiltersState[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const updatePeriod = (nextOffsetStart: number, nextPeriodLength: number) => {
    setOffsetStart(nextOffsetStart);
    setPeriodLength(nextPeriodLength);
    setPage(1);
    amplitude.track('allocation_period_changed', {
      offsetStart: nextOffsetStart,
      months: nextPeriodLength,
    });
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const openEmployee = (employeeId: string) => {
    amplitude.track('allocation_employee_opened', { employeeId });
  };

  const emptyMessage = data?.people.length === 0
    ? 'Nenhum funcionário cadastrado'
    : 'Nenhum funcionário encontrado com os filtros aplicados';

  return (
    <AppLayout title="Alocação da Equipe" hideHeader>
      <div className="space-y-4">
        <AllocationToolbar
          filters={filters}
          roles={data?.roles ?? []}
          projects={data?.projects ?? []}
          metrics={metrics}
          isLoading={isLoading}
          activeFiltersCount={filterCount}
          referenceLabel={referenceLabel}
          offsetStart={offsetStart}
          periodLength={periodLength}
          periodLabel={`${formatDate(periodBounds.startDate)} - ${formatDate(periodBounds.endDate)}`}
          onFilterChange={updateFilter}
          onClear={clearFilters}
          onPeriodChange={updatePeriod}
        />

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between gap-3">
              Não foi possível carregar a alocação da equipe.
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <AllocationGrid
          tenantId={tenantId}
          months={months}
          people={paginatedPeople}
          referenceMonthKey={referenceMonthKey}
          projectIdFilter={filters.projectId}
          projectOptions={data?.projects ?? []}
          roleOptions={data?.roles ?? []}
          isLoading={isLoading}
          page={page}
          pageSize={PAGE_SIZE}
          total={filteredPeople.length}
          emptyMessage={emptyMessage}
          onPageChange={setPage}
          onEmployeeOpen={openEmployee}
        />
      </div>
    </AppLayout>
  );
}
