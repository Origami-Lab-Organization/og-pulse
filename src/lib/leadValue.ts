import { Service } from '@/types/service';

const LEGACY_SOURCE_KEYS = new Set([
  'financiamento_inovacao',
  'consultoria_estrategica',
  'product_studio',
  'educacao_corporativa',
  'ventures',
]);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ServiceLineAvgTicketLookup {
  byServiceLineId: Record<string, number>;
  byLegacyKey: Record<string, number>;
}

export const EMPTY_AVG_TICKET_LOOKUP: ServiceLineAvgTicketLookup = {
  byServiceLineId: {},
  byLegacyKey: {},
};

interface LeadForValueEstimate {
  estimated_value: number;
  service_line: string | null;
  budget?: { final_total: number } | null;
}

/**
 * Valor estimado de uma oportunidade: orçamento vinculado (se houver) →
 * ticket médio da linha de serviço (catálogo real ou categoria legada) →
 * valor estimado manual do lead → 0.
 */
export function resolveLeadEstimatedValue(
  lead: LeadForValueEstimate,
  services: Service[],
  avgTickets: ServiceLineAvgTicketLookup,
): number {
  if (lead.budget?.final_total && lead.budget.final_total > 0) {
    return lead.budget.final_total;
  }

  if (lead.service_line) {
    if (UUID_RE.test(lead.service_line)) {
      const service = services.find((s) => s.id === lead.service_line);
      const lineId = service?.serviceLineId;
      const avgForLine = lineId ? avgTickets.byServiceLineId[lineId] : undefined;
      if (avgForLine && avgForLine > 0) return avgForLine;
    } else if (LEGACY_SOURCE_KEYS.has(lead.service_line)) {
      const avgForLegacy = avgTickets.byLegacyKey[lead.service_line];
      if (avgForLegacy && avgForLegacy > 0) return avgForLegacy;
    }
  }

  return lead.estimated_value || 0;
}
