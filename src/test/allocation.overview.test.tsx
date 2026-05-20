import type { ReactNode } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AllocationOverview, PlannerFilters } from '@/components/timesheets/AllocationOverview';

const supabaseFrom = vi.hoisted(() => vi.fn());
const supabaseRpc = vi.hoisted(() => vi.fn());

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: supabaseFrom,
    rpc: supabaseRpc,
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
  employee_id: 'emp-italo',
  employee_name: 'Italo Cesar Castro',
  cargo: 'Tech Lead',
  jornada_diaria: 8,
  status: 'ativo',
  hire_date: null,
  termination_date: null,
  capacity_hours: null,
};

const kauany = {
  employee_id: 'emp-kauany',
  employee_name: 'Kauany Sebastiana Arantes',
  cargo: 'Gerente de Produto',
  jornada_diaria: 6,
  status: 'ativo',
  hire_date: '2026-01-07',
  termination_date: null,
  capacity_hours: null,
};

const projectOptions = [
  project('p-clube', 'Clube de Benefícios', 'manager-2', 'Maria Cecília Prado Coelho', 'product', 'Product Studio'),
  project('p-bry', 'Plataforma Bry', 'manager-1', 'Guilherme Valadares Pereira', 'product', 'Product Studio'),
  project('p-pericias', 'Plataforma de Perícias', 'manager-1', 'Guilherme Valadares Pereira', 'ventures', 'Ventures'),
  project('p-prumo', 'Prumo Obras - Fase 2', 'manager-2', 'Maria Cecília Prado Coelho', 'product', 'Product Studio'),
  project('p-tecnoflow', 'TecnoFlow', 'manager-2', 'Maria Cecília Prado Coelho', 'product', 'Product Studio'),
  project('p-actual-only', 'Projeto Sem Planejado', 'manager-1', 'Italo Cesar Castro', 'ventures', 'Ventures'),
];

let includeActualOnly = false;
let includeActivity = false;
let includeLargeActual = false;
let includeKauanyCapacity = false;

function project(id: string, name: string, managerId: string, managerName: string, serviceLine: string, teamLabel: string) {
  return {
    id,
    name,
    manager_id: managerId,
    service_line: serviceLine,
    portfolio_stage: 'value_delivery',
    manager: { id: managerId, nome: managerName },
    teamLabel,
  };
}

function summaryRows(args: Record<string, unknown>) {
  const projectId = args.p_project_id as string | null;

  if (projectId === 'p-bry') {
    return [
      { ...italo, month: 4, planned_hours: 84, actual_hours: 100 },
      { ...italo, month: 5, planned_hours: 84, actual_hours: 57 },
    ];
  }

  const mayActual = 72 + (includeActualOnly ? 6 : 0) + (includeActivity ? 2 : 0);
  const mayPlanned = 156 + (includeActivity ? 1 : 0);
  const bryAprilActual = includeLargeActual ? 1057 : 100;

  const rows = [
    { ...italo, month: 4, planned_hours: 126, actual_hours: 18 + 50 + bryAprilActual },
    { ...italo, month: 5, planned_hours: mayPlanned, actual_hours: mayActual },
  ];

  if (includeKauanyCapacity) {
    rows.push(
      { ...kauany, month: 1, planned_hours: 0, actual_hours: 0, capacity_hours: 108 },
      { ...kauany, month: 2, planned_hours: 0, actual_hours: 0, capacity_hours: 120 },
      { ...kauany, month: 3, planned_hours: 0, actual_hours: 0, capacity_hours: 132 },
      { ...kauany, month: 4, planned_hours: 144, actual_hours: 144, capacity_hours: 130 },
      { ...kauany, month: 5, planned_hours: 160, actual_hours: 96, capacity_hours: 160 },
      { ...kauany, month: 6, planned_hours: 168, actual_hours: 0, capacity_hours: 168 },
    );
  }

  return rows;
}

