import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Portfolio from '@/pages/Portfolio';

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
}));

const portfolioState = vi.hoisted(() => ({
  lastFilters: undefined as undefined | {
    clientId?: string;
    serviceLine?: string;
    managerId?: string;
    year?: number;
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ employee: authState.employee }),
}));

vi.mock('@/contexts/HideValuesContext', () => ({
  useHideValuesPreference: () => [false, vi.fn()],
}));

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children, actions }: { children: ReactNode; actions?: ReactNode }) => (
    <div>
      <div>{actions}</div>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/portfolio/PortfolioKPIBar', () => ({
  PortfolioKPIBar: () => <div data-testid="kpi-bar" />,
}));

vi.mock('@/components/portfolio/PortfolioKanbanBoard', () => ({
  PortfolioKanbanBoard: () => <div data-testid="kanban-board" />,
}));

vi.mock('@/components/portfolio/PortfolioTable', () => ({
  PortfolioTable: () => <div data-testid="portfolio-table" />,
}));

vi.mock('@/components/projects/ProjectRemoveDialog', () => ({
  ProjectRemoveDialog: () => null,
}));

vi.mock('@/hooks/useProjects', () => ({
  useDeleteProject: () => ({ mutate: vi.fn(), isPending: false }),
  useArchiveProject: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/usePortfolioProjects', () => ({
  usePortfolioProjects: (_search: string, filters: typeof portfolioState.lastFilters) => {
    portfolioState.lastFilters = filters;
    return {
      isLoading: false,
      data: [
        {
          id: 'project-1',
          name: 'Projeto Alpha',
          manager_id: 'manager-1',
          total_value: 0,
          start_date: '2026-01-01',
          end_date: null,
          is_continuous: false,
          portfolio_stage: 'planning',
          lead_id: null,
          installments: [],
        },
      ],
    };
  },
}));

vi.mock('@/components/portfolio/PortfolioFilters', () => ({
  PortfolioFilters: ({
    canFilterManagers,
    managerId,
    onManagerChange,
  }: {
    canFilterManagers: boolean;
    managerId: string;
    onManagerChange: (value: string) => void;
  }) => (
    <div>
      {canFilterManagers && <span data-testid="manager-filter">manager-filter</span>}
      <span data-testid="manager-id">{managerId}</span>
      <button onClick={() => onManagerChange('')}>Limpar gerente</button>
    </div>
  ),
}));

describe('Portfolio PM permissions', () => {
  beforeEach(() => {
    portfolioState.lastFilters = undefined;
    authState.employee = {
      id: 'manager-1',
      tenant_id: 'tenant-1',
      isAdmin: false,
      is_gerente: true,
    };
  });

  it('aplica o filtro inicial do proprio PM ao abrir o portfolio', async () => {
    render(<Portfolio />);

    expect(screen.getByTestId('manager-filter')).toBeInTheDocument();
    await waitFor(() => {
      expect(portfolioState.lastFilters?.managerId).toBe('manager-1');
    });
  });

  it('permite limpar o filtro de gerente para visualizar todos os projetos', async () => {
    render(<Portfolio />);

    await waitFor(() => {
      expect(portfolioState.lastFilters?.managerId).toBe('manager-1');
    });

    fireEvent.click(screen.getByText('Limpar gerente'));

    await waitFor(() => {
      expect(portfolioState.lastFilters?.managerId).toBe('');
    });
  });

  it('admin nao recebe filtro inicial de gerente', async () => {
    authState.employee = {
      id: 'admin-1',
      tenant_id: 'tenant-1',
      isAdmin: true,
      is_gerente: true,
    };

    render(<Portfolio />);

    await waitFor(() => {
      expect(portfolioState.lastFilters?.managerId).toBe('');
    });
  });
});
