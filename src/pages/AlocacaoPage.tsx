import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as amplitude from '@amplitude/analytics-browser';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { AlertCircle, CalendarDays } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AppLayout } from '@/components/layout/AppLayout';
import { AllocationGrid } from '@/components/allocation/AllocationGrid';
import { AllocationToolbar } from '@/components/allocation/AllocationToolbar';
import { useAuth } from '@/contexts/AuthContext';
import { useAllocationGrid } from '@/hooks/useAllocationGrid';
import { calculateMetrics, filterAllocationPeople, getAllocationStatus, getLoggedHours, sortByReferencePlanVariance } from '@/lib/allocationGrid';
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

function csvEscape(value: string | number | null) {
  const raw = value === null ? '' : String(value);
  return `"${raw.replace(/"/g, '""')}"`;
}

function buildCsv(people: AllocationPerson[], months: AllocationMonth[]) {
  const headers = [
    'Nome',
    'Cargo',
    ...months.flatMap((month) => [
      `${month.label} planejado`,
      `${month.label} lançado`,
      `${month.label} capacidade`,
      `${month.label} aderência`,
    ]),
  ];

  const rows = people.map((person) => [
    person.name,
    person.role,
    ...months.flatMap((month) => {
      const cell = person.cells[month.key];
      const loggedHours = getLoggedHours(cell);
      const adherence = cell.plannedHours > 0 ? Math.round((loggedHours / cell.plannedHours) * 100) : null;
      return [
        Math.round(cell.plannedHours),
        Math.round(loggedHours),
        Math.round(cell.capacityHours),
        adherence === null ? '—' : `${adherence}%`,
      ];
    }),
  ]);

  return [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
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
    return sortByReferencePlanVariance(
      filterAllocationPeople(sourcePeople, filters, referenceMonth),
      referenceMonthKey,
    );
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

  const exportCsv = () => {
    if (!data) return;
    const csv = buildCsv(filteredPeople, data.months);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const period = data.months.map((month) => month.key).join('_');
    link.href = url;
    link.download = `alocacao-equipe-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const emptyMessage = data?.people.length === 0
    ? 'Nenhum funcionário cadastrado'
    : 'Nenhum funcionário encontrado com os filtros aplicados';

  return (
    <AppLayout
      title="Alocação da Equipe"
      description="Compare o que foi planejado com o que foi lançado no timesheet, sem misturar custo."
      breadcrumbs={[{ label: 'Alocação da Equipe' }]}
      actions={
        <>
          <div className="flex flex-col items-end gap-0.5">
            <Select value={`${offsetStart}:${periodLength}`} onValueChange={(value) => {
              const [nextOffset, nextLength] = value.split(':').map(Number);
              updatePeriod(nextOffset, nextLength);
            }}>
              <SelectTrigger className="h-9 w-auto gap-2 px-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="0:1">Somente mês atual</SelectItem>
                <SelectItem value="-1:4">Anterior + atual + 2 próximos</SelectItem>
                <SelectItem value="0:4">Mês atual + 3 próximos</SelectItem>
                <SelectItem value="-1:5">1 passado + atual + 3 próximos</SelectItem>
                <SelectItem value="-2:6">2 passados + atual + 3 próximos</SelectItem>
                <SelectItem value="1:4">Próximos 4 meses</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {formatDate(periodBounds.startDate)} - {formatDate(periodBounds.endDate)}
            </span>
          </div>

          <label className="flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-ring/50">
            <Switch
              checked={filters.showTerminated}
              onCheckedChange={(value) => updateFilter('showTerminated', value)}
            />
            Desligados
          </label>
        </>
      }
    >
      <div className="space-y-6">
        <AllocationToolbar
          filters={filters}
          roles={data?.roles ?? []}
          projects={data?.projects ?? []}
          metrics={metrics}
          isLoading={isLoading}
          activeFiltersCount={filterCount}
          referenceLabel={referenceLabel}
          onFilterChange={updateFilter}
          onClear={clearFilters}
          onExport={exportCsv}
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
