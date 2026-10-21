import { supabase } from '@/integrations/supabase/client';
import type { InternalProductSummary } from '@/types/internalProduct';

/**
 * Produtos internos (ADR-0049). Uma chamada só: a RPC confere `produto:ler`, recorta pelo
 * tenant de quem chama e só devolve custo para quem tem `financeiro:ler`.
 */
export const internalProductService = {
  async overview(): Promise<InternalProductSummary[]> {
    const { data, error } = await supabase.rpc('internal_products_overview');
    if (error) throw error;

    return (data ?? []).map((row) => ({
      projectId: row.project_id,
      name: row.name,
      portfolioStage: row.portfolio_stage,
      managerName: row.manager_name ?? 'não definido',
      teamSize: row.team_size,
      hoursTotal: Number(row.hours_total),
      hoursMonth: Number(row.hours_month),
      costTotal: row.cost_total === null ? null : Number(row.cost_total),
      costMonth: row.cost_month === null ? null : Number(row.cost_month),
      firstHourOn: row.first_hour_on,
      nextMilestone: row.next_milestone_title
        ? { title: row.next_milestone_title, on: row.next_milestone_on }
        : null,
      lastRelease: row.last_release_name ? { name: row.last_release_name, on: row.last_release_on } : null,
    }));
  },
};
