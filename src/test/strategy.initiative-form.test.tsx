import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InitiativeFormDialog } from '@/components/strategy/InitiativeFormDialog';
import { StrategyInitiative, StrategyObjectiveWithKrs } from '@/types/strategy';

const createMutateAsync = vi.fn();
const updateMutateAsync = vi.fn();

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({
    data: [
      { id: 'emp-1', nome: 'Victor', status: 'ativo' },
      { id: 'emp-2', nome: 'Maria', status: 'ativo' },
    ],
  }),
}));

vi.mock('@/hooks/useStrategy', () => ({
  useCreateStrategyInitiative: () => ({
    mutateAsync: createMutateAsync,
    isPending: false,
  }),
  useUpdateStrategyInitiative: () => ({
    mutateAsync: updateMutateAsync,
    isPending: false,
  }),
}));

const objective: StrategyObjectiveWithKrs = {
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
};

const initiative: StrategyInitiative = {
  id: 'init-1',
  tenantId: 'tenant-1',
  objectiveId: 'obj-1',
  title: 'Abrir nova frente comercial',
  description: 'Contexto legado',
  notes: null,
  status: 'review',
  priority: 'media',
  effort: 3,
  position: 0,
  ownerId: 'emp-2',
  ownerName: 'Maria',
  dueDate: '2026-06-15',
  objectiveTitle: 'Dobrar receita',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('InitiativeFormDialog', () => {
  beforeEach(() => {
    createMutateAsync.mockReset().mockResolvedValue({});
    updateMutateAsync.mockReset().mockResolvedValue({});
  });

  it('submits create payload with due date and notes', async () => {
    const onOpenChange = vi.fn();

    render(
      <InitiativeFormDialog
        open
        onOpenChange={onOpenChange}
        objectives={[objective]}
        defaultObjectiveId={objective.id}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Título/i), {
      target: { value: 'Lançar operação outbound' },
    });
    fireEvent.change(screen.getByLabelText(/Conclusão prevista/i), {
      target: { value: '2026-05-30' },
    });
    fireEvent.change(screen.getByLabelText(/Observações/i), {
      target: { value: 'Depende da definição do playbook comercial.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Criar Iniciativa/i }));

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith({
        title: 'Lançar operação outbound',
        objective_id: 'obj-1',
        status: 'backlog',
        priority: null,
        effort: null,
        owner_id: null,
        due_date: '2026-05-30',
        notes: 'Depende da definição do playbook comercial.',
        position: 0,
      });
    });

    expect(updateMutateAsync).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('submits edit payload with updated due date and notes', async () => {
    const onOpenChange = vi.fn();

    render(
      <InitiativeFormDialog
        open
        onOpenChange={onOpenChange}
        objectives={[objective]}
        initiative={initiative}
      />,
    );

    expect(screen.getByLabelText(/Observações/i)).toHaveValue('Contexto legado');

    fireEvent.change(screen.getByLabelText(/Título/i), {
      target: { value: 'Abrir nova frente enterprise' },
    });
    fireEvent.change(screen.getByLabelText(/Conclusão prevista/i), {
      target: { value: '2026-07-01' },
    });
    fireEvent.change(screen.getByLabelText(/Observações/i), {
      target: { value: 'Aguardar alinhamento com marketing e pricing.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => {
      expect(updateMutateAsync).toHaveBeenCalledWith({
        id: 'init-1',
        updates: {
          title: 'Abrir nova frente enterprise',
          objective_id: 'obj-1',
          status: 'review',
          priority: null,
          effort: null,
          owner_id: 'emp-2',
          due_date: '2026-07-01',
          notes: 'Aguardar alinhamento com marketing e pricing.',
        },
      });
    });

    expect(createMutateAsync).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
