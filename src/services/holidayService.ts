import { supabase } from '@/integrations/supabase/client';
import { Holiday, HolidayFormData } from '@/types/holiday';

export const holidayService = {
  async getAll(): Promise<Holiday[]> {
    const { data, error } = await supabase
      .from('company_holidays')
      .select('*')
      .eq('is_active', true)
      .order('fixed_month', { ascending: true, nullsFirst: false })
      .order('fixed_day', { ascending: true, nullsFirst: false })
      .order('specific_date', { ascending: true, nullsFirst: false });

    if (error) throw error;
    return data as Holiday[];
  },

  async create(tenantId: string, formData: HolidayFormData): Promise<Holiday> {
    const insertData: any = {
      tenant_id: tenantId,
      name: formData.name,
      holiday_type: formData.holiday_type,
    };

    if (formData.holiday_type === 'fixed') {
      insertData.fixed_day = formData.fixed_day;
      insertData.fixed_month = formData.fixed_month;
    } else {
      insertData.specific_date = formData.specific_date;
      if (formData.holiday_type === 'floating') {
        insertData.reference_year = formData.reference_year;
      }
    }

    const { data, error } = await supabase
      .from('company_holidays')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data as Holiday;
  },

  async update(id: string, formData: HolidayFormData): Promise<Holiday> {
    const updateData: any = {
      name: formData.name,
      holiday_type: formData.holiday_type,
      fixed_day: null,
      fixed_month: null,
      specific_date: null,
      reference_year: null,
    };

    if (formData.holiday_type === 'fixed') {
      updateData.fixed_day = formData.fixed_day;
      updateData.fixed_month = formData.fixed_month;
    } else {
      updateData.specific_date = formData.specific_date;
      if (formData.holiday_type === 'floating') {
        updateData.reference_year = formData.reference_year;
      }
    }

    const { data, error } = await supabase
      .from('company_holidays')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Holiday;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('company_holidays')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
