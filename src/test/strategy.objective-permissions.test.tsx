import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ObjectiveCard } from '@/components/strategy/ObjectiveCard';
import { ObjectiveDetailModal } from '@/components/strategy/ObjectiveDetailModal';
import { StrategyKeyResult, StrategyObjectiveWithKrs } from '@/types/strategy';

vi.mock('@/hooks/useStrategy', () => ({
  useDeleteStrategyObjective: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeleteStrategyKeyResult: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

const keyResult: StrategyKeyResult = {
  id: 'kr-1',
  tenantId: 'tenant-1',
  objectiveId: 'obj-1',
  title: 'Atingir 90% de margem bruta',
  description: null,
  initialValue: 0,
  targetValue: 90,
  currentValue: 45,
  confidence: 7,
  unit: '%',
  direction: 'higher_is_better',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  checkins: [],
};

const objective: StrategyObjectiveWithKrs = {
  id: 'obj-1',
  tenantId: 'tenant-1',
  cycleId: 'cycle-1',
  title: 'Melhorar margem',
  description: 'Aumentar eficiencia operacional sem perder qualidade.',
  ownerId: 'emp-1',
  ownerName: 'Victor',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  keyResults: [keyResult],
  avgProgress: 50,
  avgConfidence: 7,
};

describe('Strategy OKR permissions', () => {
  it('keeps OKR actions hidden for managers with read-only OKR access', () => {
    const { container } = render(
      <ObjectiveCard
        objective={objective}
        canManageOkrs={false}
        cycleIsActive
        onClick={vi.fn()}
        onAddKr={vi.fn()}
        onCheckin={vi.fn()}
        onDeleteObjective={vi.fn()}
        onEditObjective={vi.fn()}
      />,
    );

    expect(screen.getByText('Melhorar margem')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Check-in/i })).not.toBeInTheDocument();
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });

  it('shows OKR actions for admins in an active cycle', () => {
    const { container } = render(
      <ObjectiveCard
        objective={objective}
        canManageOkrs
        cycleIsActive
        onClick={vi.fn()}
        onAddKr={vi.fn()}
        onCheckin={vi.fn()}
        onDeleteObjective={vi.fn()}
        onEditObjective={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Check-in/i })).toBeInTheDocument();
    expect(container.querySelectorAll('button')).toHaveLength(3);
  });

  it('keeps the objective detail modal read-only when OKR management is not allowed', () => {
    render(
      <ObjectiveDetailModal
        open
        onOpenChange={vi.fn()}
        objective={objective}
        canManageOkrs={false}
        cycleIsActive
        cycleStart="2026-01-01"
        cycleEnd="2026-12-31"
        onAddKr={vi.fn()}
        onCheckin={vi.fn()}
        onEdit={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );

    expect(screen.getByText('Key Results')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Check-in/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Adicionar Key Result/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Excluir objetivo/i })).not.toBeInTheDocument();
  });
});
