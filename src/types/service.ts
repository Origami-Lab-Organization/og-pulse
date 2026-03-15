import { ProjectType } from './project';

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

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  projectType: ProjectType;
  description: string | null;
  unitPrice: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServiceInput {
  name: string;
  projectType: ProjectType;
  description?: string;
  unitPrice?: number;
}

export const dbToService = (db: ServiceDB): Service => ({
  id: db.id,
  tenantId: db.tenant_id,
  name: db.name,
  projectType: db.project_type,
  description: db.description,
  unitPrice: db.unit_price,
  isActive: db.is_active,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  fixed_scope: 'Escopo Fixo',
  continuous: 'Receita Recorrente',
  success_fee: 'Taxa de Sucesso',
  non_revenue: 'Sem Receita',
};

export const DEFAULT_SERVICES: Omit<CreateServiceInput, never>[] = [
  { name: 'Consultoria de Projeto', projectType: 'fixed_scope' },
  { name: 'Desenvolvimento de Software', projectType: 'fixed_scope' },
  { name: 'Suporte Técnico Mensal', projectType: 'continuous' },
  { name: 'Gestão Contínua', projectType: 'continuous' },
  { name: 'Consultoria em Incentivos Fiscais (Lei do Bem)', projectType: 'success_fee' },
  { name: 'Captação de Recursos', projectType: 'success_fee' },
  { name: 'Discovery / Pré-venda', projectType: 'non_revenue' },
  { name: 'Prospecção', projectType: 'non_revenue' },
];
