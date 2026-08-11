interface LeadForValueEstimate {
  estimated_value: number;
  budget?: { final_total: number } | null;
}

/**
 * Valor de uma oportunidade — fonte única de verdade.
 *
 * Orçamento vinculado (se houver total fechado) → valor estimado informado
 * manualmente na oportunidade → 0.
 *
 * Não existe mais estimativa automática por ticket médio de serviço: enquanto
 * não há orçamento, o valor é o que a pessoa responsável pela oportunidade
 * informou. Ver ADR-0017.
 */
export function resolveLeadEstimatedValue(lead: LeadForValueEstimate): number {
  if (lead.budget?.final_total && lead.budget.final_total > 0) {
    return lead.budget.final_total;
  }

  return lead.estimated_value || 0;
}
