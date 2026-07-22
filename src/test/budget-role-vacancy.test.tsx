import { createElement, type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const toastMock = vi.fn();
const createVacancyRowMock = vi.fn();
const setTeamRowDeletedAtMock = vi.fn();
const zeroTeamRowMonthsMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ employee: { id: 'u1', isAdmin: true } }) }));
vi.mock('@/services/equipeService', () => ({
  equipeService: {
    createVacancyRow: (...a: unknown[]) => createVacancyRowMock(...a),
    setTeamRowDeletedAt: (...a: unknown[]) => setTeamRowDeletedAtMock(...a),
    zeroTeamRowMonths: (...a: unknown[]) => zeroTeamRowMonthsMock(...a),
  },
}));

import {
  useMaterializeBudgetRoleVacancy,
  useSuppressBudgetRoleVacancy,
  useZeroBudgetRoleVacancy,
} from '@/hooks/useProjectRoles';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return createElement(QueryClientProvider, { client: qc }, children);
}

const months = [
  { year: 2026, month: 7, plannedHours: 120 },
  { year: 2026, month: 8, plannedHours: 100 },
];

describe('papel orçado — materialização / supressão / zerar', () => {
  beforeEach(() => {
    toastMock.mockClear();
    createVacancyRowMock.mockReset().mockResolvedValue('new-row-1');
    setTeamRowDeletedAtMock.mockReset().mockResolvedValue(undefined);
    zeroTeamRowMonthsMock.mockReset().mockResolvedValue(undefined);
  });

  it('materializa a vaga orçada criando uma linha real (item 3)', async () => {
    const { result } = renderHook(() => useMaterializeBudgetRoleVacancy('proj-1'), { wrapper });
    await result.current.mutateAsync({ tenantId: 't1', budgetRoleId: 'br1', monthlyHours: months });
    expect(createVacancyRowMock).toHaveBeenCalledWith({
      projectId: 'proj-1',
      tenantId: 't1',
      budgetRoleId: 'br1',
      monthlyHours: months,
    });
    expect(setTeamRowDeletedAtMock).not.toHaveBeenCalled();
  });

  it('suprime papel JÁ materializado via soft-delete (item 2)', async () => {
    const { result } = renderHook(() => useSuppressBudgetRoleVacancy('proj-1'), { wrapper });
    await result.current.mutateAsync({ vacancyRowId: 'row-9', tenantId: 't1', budgetRoleId: 'br1', monthlyHours: months });
    expect(setTeamRowDeletedAtMock).toHaveBeenCalledWith('row-9', expect.any(String));
    expect(createVacancyRowMock).not.toHaveBeenCalled();
  });

  it('suprime papel NÃO materializado: cria a linha e já marca deleted_at', async () => {
    const { result } = renderHook(() => useSuppressBudgetRoleVacancy('proj-1'), { wrapper });
    await result.current.mutateAsync({ vacancyRowId: null, tenantId: 't1', budgetRoleId: 'br1', monthlyHours: months });
    expect(createVacancyRowMock).toHaveBeenCalledTimes(1);
    expect(setTeamRowDeletedAtMock).toHaveBeenCalledWith('new-row-1', expect.any(String));
  });

  it('zerar horas de papel materializado zera os meses (alternativa reversível)', async () => {
    const { result } = renderHook(() => useZeroBudgetRoleVacancy('proj-1'), { wrapper });
    await result.current.mutateAsync({ vacancyRowId: 'row-9', tenantId: 't1', budgetRoleId: 'br1', monthlyHours: months });
    expect(zeroTeamRowMonthsMock).toHaveBeenCalledWith('row-9');
    expect(createVacancyRowMock).not.toHaveBeenCalled();
  });

  it('zerar horas de papel não materializado cria a linha com todos os meses em 0', async () => {
    const { result } = renderHook(() => useZeroBudgetRoleVacancy('proj-1'), { wrapper });
    await result.current.mutateAsync({ vacancyRowId: null, tenantId: 't1', budgetRoleId: 'br1', monthlyHours: months });
    expect(createVacancyRowMock).toHaveBeenCalledWith(
      expect.objectContaining({
        monthlyHours: [
          { year: 2026, month: 7, plannedHours: 0 },
          { year: 2026, month: 8, plannedHours: 0 },
        ],
      }),
    );
  });
});
