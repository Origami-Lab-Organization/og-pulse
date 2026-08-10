import { supabase } from '@/integrations/supabase/client';
import { LeadWithBudget, CRMStage, CRM_FUNNEL_STAGES } from '@/types/lead';

export async function fetchLeads(tenantId: string): Promise<LeadWithBudget[]> {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      budget:budgets!leads_budget_id_fkey(id, budget_number, final_total, status, title, subtotal, total_with_fees, discount_value, duration_months, start_date, monthly_value, is_recurring),
      creator:employees!leads_created_by_fkey(id, nome),
      responsible:employees!leads_responsible_id_fkey(id, nome)
    `)
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as any) || [];
}

export async function fetchLeadsByClient(
  tenantId: string,
  clientId: string,
): Promise<LeadWithBudget[]> {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      budget:budgets!leads_budget_id_fkey(id, budget_number, final_total, status, title, subtotal, total_with_fees, discount_value, duration_months, start_date, monthly_value, is_recurring),
      creator:employees!leads_created_by_fkey(id, nome),
      responsible:employees!leads_responsible_id_fkey(id, nome)
    `)
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as LeadWithBudget[]) || [];
}

export async function fetchLeadById(id: string): Promise<LeadWithBudget | null> {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      budget:budgets!leads_budget_id_fkey(id, budget_number, final_total, status, title, subtotal, total_with_fees, discount_value, duration_months, start_date, monthly_value, is_recurring),
      creator:employees!leads_created_by_fkey(id, nome),
      responsible:employees!leads_responsible_id_fkey(id, nome)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as any;
}

export interface CreateLeadInput {
  tenant_id: string;
  name: string;
  company_name?: string;
  client_id?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  estimated_value?: number;
  source?: string;
  notes?: string;
  created_by?: string;
  service_line?: string;
  responsible_id?: string;
}

export async function createLead(input: CreateLeadInput) {
  const { data, error } = await supabase
    .from('leads')
    .insert({
      ...input,
      crm_stage: 'screening',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLeadStage(id: string, stage: CRMStage) {
  const updates: Record<string, any> = { crm_stage: stage };
  if (stage === 'closed') {
    updates.closed_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function updateLead(id: string, updates: Partial<CreateLeadInput>) {
  const { error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export async function linkBudgetToLead(leadId: string, budgetId: string) {
  const { error } = await supabase
    .from('leads')
    .update({ budget_id: budgetId })
    .eq('id', leadId);

  if (error) throw error;
}

export interface CloseLeadAsLostInput {
  id: string;
  reason: string;
  notes?: string;
  competitorName?: string | null;
}

/**
 * Dá perda na oportunidade. Perda e arquivamento são o MESMO evento: a
 * oportunidade sai do Kanban (archived=true) e passa a viver na aba "Perdas",
 * com `crm_stage='closed_lost'` registrando o desfecho e `lost_at`/`archived_at`
 * o carimbo. Não existe mais coluna "Fechado - Perda" no Pipeline nem
 * arquivamento sem motivo de perda.
 */
export async function closeLeadAsLost(input: CloseLeadAsLostInput) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('leads')
    .update({
      crm_stage: 'closed_lost',
      lost_at: now,
      archived: true,
      archived_at: now,
      restored_at: null,
      archive_reason: input.reason,
      archive_notes: input.notes || null,
      competitor_name: input.competitorName ?? null,
      follow_up_return_stage: null,
      follow_up_since: null,
    })
    .eq('id', input.id);

  if (error) throw error;

  await cancelPendingFollowUps(input.id);
}

/**
 * Cancela os follow-ups pendentes de uma oportunidade encerrada.
 *
 * Sem isso o lembrete agendado (notify-lead-follow-ups) continuaria cobrando
 * retorno de contato de negócio já perdido. Marcamos como 'skipped' em vez de
 * apagar: o histórico de que o retorno estava agendado e não aconteceu é
 * informação de diagnóstico comercial.
 */
async function cancelPendingFollowUps(leadId: string) {
  const { error } = await supabase
    .from('lead_follow_ups')
    .update({ status: 'skipped', updated_at: new Date().toISOString() })
    .eq('lead_id', leadId)
    .eq('status', 'pending');

  if (error) throw error;
}

export interface MoveLeadToFollowUpInput {
  id: string;
  /** Etapa atual — guardada para o retorno voltar de onde saiu. */
  fromStage: CRMStage;
}

/**
 * Coloca a oportunidade em Follow Up, guardando a etapa de origem.
 *
 * A data de retorno NÃO é gravada aqui: ela é um `lead_follow_ups` pendente
 * criado pelo chamador na mesma ação (ver useMoveLeadToFollowUp). Follow Up sem
 * follow-up pendente é estado inválido — é o esquecimento que a feature existe
 * para evitar.
 */
export async function moveLeadToFollowUp(input: MoveLeadToFollowUpInput) {
  const { error } = await supabase
    .from('leads')
    .update({
      crm_stage: 'follow_up',
      follow_up_return_stage: input.fromStage,
      follow_up_since: new Date().toISOString(),
    })
    .eq('id', input.id);

  if (error) throw error;
}

/** Etapa de retorno quando a origem não pôde ser recuperada. */
const FOLLOW_UP_FALLBACK_STAGE: CRMStage = 'qualification';

export function resolveFollowUpReturnStage(stage?: string | null): CRMStage {
  const isFunnelStage = !!stage && CRM_FUNNEL_STAGES.includes(stage as CRMStage);
  // 'closed' fica de fora: o fechamento tem fluxo próprio (criação de projeto)
  // e não pode ser alcançado por retomada.
  if (isFunnelStage && stage !== 'closed') return stage as CRMStage;
  return FOLLOW_UP_FALLBACK_STAGE;
}

/** Devolve a oportunidade ao funil, na etapa em que estava antes do Follow Up. */
export async function resumeLeadFromFollowUp(id: string, targetStage: CRMStage) {
  const { error } = await supabase
    .from('leads')
    .update({
      crm_stage: targetStage,
      follow_up_return_stage: null,
      follow_up_since: null,
    })
    .eq('id', id);

  if (error) throw error;
}

export async function fetchArchivedLeads(tenantId: string): Promise<LeadWithBudget[]> {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      budget:budgets!leads_budget_id_fkey(id, budget_number, final_total, status, title, subtotal, total_with_fees, discount_value, duration_months, start_date, monthly_value, is_recurring),
      creator:employees!leads_created_by_fkey(id, nome),
      responsible:employees!leads_responsible_id_fkey(id, nome)
    `)
    .eq('tenant_id', tenantId)
    .eq('archived', true)
    .order('archived_at', { ascending: false });

  if (error) throw error;
  return (data as any) || [];
}

/**
 * Reabre uma oportunidade perdida: limpa o desfecho (motivo, `lost_at`,
 * `archived_at`) e devolve a oportunidade ao Pipeline na etapa escolhida.
 */
export async function unarchiveLead(id: string, targetStage: CRMStage) {
  const { error } = await supabase
    .from('leads')
    .update({
      archived: false,
      archived_at: null,
      archive_reason: null,
      archive_notes: null,
      competitor_name: null,
      lost_at: null,
      crm_stage: targetStage,
      restored_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteLead(id: string) {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function fetchCRMReceivedValue(tenantId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_crm_received_value', {
    p_tenant_id: tenantId,
  });

  if (error) throw error;
  return (data as number) || 0;
}
