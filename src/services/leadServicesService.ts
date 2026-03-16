import { supabase } from '@/integrations/supabase/client';

export interface LeadServiceRow {
  id: string;
  lead_id: string;
  service_id: string;
  tenant_id: string;
  custom_value: number | null;
  custom_billing_unit: string | null;
  notes: string | null;
}

export interface UpsertLeadServicesInput {
  leadId: string;
  tenantId: string;
  items: {
    serviceId: string;
    customValue?: number | null;
    customBillingUnit?: string | null;
    notes?: string | null;
  }[];
}

export const leadServicesService = {
  // Fetch all lead_services for the current tenant (RLS applies)
  async getAll(): Promise<LeadServiceRow[]> {
    const { data, error } = await supabase
      .from('lead_services')
      .select('*');

    if (error) throw error;
    return (data || []) as unknown as LeadServiceRow[];
  },

  async getByLead(leadId: string): Promise<LeadServiceRow[]> {
    const { data, error } = await supabase
      .from('lead_services')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at');

    if (error) throw error;
    return (data || []) as unknown as LeadServiceRow[];
  },

  async upsert(input: UpsertLeadServicesInput): Promise<void> {
    // Delete all existing entries for this lead, then re-insert
    const { error: delError } = await supabase
      .from('lead_services')
      .delete()
      .eq('lead_id', input.leadId);

    if (delError) throw delError;
    if (input.items.length === 0) return;

    const rows = input.items.map((item) => ({
      lead_id: input.leadId,
      tenant_id: input.tenantId,
      service_id: item.serviceId,
      custom_value: item.customValue ?? null,
      custom_billing_unit: item.customBillingUnit ?? null,
      notes: item.notes ?? null,
    }));

    const { error } = await supabase.from('lead_services').insert(rows);
    if (error) throw error;
  },
};