function detailRows(args: Record<string, unknown>) {
  const projectId = args.p_project_id as string | null;
  const rows = [
    detailProject('p-clube', 'm-clube', 'Clube de Benefícios', 'Maria Cecília Prado Coelho', 'Product Studio', 5, 20, 4),
    detailProject('p-bry', 'm-bry', 'Plataforma Bry', 'Guilherme Valadares Pereira', 'Product Studio', 4, 84, includeLargeActual ? 1057 : 100),
    detailProject('p-bry', 'm-bry', 'Plataforma Bry', 'Guilherme Valadares Pereira', 'Product Studio', 5, 84, 57),
    detailProject('p-pericias', 'm-pericias', 'Plataforma de Perícias', 'Guilherme Valadares Pereira', 'Ventures', 4, 8, 18),
    detailProject('p-pericias', 'm-pericias', 'Plataforma de Perícias', 'Guilherme Valadares Pereira', 'Ventures', 5, 8, 3),
    detailProject('p-prumo', 'm-prumo', 'Prumo Obras - Fase 2', 'Maria Cecília Prado Coelho', 'Product Studio', 4, 34, 50),
    detailProject('p-prumo', 'm-prumo', 'Prumo Obras - Fase 2', 'Maria Cecília Prado Coelho', 'Product Studio', 5, 24, 8),
    detailProject('p-tecnoflow', 'm-tecnoflow', 'TecnoFlow', 'Maria Cecília Prado Coelho', 'Product Studio', 5, 20, 0),
  ];

  if (includeActualOnly) {
    rows.push(detailProject('p-actual-only', 'm-actual-only', 'Projeto Sem Planejado', 'Italo Cesar Castro', 'Ventures', 5, 0, 6));
  }

  if (includeActivity) {
    rows.push({
      item_type: 'internal_activity',
      item_id: 'activity-admin',
      project_id: null,
      project_member_id: null,
      title: 'Administrativo',
      subtitle: 'Atividade interna',
      manager_id: null,
      manager_name: null,
      team_key: 'internal_activity',
      team_label: 'Atividade interna',
      project_start_date: null,
      duration_months: null,
      is_continuous: null,
      month: 5,
      planned_hours: 1,
      actual_hours: 2,
    });
  }

  return projectId ? rows.filter((row) => row.project_id === projectId) : rows;
}

function detailProject(
  projectId: string,
  memberId: string,
  title: string,
  managerName: string,
  teamLabel: string,
  month: number,
  planned: number,
  actual: number,
) {
  return {
    item_type: 'project',
    item_id: projectId,
    project_id: projectId,
    project_member_id: memberId,
    title,
    subtitle: `${managerName} · ${teamLabel}`,
    manager_id: managerName === 'Guilherme Valadares Pereira' ? 'manager-1' : 'manager-2',
    manager_name: managerName,
    team_key: teamLabel === 'Ventures' ? 'ventures' : 'product',
    team_label: teamLabel,
    project_start_date: '2026-01-01',
    duration_months: 12,
    is_continuous: false,
    month,
    planned_hours: planned,
    actual_hours: actual,
  };
}

class SupabaseQueryMock {
  constructor(private table: string) {}

  select() { return this; }
  eq() { return this; }
  in() { return this; }
  order() { return this; }

