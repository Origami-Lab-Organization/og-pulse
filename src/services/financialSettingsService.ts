import { supabase } from '@/integrations/supabase/client';
import { FinancialSettings, FinancialSettingsFormData } from '@/types/financialSettings';

export const financialSettingsService = {
  async getSettings(tenantId: string): Promise<FinancialSettings | null> {
    const { data, error } = await supabase
      .from('financial_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching financial settings:', error);
      throw error;
    }

    return data;
  },

  async upsertSettings(tenantId: string, formData: FinancialSettingsFormData): Promise<FinancialSettings> {
    // Check if settings already exist
    const existing = await this.getSettings(tenantId);

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('financial_settings')
        .update({
          admin_expenses_percent: formData.admin_expenses_percent,
          taxes_percent: formData.taxes_percent,
          commission_percent: formData.commission_percent,
        })
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        console.error('Error updating financial settings:', error);
        throw error;
      }

      return data;
    } else {
      // Insert
      const { data, error } = await supabase
        .from('financial_settings')
        .insert({
          tenant_id: tenantId,
          admin_expenses_percent: formData.admin_expenses_percent,
          taxes_percent: formData.taxes_percent,
          commission_percent: formData.commission_percent,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating financial settings:', error);
        throw error;
      }

      return data;
    }
  },
};
