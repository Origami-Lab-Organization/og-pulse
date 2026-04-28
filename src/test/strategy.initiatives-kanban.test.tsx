import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InitiativesKanban } from '@/components/strategy/InitiativesKanban';
import {
  getStrategyInitiativeBadgeClass,
  strategyInitiativeBadgePalette,
} from '@/lib/strategyInitiativeBadge';
import { StrategyInitiative, StrategyObjectiveWithKrs } from '@/types/strategy';

const deleteMutate = vi.fn();
const reorderMutate = vi.fn();
const updateStatusMutate = vi.fn();
const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PointerSensor: function PointerSensor() {},
  closestCorners: vi.fn(),
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
  }),
  verticalListSortingStrategy: {},
  arrayMove: (items: unknown[], oldIndex: number, newIndex: number) => {
    const next = [...items];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    return next;
  },
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => undefined,
    },
  },
}));

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({ data: [] }),
}));

vi.mock('@/components/ui/select', async () => {
  const React = await import('react');

  const SelectTrigger = (props: Record<string, unknown>) => React.createElement('mock-select-trigger', props);
  const SelectContent = ({ children }: { children: ReactNode }) => <>{children}</>;
  const SelectValue = () => null;
  const SelectItem = (props: Record<string, unknown>) => React.createElement('mock-select-item', props);

  const extractText = (children: ReactNode): string => {
    if (typeof children === 'string') return children;
    if (typeof children === 'number') return String(children);
    if (!children) return '';

    return React.Children.toArray(children)
      .map((child) => {
        if (typeof child === 'string' || typeof child === 'number') return String(child);
        if (React.isValidElement(child)) {
          return extractText(child.props.children as ReactNode);
        }
        return '';
      })
      .join('')
      .trim();
  };

  const walkTree = (children: ReactNode) => {
    const options: { value: string; label: string }[] = [];
    let triggerProps: Record<string, unknown> = {};

    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;

      if (child.type === SelectTrigger) {
        triggerProps = child.props as Record<string, unknown>;
      }

      if (child.type === SelectItem) {
        options.push({
          value: child.props.value as string,
          label: extractText(child.props.children as ReactNode),
        });
      }

      if (child.props?.children) {
        const nested = walkTree(child.props.children as ReactNode);
        options.push(...nested.options);
        if (Object.keys(nested.triggerProps).length > 0) {
          triggerProps = nested.triggerProps;
        }
      }
    });

    return { options, triggerProps };
  };

  const Select = ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: ReactNode;
  }) => {
    const { options, triggerProps } = walkTree(children);

    return (
      <select
        aria-label={triggerProps['aria-label'] as string | undefined}
        className={triggerProps.className as string | undefined}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };

  return {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  };
});

vi.mock('@/hooks/useStrategy', () => ({
  useDeleteStrategyInitiative: () => ({
    mutate: deleteMutate,
  }),
  useReorderInitiatives: () => ({
    mutate: reorderMutate,
  }),
  useUpdateInitiativeStatus: () => ({
    mutate: updateStatusMutate,
  }),
  useCreateStrategyInitiative: () => ({
    mutateAsync: createMutateAsync,
    isPending: false,
  }),
  useUpdateStrategyInitiative: () => ({
    mutateAsync: updateMutateAsync,
    isPending: false,
  }),
}));

const objectives: StrategyObjectiveWithKrs[] = [
  {
    id: 'obj-1',
    tenantId: 'tenant-1',
    cycleId: 'cycle-1',
    title: 'Dobrar receita',
    description: null,
    ownerId: 'emp-1',
    ownerName: 'Victor',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    keyResults: [],
    avgProgress: 0,
    avgConfidence: 8,
  },
  {
    id: 'obj-2',
    tenantId: 'tenant-1',
    cycleId: 'cycle-1',
    title: 'Melhorar margem',
    description: null,
    ownerId: 'emp-2',
    ownerName: 'Maria',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    keyResults: [],
    avgProgress: 0,
    avgConfidence: 3,
  },
];

