import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CloseBusinessDialog } from '@/components/crm/CloseBusinessDialog';
import type { BudgetWithDetails } from '@/types/budget';
import type { LeadWithBudget } from '@/types/lead';
import type { Service } from '@/types/service';

const confettiMock = vi.hoisted(() => vi.fn());
const employeesMock = vi.hoisted(() => [
  {
    id: 'manager-1',
    nome: 'Maria GP',
    systemRole: 'manager',
  },
]);

vi.mock('canvas-confetti', () => ({
  default: confettiMock,
}));

vi.mock('@/hooks/useEmployees', () => ({
  useEmployees: () => ({
    data: employeesMock,
  }),
}));

vi.mock('@/hooks/useClients', () => ({
  useClients: () => ({ data: [] }),
}));

function makeLead(): LeadWithBudget {
  return {
    id: 'lead-1',
    name: 'Implantacao Pulse',
    company_name: 'Cliente Alpha',
    client_id: 'client-1',
    responsible_id: 'manager-1',
    service_line: 'service-1',
    estimated_value: 1000,
  } as unknown as LeadWithBudget;
}

function makeBudget(): BudgetWithDetails {
  return {
    id: 'budget-1',
    title: 'Implantacao Pulse',
    budget_number: 'ORC-001',
    client_id: 'client-1',
    client: { company_name: 'Cliente Alpha' },
    lead_name: 'Implantacao Pulse',
    final_total: 1000,
    start_date: '2026-01-01',
    duration_months: 6,
    suppliers: [],
    materials: [],
    roles: [],
  } as unknown as BudgetWithDetails;
}

function makeService(billingType: Service['billingType']): Service {
  return {
    id: 'service-1',
    billingType,
  } as unknown as Service;
}

describe('CloseBusinessDialog', () => {
  beforeEach(() => {
    confettiMock.mockClear();
  });

  it('mostra distribuir igualmente apenas para escopo fechado e celebra no sucesso', async () => {
    const onConfirm = vi.fn().mockResolvedValue({ id: 'project-1' });

    render(
      <CloseBusinessDialog
        open
        onOpenChange={vi.fn()}
        budget={makeBudget()}
        lead={makeLead()}
        onConfirm={onConfirm}
        services={[makeService('fixed_scope')]}
      />
    );

    expect(screen.getByRole('button', { name: /distribuir igualmente/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /distribuir igualmente/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar e celebrar/i }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onConfirm.mock.calls[0][0].installments).toHaveLength(6);
    expect(onConfirm.mock.calls[0][0].installments.reduce(
      (sum: number, installment: { value: number }) => sum + installment.value,
      0
    )).toBe(1000);

    await waitFor(() => expect(confettiMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('heading', { name: /cliente alpha fechado/i })).toBeInTheDocument();
    expect(screen.getByText('Resumo do fechamento')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.000,00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continuar/i })).toBeInTheDocument();
  });

  it('nao mostra parcelas em sem receita', () => {
    render(
      <CloseBusinessDialog
        open
        onOpenChange={vi.fn()}
        budget={makeBudget()}
        lead={makeLead()}
        onConfirm={vi.fn()}
        services={[makeService('no_revenue')]}
      />
    );

    expect(screen.queryByRole('button', { name: /distribuir igualmente/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/cronograma de parcelas/i)).not.toBeInTheDocument();
  });

  it('nao celebra quando a confirmacao falha', async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error('falha de banco'));

    render(
      <CloseBusinessDialog
        open
        onOpenChange={vi.fn()}
        budget={makeBudget()}
        lead={makeLead()}
        onConfirm={onConfirm}
        services={[makeService('fixed_scope')]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /confirmar e celebrar/i }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(confettiMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: /fechado/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /confirmar e celebrar/i })).toBeInTheDocument();
  });
});