  then<TResult1 = { data: unknown[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    const data = this.table === 'projects' ? projectOptions : [];
    return Promise.resolve({ data, error: null }).then(onfulfilled, onrejected);
  }
}

const defaultFilters: PlannerFilters = {
  teamId: 'all',
  managerId: 'all',
  projectId: 'all',
  onlyConflicts: false,
  hideTerminated: false,
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
    includeLargeActual = false;
    includeKauanyCapacity = false;
    supabaseFrom.mockImplementation((table: string) => new SupabaseQueryMock(table));
    supabaseRpc.mockImplementation((fn: string, args: Record<string, unknown>) => {
      if (fn === 'get_allocation_employee_month_summary') {
        return Promise.resolve({ data: summaryRows(args), error: null });
      }
      if (fn === 'get_allocation_employee_detail') {
        return Promise.resolve({ data: detailRows(args), error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });
  });

  it('usa o resumo agregado por funcionario e carrega detalhes sob demanda', async () => {
    renderAllocation();

    await screen.findByText('Italo Cesar Castro');

    expect(screen.getByText('156h')).toBeInTheDocument();
    expect(screen.getByText('72h')).toBeInTheDocument();
    expect(screen.queryByText('Plataforma Bry')).not.toBeInTheDocument();
    expect(supabaseRpc).not.toHaveBeenCalledWith('get_allocation_employee_detail', expect.anything());

    await expandItalo();

    expect(supabaseRpc).toHaveBeenCalledWith('get_allocation_employee_detail', expect.objectContaining({ p_employee_id: 'emp-italo' }));
    expect(within(projectRow('Clube de Benefícios')).getByText('4h')).toBeInTheDocument();
    expect(within(projectRow('Plataforma Bry')).getByText('57h')).toBeInTheDocument();
    expect(within(projectRow('Plataforma de Perícias')).getByText('3h')).toBeInTheDocument();
    expect(within(projectRow('Prumo Obras - Fase 2')).getByText('8h')).toBeInTheDocument();
  });

  it('consolida abril do Italo com Bry, Pericias e Prumo a partir da RPC canonica', async () => {
    renderAllocation();

    await screen.findByText('168h');
    await expandItalo();

    expect(within(projectRow('Plataforma Bry')).getByText('100h')).toBeInTheDocument();
    expect(within(projectRow('Plataforma de Perícias')).getByText('18h')).toBeInTheDocument();
    expect(within(projectRow('Prumo Obras - Fase 2')).getByText('50h')).toBeInTheDocument();
  });

  it('mantem o real correto mesmo quando existem mais de 1000 lancamentos no ano', async () => {
    includeLargeActual = true;
    renderAllocation();

    await screen.findByText('1125h');
    await expandItalo();

    expect(within(projectRow('Plataforma Bry')).getByText('1057h')).toBeInTheDocument();
    expect(supabaseFrom).not.toHaveBeenCalledWith('project_timesheets');
  });

  it('mostra projeto com real mesmo quando nao existe planejado', async () => {
    includeActualOnly = true;
    renderAllocation();

    await screen.findByText('78h');
    await expandItalo();

    expect(within(projectRow('Projeto Sem Planejado')).getByText('6h')).toBeInTheDocument();
  });

  it('aplica filtro de projeto no resumo e no detalhe', async () => {
    renderAllocation({ ...defaultFilters, projectId: 'p-bry' });

    await screen.findByText('Italo Cesar Castro');

    expect(screen.getAllByText('84h').length).toBeGreaterThan(0);
    expect(screen.getByText('57h')).toBeInTheDocument();
    expect(screen.queryByText('72h')).not.toBeInTheDocument();

    await expandItalo();

    expect(screen.getByText('Plataforma Bry')).toBeInTheDocument();
    expect(screen.queryByText('Clube de Benefícios')).not.toBeInTheDocument();
    expect(supabaseRpc).toHaveBeenCalledWith('get_allocation_employee_month_summary', expect.objectContaining({ p_project_id: 'p-bry' }));
    expect(supabaseRpc).toHaveBeenCalledWith('get_allocation_employee_detail', expect.objectContaining({ p_project_id: 'p-bry' }));
  });

  it('mantem atividades internas separadas e somadas ao total real', async () => {
    includeActivity = true;
    renderAllocation();

    await screen.findByText('74h');
    await expandItalo();

    expect(screen.getByText('Administrativo')).toBeInTheDocument();
    expect(within(projectRow('Administrativo')).getByText('2h')).toBeInTheDocument();
  });

  it('usa a capacidade historica mensal retornada pela RPC quando a jornada muda no meio do ano', async () => {
    includeKauanyCapacity = true;
    renderAllocation();

    const kauanyRow = (await screen.findByText('Kauany Sebastiana Arantes')).closest('tr')!;

    expect(within(kauanyRow).getAllByText('Cap: 108h').length).toBeGreaterThan(0);
    expect(within(kauanyRow).getAllByText('Cap: 132h').length).toBeGreaterThan(0);
    expect(within(kauanyRow).getAllByText('Cap: 130h').length).toBeGreaterThan(0);
    expect(within(kauanyRow).getAllByText('Cap: 160h').length).toBeGreaterThan(0);
    expect(within(kauanyRow).getAllByText('Cap: 168h').length).toBeGreaterThan(0);
  });
});
