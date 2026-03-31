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
  // Extrato do Simples Nacional fields
  rbt12: number;
  rpa: number;
  aliquota_simples: number;
  irpj: number;
  csll: number;
  cofins: number;
  pis_pasep: number;
  inss_cpp: number;
  iss: number;
}

export interface CreateTaxEntryInput {
  reference_month: string;
  payment_date: string;
  total_value: number;
  description?: string;
  file_url?: string;
  rbt12?: number;
  rpa?: number;
  aliquota_simples?: number;
  irpj?: number;
  csll?: number;
  cofins?: number;
  pis_pasep?: number;
  inss_cpp?: number;
  iss?: number;
}

export interface UpdateTaxEntryInput {
  payment_date?: string;
  total_value?: number;
  description?: string;
  file_url?: string;
  rbt12?: number;
  rpa?: number;
  aliquota_simples?: number;
  irpj?: number;
  csll?: number;
  cofins?: number;
  pis_pasep?: number;
  inss_cpp?: number;
  iss?: number;
}
