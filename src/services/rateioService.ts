import { supabase } from '@/integrations/supabase/client';
import { fetchCostInputs } from '@/services/costCenterCostService';
import type { CostInputs } from '@/services/costCenterCostService';
import type { PersonLotacao } from '@/types/rateio';

export interface RateioInputs {
  costInputs: CostInputs;
  lotacao: Map<string, PersonLotacao>;
}

interface LotacaoRow {
  id: string;
  aloca_em_projetos: boolean | null;
  cost_center_id: string | null;
}

/**
 * Entradas do rateio do mês: as horas por centro (a mesma busca do custo por centro, paginada) e a
 * lotação de quem não lança hora. `cost_center_id` de `employees` existe no banco desde PUL-218,
 * mas ainda não entrou nos tipos gerados — por isso o cast.
 */
export async function fetchRateioInputs(tenantId: string, monthStart: string, monthEnd: string): Promise<RateioInputs> {
  const [costInputs, lotacaoRes] = await Promise.all([
    fetchCostInputs(tenantId, monthStart, monthEnd),
    supabase.from('employees').select('id, aloca_em_projetos, cost_center_id' as 'id').eq('tenant_id', tenantId),
  ]);
  if (lotacaoRes.error) throw lotacaoRes.error;
  const rows = (lotacaoRes.data ?? []) as unknown as LotacaoRow[];
  const lotacao = new Map(rows.map((r) => [r.id, { logsHours: r.aloca_em_projetos !== false, costCenterId: r.cost_center_id }]));
  return { costInputs, lotacao };
}
