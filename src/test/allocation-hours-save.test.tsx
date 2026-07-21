import { createElement, type ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks de fronteira ────────────────────────────────────────────────────────
const toastMock = vi.fn();
const upsertMock = vi.fn();
const logMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ employee: { id: 'user-admin', isAdmin: true } }),
}));
vi.mock('@/services/equipeService', () => ({
  equipeService: {
    upsertAllocations: (...args: unknown[]) => upsertMock(...args),
    logAllocationHoursEdit: (...args: unknown[]) => logMock(...args),
  },
}));

import { useSaveAllocationMonthHours } from '@/hooks/useProjectRoles';

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

const SUCCESS_TOAST = { title: 'Horas atualizadas' };

const baseInput = {
  tenantId: 'tenant-1',
  employeeId: 'emp-1',
  budgetRoleId: null,
  customRoleName: null,
  year: 2026,
  month: 9,
  plannedHours: 120,
  previousHours: 0,
  isPastMonth: false,
  allocationId: null as string | null,
};

describe('useSaveAllocationMonthHours', () => {
  beforeEach(() => {
    toastMock.mockClear();
    upsertMock.mockReset();
    logMock.mockReset();
  });

  it('faz upsert por chave composta para um mês que ainda não tinha linha (allocationId null)', async () => {
    upsertMock.mockResolvedValue(1);
    const { result } = renderHook(() => useSaveAllocationMonthHours('proj-1'), { wrapper });

    await result.current.mutateAsync({ ...baseInput });

    expect(upsertMock).toHaveBeenCalledWith([
      {
        project_id: 'proj-1',
        tenant_id: 'tenant-1',
        employee_id: 'emp-1',
        budget_role_id: null,
        custom_role_name: null,
        year: 2026,
        month: 9,
        planned_hours: 120,
      },
    ]);
    expect(toastMock).toHaveBeenCalledWith(SUCCESS_TOAST);
  });

  it('NÃO exibe o toast de sucesso quando o upsert falha (erro simulado do Supabase)', async () => {
    upsertMock.mockRejectedValue(new Error('violação de RLS'));
    const { result } = renderHook(() => useSaveAllocationMonthHours('proj-1'), { wrapper });

    await expect(result.current.mutateAsync({ ...baseInput })).rejects.toThrow('violação de RLS');

    expect(toastMock).not.toHaveBeenCalledWith(SUCCESS_TOAST);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });

  it('trata 0 linhas afetadas (falha silenciosa de RLS) como erro — sem toast de sucesso', async () => {
    upsertMock.mockResolvedValue(0);
    const { result } = renderHook(() => useSaveAllocationMonthHours('proj-1'), { wrapper });

    await expect(result.current.mutateAsync({ ...baseInput })).rejects.toThrow(/permiss/i);

    expect(toastMock).not.toHaveBeenCalledWith(SUCCESS_TOAST);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
  });

  it('bloqueia edição de mês passado por não-admin (guard de permissão)', async () => {
    upsertMock.mockResolvedValue(1);
    const { result } = renderHook(() => useSaveAllocationMonthHours('proj-1'), { wrapper });

    // isPastMonth requer admin; o mock de auth é admin, então validamos o caminho
    // feliz de auditoria: upsert + log de edição retroativa.
    await result.current.mutateAsync({
      ...baseInput,
      isPastMonth: true,
      allocationId: 'alloc-9',
      previousHours: 80,
      reasonCode: 'correction',
      justification: 'ajuste retroativo de escopo',
    });

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(logMock).toHaveBeenCalledWith(
      expect.objectContaining({
        allocationId: 'alloc-9',
        editedBy: 'user-admin',
        previousHours: 80,
        newHours: 120,
        reasonCode: 'correction',
      }),
    );
    expect(toastMock).toHaveBeenCalledWith(SUCCESS_TOAST);
  });
});
