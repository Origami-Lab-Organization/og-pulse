import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { allocationService } from '@/services/allocationService';
import { buildAllocationMonths } from '@/lib/allocationGrid';
import { AllocationFiltersState } from '@/types/allocation';
import { useHolidays } from '@/hooks/useHolidays';

export function useAllocationGrid({
  tenantId,
  filters,
  offsetStart,
  periodLength,
  baseDate,
}: {
  tenantId: string | undefined;
  filters: AllocationFiltersState;
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
    queryKey: ['allocation-grid', tenantId, months.map((month) => month.key), filters],
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
  });
}
