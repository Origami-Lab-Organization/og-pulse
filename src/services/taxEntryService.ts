import { supabase } from '@/integrations/supabase/client';
import type { TaxEntryDB, CreateTaxEntryInput, UpdateTaxEntryInput } from '@/types/taxEntry';

export const taxEntryService = {
  async getAll(tenantId: string, year?: number): Promise<TaxEntryDB[]> {
    let query = supabase
      .from('tax_entries' as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('reference_month', { ascending: false });

    if (year) {
      query = query
        .gte('reference_month', `${year}-01-01`)
        .lte('reference_month', `${year}-12-31`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as TaxEntryDB[];
  },

  async getByDateRange(tenantId: string, startDate: string, endDate: string): Promise<TaxEntryDB[]> {
    const { data, error } = await supabase
      .from('tax_entries' as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('reference_month', startDate)
      .lte('reference_month', endDate)
      .order('reference_month');

    if (error) throw error;
    return (data || []) as unknown as TaxEntryDB[];
  },

  async getByPaymentDateRange(tenantId: string, startDate: string, endDate: string): Promise<TaxEntryDB[]> {
    const { data, error } = await supabase
      .from('tax_entries' as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      .order('payment_date');

    if (error) throw error;
    return (data || []) as unknown as TaxEntryDB[];
  },

  async getLatest(tenantId: string): Promise<TaxEntryDB | null> {
    const { data, error } = await supabase
      .from('tax_entries' as any)
      .select('*')
      .eq('tenant_id', tenantId)
      .order('reference_month', { ascending: false })
      .limit(1);

    if (error) throw error;
    return (data && data.length > 0) ? (data[0] as unknown as TaxEntryDB) : null;
  },

  async create(input: CreateTaxEntryInput, tenantId: string): Promise<TaxEntryDB> {
    const { data, error } = await supabase
      .from('tax_entries' as any)
      .insert([{ ...input, tenant_id: tenantId }])
      .select()
      .single();

    if (error) throw error;
    return data as unknown as TaxEntryDB;
  },

  async update(id: string, input: UpdateTaxEntryInput): Promise<TaxEntryDB> {
    const { data, error } = await supabase
      .from('tax_entries' as any)
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as TaxEntryDB;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('tax_entries' as any)
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async uploadFile(tenantId: string, file: File): Promise<string> {
    const path = `${tenantId}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage
      .from('tax-documents')
      .upload(path, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('tax-documents')
      .getPublicUrl(path);

    return urlData.publicUrl;
  },

  async getSignedUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage
      .from('tax-documents')
      .createSignedUrl(path, 3600);

    if (error) throw error;
    return data.signedUrl;
  },
};
