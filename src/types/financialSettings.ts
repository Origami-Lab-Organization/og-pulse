export interface FinancialSettings {
  id: string;
  tenant_id: string;
  admin_expenses_percent: number;
  taxes_percent: number;
  commission_percent: number;
  net_margin_percent: number;
  gross_margin_target_percent: number;
  created_at: string;
  updated_at: string;
}

export interface FinancialSettingsFormData {
  admin_expenses_percent: number;
  taxes_percent: number;
  commission_percent: number;
  net_margin_percent: number;
  gross_margin_target_percent: number;
}
