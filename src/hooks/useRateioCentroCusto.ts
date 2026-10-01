import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { PayrollAnalysisRow } from '@/lib/payrollAnalysis';
import { allocatePerson, collectHours } from '@/lib/rateioCentroCusto';
import { fetchRateioInputs } from '@/services/rateioService';
import type { PersonAllocation } from '@/types/rateio';

function monthBounds(monthKey: string): { start: string; end: string } {
  const [y, m] = monthKey.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { start: `${monthKey}-01`, end: `${monthKey}-${String(last).padStart(2, '0')}` };
}

/** Rateio do mês para as linhas da Custo x Hora. `monthKey` = 'yyyy-MM'. */
export function useRateioCentroCusto(monthKey: string | undefined, rows: readonly PayrollAnalysisRow[]) {
  const { employee } = useAuth();
  const tenantId = employee?.tenant_id;
  const query = useQuery({
    queryKey: ['rateio-centro-custo', tenantId, monthKey],
    queryFn: () => {
      const { start, end } = monthBounds(monthKey as string);
      return fetchRateioInputs(tenantId as string, start, end);
    },
    enabled: Boolean(tenantId && monthKey),
  });

  const allocations = useMemo((): PersonAllocation[] => {
    if (!query.data) return [];
    const hours = collectHours(query.data.costInputs);
    const centerNames = new Map(query.data.costInputs.centers.map((c) => [c.id, c.name]));
    return rows
      .filter((r) => r.totalMonthlyCost > 0)
      .map((r) => allocatePerson(r, hours.get(r.employeeId), query.data.lotacao.get(r.employeeId), centerNames))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [query.data, rows]);

  return { ...query, allocations };
}