const initiatives: StrategyInitiative[] = [
  {
    id: 'init-1',
    tenantId: 'tenant-1',
    objectiveId: 'obj-1',
    title: 'Padronizar Sprint 0',
    description: null,
    notes: 'Validar com time comercial antes de escalar.',
    status: 'backlog',
    priority: 'alta',
    effort: 2,
    position: 0,
    ownerId: 'emp-1',
    ownerName: 'Victor',
    dueDate: '2026-05-15',
    objectiveTitle: 'Dobrar receita',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'init-2',
    tenantId: 'tenant-1',
    objectiveId: 'obj-2',
    title: 'Renegociar fornecedores',
    description: null,
    notes: 'Mapear contratos críticos do trimestre.',
    status: 'backlog',
    priority: 'media',
    effort: 1,
    position: 1,
    ownerId: 'emp-2',
    ownerName: 'Maria',
    dueDate: null,
    objectiveTitle: 'Melhorar margem',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'init-3',
    tenantId: 'tenant-1',
    objectiveId: 'obj-1',
    title: 'Criar playbook de discovery',
    description: null,
    notes: null,
    status: 'review',
    priority: 'baixa',
    effort: 3,
    position: 0,
    ownerId: null,
    ownerName: null,
    dueDate: '2026-06-10',
    objectiveTitle: 'Dobrar receita',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

describe('InitiativesKanban', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('filters initiatives by owner including unassigned option', async () => {
    render(
      <InitiativesKanban
        initiatives={initiatives}
        objectives={objectives}
        cycleId="cycle-1"
        cycleIsActive
      />,
    );

    const ownerFilter = screen.getByLabelText('Filtrar por responsavel');
    expect(screen.getByRole('option', { name: 'Victor' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sem responsável' })).toBeInTheDocument();

    fireEvent.change(ownerFilter, { target: { value: 'emp-1' } });

    await waitFor(() => {
      expect(screen.getByText('Padronizar Sprint 0')).toBeInTheDocument();
      expect(screen.queryByText('Renegociar fornecedores')).not.toBeInTheDocument();
      expect(screen.queryByText('Criar playbook de discovery')).not.toBeInTheDocument();
    });

    fireEvent.change(ownerFilter, { target: { value: '__unassigned__' } });

    await waitFor(() => {
      expect(screen.getByText('Criar playbook de discovery')).toBeInTheDocument();
      expect(screen.queryByText('Padronizar Sprint 0')).not.toBeInTheDocument();
    });
  });

  it('opens the detail dialog when clicking a card', async () => {
    render(
      <InitiativesKanban
        initiatives={initiatives}
        objectives={objectives}
        cycleId="cycle-1"
        cycleIsActive
      />,
    );

    fireEvent.click(screen.getByText('Padronizar Sprint 0'));

    expect(await screen.findByText('Observacoes')).toBeInTheDocument();
    expect(screen.getByText('Validar com time comercial antes de escalar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });

  it('shows the due date on the initiative card', () => {
    render(
      <InitiativesKanban
        initiatives={initiatives}
        objectives={objectives}
        cycleId="cycle-1"
        cycleIsActive
      />,
    );

    expect(screen.getByText('15/05/2026')).toBeInTheDocument();
  });

  it('keeps the same badge color for initiatives under the same OKR', () => {
    render(
      <InitiativesKanban
        initiatives={initiatives}
        objectives={objectives}
        cycleId="cycle-1"
        cycleIsActive
      />,
    );

    const revenueBadgeTexts = screen
      .getAllByText('Dobrar receita')
      .filter((element) => element.tagName !== 'OPTION');
    const marginBadgeText = screen.getAllByText('Melhorar margem').find((element) => element.tagName !== 'OPTION');

    const revenueBadges = revenueBadgeTexts.map((element) => element.closest('div'));
    const marginBadge = marginBadgeText?.closest('div');
    const revenueBadgeClass = getStrategyInitiativeBadgeClass('obj-1').split(' ')[0];
    const marginBadgeClass = getStrategyInitiativeBadgeClass('obj-2').split(' ')[0];

    expect(strategyInitiativeBadgePalette).toContain(getStrategyInitiativeBadgeClass('obj-1'));
    expect(strategyInitiativeBadgePalette).toContain(getStrategyInitiativeBadgeClass('obj-2'));
    expect(revenueBadges).toHaveLength(2);
    revenueBadges.forEach((badge) => expect(badge).toHaveClass(revenueBadgeClass));
    expect(marginBadge).toHaveClass(marginBadgeClass);
    expect(revenueBadgeClass).not.toBe(marginBadgeClass);
  });

  it('does not open the detail dialog when deleting a card', async () => {
    deleteMutate.mockImplementation((_id: string, opts?: { onSuccess?: () => void }) => {
      opts?.onSuccess?.();
    });

    render(
      <InitiativesKanban
        initiatives={initiatives}
        objectives={objectives}
        cycleId="cycle-1"
        cycleIsActive
      />,
    );

    const card = screen.getByText('Padronizar Sprint 0').closest('.group');
    const deleteButton = within(card as HTMLElement).getByRole('button');

    fireEvent.click(deleteButton);

    expect(await screen.findByText('Excluir iniciativa?')).toBeInTheDocument();
    expect(screen.queryByText('Observacoes')).not.toBeInTheDocument();
  });
});
