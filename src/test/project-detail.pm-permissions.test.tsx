import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectDetail from '@/pages/ProjectDetail';

const authState = vi.hoisted(() => ({
  employee: {
    id: 'manager-1',
    tenant_id: 'tenant-1',
    isAdmin: false,
    is_gerente: true,
  } as {
    id: string;
    tenant_id: string;
    isAdmin: boolean;
    is_gerente: boolean;
  },
  // A tela pergunta capacidade, não papel (ADR-0027). Gerente sem `projeto:gerir-qualquer`
  // vê o detalhe completo e só escreve no projeto que gerencia.
  capabilities: ['projeto:editar'] as string[],
}));

const projectState = vi.hoisted(() => ({
  project: undefined as ReturnType<typeof makeProject> | undefined,
}));

const allocationState = vi.hoisted(() => ({
  allocations: [] as { employeeId: string }[],
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'project-1' }),
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams()],
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    employee: authState.employee,
    loading: false,
    can: (required: string | readonly string[]) => {
      const list = typeof required === 'string' ? [required] : required;
      return list.some((key) => authState.capabilities.includes(key));
    },
  }),
}));

vi.mock('@/contexts/HideValuesContext', () => ({
  HideValuesProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useHideValuesPreference: () => [false, vi.fn()],
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: ReactNode }) => <button>{children}</button>,
}));

vi.mock('@/components/projects/detail/ProjectHeader', () => ({
  ProjectHeader: ({ actions }: { actions?: ReactNode }) => (
    <header>
      <span>Cabecalho do projeto</span>
      {actions}
    </header>
  ),
}));

vi.mock('@/components/projects/detail/ProjectOverviewTab', () => ({
  ProjectOverviewTab: () => <div>Overview</div>,
}));

vi.mock('@/components/projects/detail/ProjectPlanningOverviewTab', () => ({
  ProjectPlanningOverviewTab: () => <div>Planning overview</div>,
}));

vi.mock('@/components/projects/detail/ProjectCostsTab', () => ({
  ProjectCostsTab: ({ isEditable, canEditActuals }: { isEditable: boolean; canEditActuals: boolean }) => (
    <div data-testid="costs-permission">{String(isEditable)}-{String(canEditActuals)}</div>
  ),
}));

vi.mock('@/components/projects/detail/ProjectFinancialTab', () => ({
  ProjectFinancialTab: ({ isReadOnly, canManageInstallments }: { isReadOnly: boolean; canManageInstallments: boolean }) => (
    <div data-testid="financial-permission">{String(isReadOnly)}-{String(canManageInstallments)}</div>
  ),
}));

vi.mock('@/components/projects/detail/ProjectOKRsTab', () => ({
  ProjectOKRsTab: ({ isReadOnly }: { isReadOnly: boolean }) => (
    <div data-testid="okrs-readonly">{String(isReadOnly)}</div>
  ),
}));

vi.mock('@/components/projects/detail/ProjectStakeholdersTab', () => ({
  ProjectStakeholdersTab: ({ isReadOnly }: { isReadOnly: boolean }) => (
    <div data-testid="stakeholders-readonly">{String(isReadOnly)}</div>
  ),
}));

vi.mock('@/components/projects/detail/ProjectExpectedResultTab', () => ({
  ProjectExpectedResultTab: () => <div>Resultado esperado</div>,
}));

vi.mock('@/components/projects/detail/ProjectActivitiesTab', () => ({
  ProjectActivitiesTab: ({ isReadOnly }: { isReadOnly: boolean }) => (
    <div data-testid="activities-readonly">{String(isReadOnly)}</div>
  ),
}));

vi.mock('@/components/projects/ProjectFormDialog', () => ({
  ProjectFormDialog: () => null,
}));

vi.mock('@/components/projects/ProjectRemoveDialog', () => ({
  ProjectRemoveDialog: () => null,
}));

// A tela lê a equipe alocada para saber se quem abriu é membro (ADR-0006): o detalhe
// completo é de admin/gerente, mas Atividades e Arquivos também são de quem está no time.
vi.mock('@/components/projects/detail/ProjectRoadmapTab', () => ({
  ProjectRoadmapTab: ({ isReadOnly }: { isReadOnly: boolean }) => (
    <div data-testid="roadmap-readonly">{String(isReadOnly)}</div>
  ),
}));

vi.mock('@/components/projects/detail/EquipeTab', () => ({
  EquipeTab: ({ isReadOnly }: { isReadOnly: boolean }) => (
    <div data-testid="equipe-readonly">{String(isReadOnly)}</div>
  ),
}));

vi.mock('@/components/projects/detail/ProjectFilesTab', () => ({
  ProjectFilesTab: ({ isReadOnly }: { isReadOnly: boolean }) => (
    <div data-testid="files-readonly">{String(isReadOnly)}</div>
  ),
}));

vi.mock('@/hooks/useProjectRoles', () => ({
  useProjectAllocations: () => ({ data: allocationState.allocations, isLoading: false }),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProject: () => ({ data: projectState.project, isLoading: false }),
  useUpdateProject: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteProject: () => ({ mutate: vi.fn(), isPending: false }),
  useArchiveProject: () => ({ mutate: vi.fn(), isPending: false }),
}));

function makeProject(managerId: string) {
  return {
    id: 'project-1',
    name: 'Projeto Alpha',
    tenant_id: 'tenant-1',
    manager_id: managerId,
    portfolio_stage: 'value_delivery',
    status: 'active',
    members: [],
    client_id: 'client-1',
    start_date: '2026-01-01',
    end_date: '2026-06-30',
    is_continuous: false,
    value_book_url: null,
  };
}

describe('ProjectDetail PM permissions', () => {
  beforeEach(() => {
    authState.employee = {
      id: 'manager-1',
      tenant_id: 'tenant-1',
      isAdmin: false,
      is_gerente: true,
    };
    authState.capabilities = ['projeto:editar'];
    allocationState.allocations = [];
    projectState.project = makeProject('manager-2');
  });

  it('deixa gerente nao-PM em modo leitura no detalhe completo', () => {
    render(<ProjectDetail />);

    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    expect(screen.getByTestId('okrs-readonly')).toHaveTextContent('true');
    expect(screen.getByTestId('activities-readonly')).toHaveTextContent('true');
  });

  // Regressão do incidente do deploy de PUL-206: sem capacidade confirmada, a tela
  // mostrava só Atividades e Arquivos para quem era admin. O conjunto de abas é
  // consequência da capacidade, então o teste fixa as duas pontas.
  it('quem tem capacidade de projeto ve o detalhe completo', () => {
    render(<ProjectDetail />);

    expect(screen.getByText('Visão Geral')).toBeInTheDocument();
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
    expect(screen.getByText('Atividades')).toBeInTheDocument();
  });

  it('sem capacidade de projeto, quem esta alocado ve apenas Atividades e Arquivos', () => {
    authState.capabilities = [];
    allocationState.allocations = [{ employeeId: 'manager-1' }];

    render(<ProjectDetail />);

    expect(screen.queryByText('Visão Geral')).not.toBeInTheDocument();
    expect(screen.queryByText('Financeiro')).not.toBeInTheDocument();
    expect(screen.getByText('Atividades')).toBeInTheDocument();
    expect(screen.getByText('Arquivos')).toBeInTheDocument();
  });

  it('permite edicao para o PM do projeto ainda nao concluido', () => {
    projectState.project = makeProject('manager-1');

    render(<ProjectDetail />);

    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.getByTestId('okrs-readonly')).toHaveTextContent('false');
    expect(screen.getByTestId('activities-readonly')).toHaveTextContent('false');
  });
});
