import { supabase } from '@/integrations/supabase/client';
import { LeadWithBudget, CRMStage } from '@/types/lead';

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
    })
    .eq('id', input.id);

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
