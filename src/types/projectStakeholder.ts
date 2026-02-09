export type InfluenceLevel = 'high' | 'medium' | 'low';
export type InterestLevel = 'high' | 'medium' | 'low';
export type SponsorshipLevel = 'promoter' | 'neutral' | 'detractor';
export type StakeholderAction = 'keep_satisfied' | 'keep_informed' | 'manage_closely' | 'involve_in_rituals';

export interface ProjectStakeholder {
  id: string;
  project_id: string;
  name: string;
  job_title: string | null;
  role: string;
  organization: string | null;
  email: string | null;
  phone: string | null;
  influence_level: InfluenceLevel | null;
  interest_level: InterestLevel | null;
  sponsorship_level: SponsorshipLevel | null;
  action: StakeholderAction | null;
  notes: string | null;
  created_at: string;
}

export interface CreateStakeholderInput {
  projectId: string;
  name: string;
  jobTitle?: string;
  role: string;
  organization?: string;
  email?: string;
  phone?: string;
  influenceLevel?: InfluenceLevel;
  interestLevel?: InterestLevel;
  sponsorshipLevel?: SponsorshipLevel;
  action?: StakeholderAction;
  notes?: string;
}

export interface UpdateStakeholderInput {
  name?: string;
  jobTitle?: string;
  role?: string;
  organization?: string;
  email?: string;
  phone?: string;
  influenceLevel?: InfluenceLevel;
  interestLevel?: InterestLevel;
  sponsorshipLevel?: SponsorshipLevel;
  action?: StakeholderAction;
  notes?: string;
}

export const STAKEHOLDER_ROLES = [
  { value: 'decision_maker', label: 'Decisor' },
  { value: 'subject_expert', label: 'Especialista' },
  { value: 'sponsor', label: 'Patrocinador' },
  { value: 'user', label: 'Usuário Final' },
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

export const SPONSORSHIP_LEVEL_LABELS: Record<SponsorshipLevel, string> = {
  promoter: 'Promotor',
  neutral: 'Neutro',
  detractor: 'Detrator',
};

export const SPONSORSHIP_LEVEL_OPTIONS = [
  { value: 'promoter', label: 'Promotor' },
  { value: 'neutral', label: 'Neutro' },
  { value: 'detractor', label: 'Detrator' },
];

export const STAKEHOLDER_ACTION_LABELS: Record<StakeholderAction, string> = {
  keep_satisfied: 'Manter satisfeito',
  keep_informed: 'Manter informado',
  manage_closely: 'Gerenciar de perto',
  involve_in_rituals: 'Envolver nos ritos',
};

export const STAKEHOLDER_ACTION_OPTIONS = [
  { value: 'keep_satisfied', label: 'Manter satisfeito' },
  { value: 'keep_informed', label: 'Manter informado' },
  { value: 'manage_closely', label: 'Gerenciar de perto' },
  { value: 'involve_in_rituals', label: 'Envolver nos ritos' },
];
