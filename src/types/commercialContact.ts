import type { ProspectStage } from '@/types/prospect';

/**
 * Resumo de uma oportunidade lido fora do quadro (ficha do cliente, origem comercial do
 * projeto). Desde 09/10/2026 a oportunidade é da empresa e leva o nome dela; `contact_name` é o
 * contato principal, que pode faltar.
 */
export interface CommercialContactSummary {
  id: string;
  contact_name: string | null;
  stage: ProspectStage;
  won_value: number | null;
  estimated_value: number | null;
  created_at: string;
  company: { id: string; name: string; client_id: string | null } | null;
}
