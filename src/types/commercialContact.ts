import type { ProspectStage } from '@/types/prospect';

/**
 * Resumo de um contato da Prospecção lido fora da Prospecção (ficha do cliente, origem
 * comercial do projeto). Desde 29/09/2026 a Oportunidade vive como contato da Prospecção.
 */
export interface CommercialContactSummary {
  id: string;
  contact_name: string;
  stage: ProspectStage;
  won_value: number | null;
  estimated_value: number | null;
  created_at: string;
  company: { id: string; name: string; client_id: string | null } | null;
}
