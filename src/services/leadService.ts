import { supabase } from '@/integrations/supabase/client';
import { LeadWithBudget, CRMStage } from '@/types/lead';

export async function fetchLeads(tenantId: string): Promise<LeadWithBudget[]> {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      budget:budgets!leads_budget_id_fkey(id, budget_number, final_total, status, title, subtotal, total_with_fees, discount_value, duration_months, start_date),
      creator:employees!leads_created_by_fkey(id, nome)
    `)
    .eq('tenant_id', tenantId)
    .eq('archived', false)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as any) || [];
}

export async function fetchLeadById(id: string): Promise<LeadWithBudget | null> {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      budget:budgets!leads_budget_id_fkey(id, budget_number, final_total, status, title, subtotal, total_with_fees, discount_value, duration_months, start_date),
      creator:employees!leads_created_by_fkey(id, nome)
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
  const { error } = await supabase
    .from('leads')
    .update({ crm_stage: stage })
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

export interface ArchiveLeadInput {
  id: string;
  archive_reason: string;
  archive_notes?: string;
}

export async function archiveLead(input: ArchiveLeadInput) {
  const { error } = await supabase
    .from('leads')
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
      archive_reason: input.archive_reason,
      archive_notes: input.archive_notes || null,
    })
    .eq('id', input.id);

  if (error) throw error;
}
