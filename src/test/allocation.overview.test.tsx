import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AllocationOverview, PlannerFilters } from '@/components/timesheets/AllocationOverview';

const supabaseFrom = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: supabaseFrom,
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    employee: {
      id: 'admin-1',
      tenant_id: 'tenant-1',
      isAdmin: true,
      is_gerente: true,
    },
  }),
}));

vi.mock('@/hooks/useProjectMemberMonths', () => ({
  useUpsertMemberMonth: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useHolidays', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/useHolidays')>('@/hooks/useHolidays');
  return {
    ...actual,
    useHolidays: () => ({ data: [], isLoading: false }),
  };
});

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const italo = {
  id: 'emp-italo',
  nome: 'Italo Cesar Castro',
  cargo: 'Tech Lead',
  jornada_diaria: 8,
  status: 'ativo',
  employee_terminations: null,
};

function project(id: string, name: string, memberId: string | null) {
  return {
    id,
    name,
    start_date: '2026-01-01',
    duration_months: 12,
    is_continuous: false,
    manager_id: 'manager-1',
    service_line: 'product',
    portfolio_stage: 'value_delivery',
    manager: { id: 'manager-1', nome: 'Guilherme Valadares Pereira' },
    project_members: memberId
      ? [{
        id: memberId,
        employee_id: italo.id,
        role: 'Tech Lead',
        seniority: 'senior',
        employees: italo,
      }]
      : [],
  };
}

const plannedProjects = [
  project('p-clube', 'Clube de Benefícios', 'm-clube'),
  project('p-bry', 'Plataforma Bry', 'm-bry'),
  project('p-pericias', 'Plataforma de Perícias', 'm-pericias'),
  project('p-prumo', 'Prumo Obras - Fase 2', 'm-prumo'),
  project('p-tecnoflow', 'TecnoFlow', 'm-tecnoflow'),
];

const actualOnlyProject = project('p-actual-only', 'Projeto Sem Planejado', null);

let includeActualOnly = false;
let includeActivity = false;

const memberMonths = [
  { project_member_id: 'm-clube', month_number: 5, hours: 20 },
  { project_member_id: 'm-bry', month_number: 5, hours: 84 },
  { project_member_id: 'm-pericias', month_number: 5, hours: 8 },
  { project_member_id: 'm-prumo', month_number: 5, hours: 24 },
  { project_member_id: 'm-tecnoflow', month_number: 5, hours: 20 },
];

function timesheet(projectId: string, memberId: string, hours: number, projectData = plannedProjects.find((p) => p.id === projectId)) {
  return {
    project_id: projectId,
    project_member_id: memberId,
    work_date: '2026-05-12',
    hours,
    project_members: {
      id: memberId,
      employee_id: italo.id,
      project_id: projectId,
      employees: italo,
    },
    projects: projectData,
  };
}

function tableData(table: string) {
  if (table === 'projects') {
    return includeActualOnly ? [...plannedProjects, actualOnlyProject] : plannedProjects;
  }

  if (table === 'project_member_months') return memberMonths;

  if (table === 'project_timesheets') {
    const rows = [
      timesheet('p-clube', 'm-clube', 4),
      timesheet('p-bry', 'm-bry', 57),
      timesheet('p-pericias', 'm-pericias', 3),
      timesheet('p-prumo', 'm-prumo', 8),
    ];

    if (includeActualOnly) {
      rows.push(timesheet('p-actual-only', 'm-actual-only', 6, actualOnlyProject));
    }

    return rows;
  }

  if (table === 'activity_types') {
    return includeActivity
      ? [{ id: 'activity-admin', name: 'Administrativo', applies_to_all: true, activity_type_employees: [] }]
      : [];
  }

  if (table === 'activity_employee_months') {
    return includeActivity
      ? [{ employee_id: italo.id, activity_type_id: 'activity-admin', year: 2026, month: 5, hours: 1 }]
      : [];
  }

  if (table === 'activity_timesheets') {
    return includeActivity
      ? [{ employee_id: italo.id, activity_type_id: 'activity-admin', work_date: '2026-05-13', hours: 2 }]
      : [];
  }

  if (table === 'services') return [];

  return [];
}

class SupabaseQueryMock {
  constructor(private table: string) {}

  select() { return this; }
  eq() { return this; }
  in() { return this; }
  gte() { return this; }
  lte() { return this; }
  order() { return this; }

  then<TResult1 = { data: unknown[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve({ data: tableData(this.table), error: null }).then(onfulfilled, onrejected);
  }
}

const defaultFilters: PlannerFilters = {
  teamId: 'all',
  managerId: 'all',
  projectId: 'all',
  onlyConflicts: false,
};

function renderAllocation(filters: PlannerFilters = defaultFilters) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AllocationOverview selectedYear={2026} filters={filters} />
    </QueryClientProvider>
  );
}

async function expandItalo() {
  fireEvent.click(await screen.findByText('Italo Cesar Castro'));
  return screen.findByText('Itens de alocação');
}

function projectRow(projectName: string) {
  return screen.getByText(projectName).closest('tr')!;
}

describe('AllocationOverview', () => {
  beforeEach(() => {
    includeActualOnly = false;
    includeActivity = false;
    supabaseFrom.mockImplementation((table: string) => new SupabaseQueryMock(table));
  });

  it('usa a timesheet como real por projeto e mes no cenário do Italo', async () => {
    renderAllocation();

    await screen.findByText('Italo Cesar Castro');

    expect(screen.getByText('156h')).toBeInTheDocument();
    expect(screen.getByText('72h')).toBeInTheDocument();

    await expandItalo();

    expect(within(projectRow('Clube de Benefícios')).getByText('4h')).toBeInTheDocument();
    expect(within(projectRow('Plataforma Bry')).getByText('57h')).toBeInTheDocument();
    expect(within(projectRow('Plataforma de Perícias')).getByText('3h')).toBeInTheDocument();
    expect(within(projectRow('Prumo Obras - Fase 2')).getByText('8h')).toBeInTheDocument();
  });

  it('mostra projeto com real mesmo quando nao existe planejado', async () => {
    includeActualOnly = true;
    renderAllocation();

    await screen.findByText('78h');
    await expandItalo();

    expect(within(projectRow('Projeto Sem Planejado')).getByText('6h')).toBeInTheDocument();
  });

  it('aplica filtro de projeto tambem sobre horas reais', async () => {
    renderAllocation({ ...defaultFilters, projectId: 'p-bry' });

    await screen.findByText('Italo Cesar Castro');

    expect(screen.getByText('84h')).toBeInTheDocument();
    expect(screen.getByText('57h')).toBeInTheDocument();
    expect(screen.queryByText('72h')).not.toBeInTheDocument();

    await expandItalo();

    expect(screen.getByText('Plataforma Bry')).toBeInTheDocument();
    expect(screen.queryByText('Clube de Benefícios')).not.toBeInTheDocument();
  });

  it('mantem atividades internas separadas e somadas ao total real', async () => {
    includeActivity = true;
    renderAllocation();

    await screen.findByText('74h');
    await expandItalo();

    expect(screen.getByText('Administrativo')).toBeInTheDocument();
    expect(within(projectRow('Administrativo')).getByText('2h')).toBeInTheDocument();
  });
});
