import { AllocationMarginImpact } from '@/types/equipe.types';

export interface PlannedMarginBase {
  revenue: number;
  commissionPlanned: number;
  costPlanned: number;
  marginPlanned: number;
}

/**
 * Reconcilia o resultado da RPC `simulate_allocation_margin_impact` com a margem planejada
 * exibida nas telas do projeto (Visão Geral/Financeiro). A RPC só entra com o custo estimado
 * da alocação; "antes → depois" parte da mesma base de custo das telas, sem impostos.
 * O veredito e o Δ vs baseline continuam os da RPC; a baseline exibida é derivada do Δ para
 * que `simulada − Δ = baseline` feche na tela.
 */
export function alignImpactToPlannedMargin(
  impact: AllocationMarginImpact,
  planned: PlannedMarginBase,
): AllocationMarginImpact {
  if (impact.isNonRevenue || planned.revenue <= 0) return impact;

  const totalCost = planned.costPlanned + impact.custoEstimado;
  const margemSimulada = ((planned.revenue - planned.commissionPlanned - totalCost) / planned.revenue) * 100;

  return {
    ...impact,
    margemAtual: planned.marginPlanned,
    margemSimulada,
    margemBaseline: impact.deltaPp != null ? margemSimulada - impact.deltaPp : impact.margemBaseline,
  };
}
