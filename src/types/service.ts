export type ProjectType = 'fixed_scope' | 'continuous' | 'success_fee' | 'non_revenue';

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  fixed_scope: 'Escopo Fechado',
  continuous: 'Contínuo',
  success_fee: 'Success Fee',
  non_revenue: 'Sem Receita',
};

export interface ServiceDB {
  id: string;
  tenant_id: string;
  name: string;
  project_type: ProjectType;
  description: string | null;
  unit_price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
