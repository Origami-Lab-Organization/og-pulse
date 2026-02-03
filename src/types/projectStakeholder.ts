export type InfluenceLevel = 'high' | 'medium' | 'low';
export type InterestLevel = 'high' | 'medium' | 'low';

export interface ProjectStakeholder {
  id: string;
  project_id: string;
  name: string;
  role: string;
  organization: string | null;
  email: string | null;
  phone: string | null;
  influence_level: InfluenceLevel | null;
  interest_level: InterestLevel | null;
  notes: string | null;
  created_at: string;
}

export interface CreateStakeholderInput {
  projectId: string;
  name: string;
  role: string;
  organization?: string;
  email?: string;
  phone?: string;
  influenceLevel?: InfluenceLevel;
  interestLevel?: InterestLevel;
  notes?: string;
}

export interface UpdateStakeholderInput {
  name?: string;
  role?: string;
  organization?: string;
  email?: string;
  phone?: string;
  influenceLevel?: InfluenceLevel;
  interestLevel?: InterestLevel;
  notes?: string;
}

export const STAKEHOLDER_ROLES = [
  { value: 'sponsor', label: 'Patrocinador' },
  { value: 'product_owner', label: 'Product Owner' },
  { value: 'tech_lead', label: 'Tech Lead' },
  { value: 'decision_maker', label: 'Tomador de Decisão' },
  { value: 'user', label: 'Usuário Final' },
  { value: 'subject_expert', label: 'Especialista' },
  { value: 'project_manager', label: 'Gerente de Projeto' },
  { value: 'other', label: 'Outro' },
];

export const INFLUENCE_LEVEL_LABELS: Record<InfluenceLevel, string> = {
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
};

export const INTEREST_LEVEL_LABELS: Record<InterestLevel, string> = {
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

export const ORGANIZATION_OPTIONS = [
  { value: 'client', label: 'Cliente' },
  { value: 'internal', label: 'Interna' },
  { value: 'partner', label: 'Parceiro' },
  { value: 'other', label: 'Outro' },
];
