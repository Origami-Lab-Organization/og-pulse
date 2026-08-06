const LEGACY_SOURCE_KEYS = new Set([
  'financiamento_inovacao',
  'consultoria_estrategica',
  'product_studio',
  'educacao_corporativa',
  'ventures',
]);

export interface ServiceAvgTicketLookup {
  /** Ticket médio por `services.id` — o que o campo "Tipo de Serviço" do card grava. */
  byServiceId: Record<string, number>;
  /** Ticket médio por categoria de texto legada (leads antigos, pré-catálogo). */
  byLegacyKey: Record<string, number>;
}

export const EMPTY_AVG_TICKET_LOOKUP: ServiceAvgTicketLookup = {
  byServiceId: {},
  byLegacyKey: {},
};

interface LeadForValueEstimate {
  estimated_value: number;
  service_line: string | null;
  budget?: { final_total: number } | null;
}

/**
 * Valor estimado de uma oportunidade: orçamento vinculado (se houver) →
 * ticket médio do serviço selecionado → valor estimado manual do lead → 0.
 *
 * `lead.service_line` guarda o `services.id` escolhido no campo "Tipo de
 * Serviço"; leads antigos podem guardar uma das categorias de texto legadas.
 */
export function resolveLeadEstimatedValue(
  lead: LeadForValueEstimate,
  avgTickets: ServiceAvgTicketLookup,
): number {
  if (lead.budget?.final_total && lead.budget.final_total > 0) {
    return lead.budget.final_total;
  }

  if (lead.service_line) {
    const avgForService = LEGACY_SOURCE_KEYS.has(lead.service_line)
      ? avgTickets.byLegacyKey[lead.service_line]
      : avgTickets.byServiceId[lead.service_line];
    if (avgForService && avgForService > 0) return avgForService;
  }

  return lead.estimated_value || 0;
}
