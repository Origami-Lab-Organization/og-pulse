import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { allocationService } from '@/services/allocationService';
import { buildAllocationMonths } from '@/lib/allocationGrid';
import { AllocationFiltersState, AllocationMonth } from '@/types/allocation';
import { useHolidays } from '@/hooks/useHolidays';

export function useAllocationGrid({
  tenantId,
  filters,
  offsetStart,
  periodLength,
  baseDate,
  monthsOverride,
}: {
  tenantId: string | undefined;
  filters: AllocationFiltersState;
  offsetStart: number;
  periodLength: number;
  baseDate: Date;
  /** Janela explícita (planejamento). Quando informada, ignora offsetStart/periodLength e o clamp padrão. */
  monthsOverride?: AllocationMonth[];
}) {
  const { data: holidays = [] } = useHolidays();

  const months = useMemo(
    () => monthsOverride ?? buildAllocationMonths(baseDate, offsetStart, periodLength, holidays),
    [monthsOverride, baseDate, holidays, offsetStart, periodLength],
  );

  // Só o projeto muda o que vem do banco; busca, cargo, status e desligados filtram no
  // cliente. Com o objeto `filters` inteiro na chave, cada tecla da busca refazia a grade.
  return useQuery({
    queryKey: ['allocation-grid', tenantId, months.map((month) => month.key), filters.projectId],
    queryFn: () => {
      if (!tenantId) {
        return Promise.resolve({ months, people: [], roles: [], projects: [] });
      }

      return allocationService.getGrid({
        tenantId,
        months,
        projectId: filters.projectId,
      });
    },
    enabled: !!tenantId,
    refetchOnWindowFocus: true,
  });
}

/** Só o resumo por pessoa e mês, para a tela de uma pessoa (o detalhe dela vem do painel). */
export function useAllocationSummaryGrid({
  tenantId,
  offsetStart,
  periodLength,
  baseDate,
}: {
  tenantId: string | undefined;
  offsetStart: number;
  periodLength: number;
  baseDate: Date;
}) {
  const { data: holidays = [] } = useHolidays();
  const months = useMemo(
    () => buildAllocationMonths(baseDate, offsetStart, periodLength, holidays),
    [baseDate, holidays, offsetStart, periodLength],
  );

  return useQuery({
    queryKey: ['allocation-grid', 'resumo', tenantId, months.map((month) => month.key)],
    queryFn: () => allocationService.getSummaryGrid({ tenantId: tenantId as string, months }),
    enabled: !!tenantId,
    refetchOnWindowFocus: true,
  });
}

/**
 * Só o planejado, para o planejamento de capacidade (Meu Time). Fica sob o prefixo
 * `allocation-grid` para cair nas mesmas invalidações de quem altera alocação.
 */
export function useAllocationPlanningGrid({ tenantId, months }: { tenantId: string | undefined; months: AllocationMonth[] }) {
  return useQuery({
    queryKey: ['allocation-grid', 'planejamento', tenantId, months.map((month) => month.key)],
    queryFn: () => allocationService.getPlanningGrid({ tenantId: tenantId as string, months }),
    enabled: !!tenantId,
    refetchOnWindowFocus: true,
  });
}
