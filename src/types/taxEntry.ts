export interface TaxEntryDB {
  id: string;
  tenant_id: string;
  reference_month: string; // 'YYYY-MM-DD' first day of month
  payment_date: string;
  total_value: number;
  description: string | null;
  file_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTaxEntryInput {
  reference_month: string;
  payment_date: string;
  total_value: number;
  description?: string;
  file_url?: string;
}

export interface UpdateTaxEntryInput {
  payment_date?: string;
  total_value?: number;
  description?: string;
  file_url?: string;
}
