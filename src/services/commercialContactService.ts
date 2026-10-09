import { resolveProspectValue } from '@/lib/prospecting/value';
import { tabela } from '@/services/prospectingTables';
import type { CommercialContactSummary } from '@/types/commercialContact';

/**
 * Leituras curtas de contatos da Prospecção para telas FORA da Prospecção — ficha do
 * cliente e origem comercial do projeto.
 *
 * Desde 29/09/2026 a Oportunidade vive como contato da Prospecção (migração
 * 20260929120000): a tabela `leads` saiu, e o que era "oportunidade do cliente" passou a
 * ser "contato de uma empresa da Prospecção ligada ao cliente" (`prospect_companies.client_id`).
 * A barreira continua sendo a RLS de `prospects` (`prospeccao:ler`); a tela só esconde.
 */

const COMPANY_EMBED = 'company:prospect_companies!prospects_company_id_fkey!inner';

const SUMMARY_SELECT = `id, contact_name, stage, won_value, estimated_value, created_at, ${COMPANY_EMBED}(id, name, client_id)`;

/** Valor exibido do contato: o vendido quando ganho, senão o estimado. */
export function commercialContactValue(
  contact: Pick<CommercialContactSummary, 'stage' | 'won_value' | 'estimated_value'>,
): number | null {
  // Regra única do valor (ADR-0017). Sem orçamento aqui: a lista do cliente não o carrega.
  const valor = resolveProspectValue(contact);
  return valor > 0 ? valor : null;
}

/** Endereço da oportunidade no quadro (`?contato=` continua aceito para link antigo). */
export function commercialContactHref(prospectId: string): string {
  return `/comercial/prospeccao?oportunidade=${encodeURIComponent(prospectId)}`;
}

export async function fetchCommercialContactsByClient(
  tenantId: string,
  clientId: string,
): Promise<CommercialContactSummary[]> {
  const { data, error } = await tabela('prospects')
    .select(SUMMARY_SELECT)
    .eq('tenant_id', tenantId)
    .eq('company.client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as CommercialContactSummary[];
}

/** Contatos em andamento ou ganhos do cliente — os descartados não contam como vínculo. */
export async function countCommercialContactsByClient(
  tenantId: string,
  clientId: string,
): Promise<number> {
  const { count, error } = await tabela('prospects')
    .select(`id, ${COMPANY_EMBED}(client_id)`, { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('company.client_id', clientId)
    .neq('stage', 'descartado');

  if (error) throw error;
  return count ?? 0;
}

export async function fetchCommercialContactSummary(
  prospectId: string,
): Promise<CommercialContactSummary | null> {
  const { data, error } = await tabela('prospects')
    .select(SUMMARY_SELECT)
    .eq('id', prospectId)
    .maybeSingle();

  if (error) throw error;
  return (data as CommercialContactSummary | null) ?? null;
}
