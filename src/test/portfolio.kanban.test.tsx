import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PortfolioKanbanBoard } from '@/components/portfolio/PortfolioKanbanBoard';
import { PortfolioProject } from '@/hooks/usePortfolioProjects';

const dnd = vi.hoisted(() => ({
  dragEnd: undefined as undefined | ((event: unknown) => unknown),
}));

const updateStageMutate = vi.hoisted(() => vi.fn());
const checkCompletionReadiness = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({
    children,
    onDragEnd,
  }: {
    children: ReactNode;
    onDragEnd: (event: unknown) => unknown;
  }) => {
    dnd.dragEnd = onDragEnd;
    return <div>{children}</div>;
  },
  DragOverlay: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PointerSensor: function PointerSensor() {},
  pointerWithin: vi.fn(),
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn((...sensors: unknown[]) => sensors),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ open, children }: { open: boolean; children: ReactNode }) => (
    open ? <div role="dialog">{children}</div> : null
  ),
  AlertDialogCancel: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  AlertDialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    employee: {
      id: 'manager-1',
      tenant_id: 'tenant-1',
      isAdmin: false,
      is_gerente: true,
    },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast }),
}));

vi.mock('@/hooks/usePortfolioProjects', async () => {
  const actual = await vi.importActual<typeof import('@/hooks/usePortfolioProjects')>(
    '@/hooks/usePortfolioProjects'
  );

  return {
    ...actual,
    useUpdatePortfolioStage: () => ({
      mutate: updateStageMutate,
      isPending: false,
    }),
  };
});

vi.mock('@/hooks/useProjectPlanningReadiness', () => ({
  useProjectPlanningReadiness: () => ({
    checkCompletionReadiness,
  }),
}));

const baseProject: PortfolioProject = {
  id: 'project-1',
  name: 'Projeto Alpha',
  total_value: 10000,
  start_date: '2026-01-01',
  end_date: '2026-05-31',
  completed_date: null,
  is_continuous: false,
  portfolio_stage: 'value_delivery',
  lead_id: null,
  service_line: null,
  client: {
    id: 'client-1',
    company_name: 'Cliente Alpha',
    trading_name: null,
  },
  manager: {
    id: 'manager-1',
    nome: 'Gerente Alpha',
    cargo: 'PM',
  },
  installments: [],
};

function renderBoard(project: PortfolioProject = baseProject) {
  return render(<PortfolioKanbanBoard projects={[project]} />);
}

function todayInputValue() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
}

async function dropProject(targetId: string) {
  await act(async () => {
    await dnd.dragEnd?.({
      active: { id: 'project-1' },
      over: { id: targetId },
    });
  });
}

describe('PortfolioKanbanBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dnd.dragEnd = undefined;
    checkCompletionReadiness.mockResolvedValue({
      ready: true,
      missing: [],
      pendingInstallmentsCount: 0,
      totalInstallmentsCount: 0,
      pendingMilestonesCount: 0,
      totalMilestonesCount: 1,
    });
  });

  it('permite mover direto de Entrega de Valor para Apresentacao de Resultados', async () => {
    renderBoard();

    await dropProject('results_presentation');

    expect(updateStageMutate).toHaveBeenCalledWith({
      projectId: 'project-1',
      newStage: 'results_presentation',
    });
  });

  it('permite mover direto de Entrega de Valor para Aprendizado e Case', async () => {
    renderBoard();

    await dropProject('learning_case');

    expect(updateStageMutate).toHaveBeenCalledWith({
      projectId: 'project-1',
      newStage: 'learning_case',
    });
  });

  it('abre o modal de data ao tentar concluir', async () => {
    renderBoard();

    await dropProject('completed');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Concluir projeto?')).toBeInTheDocument();
    expect(screen.getByLabelText('Data real de conclusão')).toHaveAttribute('type', 'date');
    expect(updateStageMutate).not.toHaveBeenCalled();
  });

  it('bloqueia conclusao com etapa do cronograma pendente', async () => {
    checkCompletionReadiness.mockResolvedValueOnce({
      ready: false,
      missing: ['Todas as etapas do cronograma concluídas (1 de 2 pendentes)'],
      pendingInstallmentsCount: 0,
      totalInstallmentsCount: 0,
      pendingMilestonesCount: 1,
      totalMilestonesCount: 2,
    });
    renderBoard();
    await dropProject('completed');

    fireEvent.click(screen.getByText('Concluir projeto'));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Projeto não pode ser concluído',
      }));
    });
    expect(updateStageMutate).not.toHaveBeenCalled();
  });

  it('bloqueia conclusao com parcela pendente', async () => {
    checkCompletionReadiness.mockResolvedValueOnce({
      ready: false,
      missing: ['Todos os pagamentos recebidos (1 de 3 pendentes)'],
      pendingInstallmentsCount: 1,
      totalInstallmentsCount: 3,
      pendingMilestonesCount: 0,
      totalMilestonesCount: 1,
    });
    renderBoard();
    await dropProject('completed');

    fireEvent.click(screen.getByText('Concluir projeto'));

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Projeto não pode ser concluído',
      }));
    });
    expect(updateStageMutate).not.toHaveBeenCalled();
  });

  it('conclui quando todas as etapas e parcelas estao finalizadas', async () => {
    renderBoard();
    await dropProject('completed');
    const completionDate = todayInputValue();
    fireEvent.change(screen.getByLabelText('Data real de conclusão'), {
      target: { value: completionDate },
    });

    fireEvent.click(screen.getByText('Concluir projeto'));

    await waitFor(() => {
      expect(updateStageMutate).toHaveBeenCalledWith({
        projectId: 'project-1',
        newStage: 'completed',
        completedDate: completionDate,
      });
    });
  });

  it('considera projeto sem parcelas como quitado quando o cronograma esta concluido', async () => {
    checkCompletionReadiness.mockResolvedValueOnce({
      ready: true,
      missing: [],
      pendingInstallmentsCount: 0,
      totalInstallmentsCount: 0,
      pendingMilestonesCount: 0,
      totalMilestonesCount: 1,
    });
    renderBoard();
    await dropProject('completed');
    const completionDate = todayInputValue();
    fireEvent.change(screen.getByLabelText('Data real de conclusão'), {
      target: { value: completionDate },
    });

    fireEvent.click(screen.getByText('Concluir projeto'));

    await waitFor(() => {
      expect(updateStageMutate).toHaveBeenCalledWith(expect.objectContaining({
        newStage: 'completed',
        completedDate: completionDate,
      }));
    });
  });
});
