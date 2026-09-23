import type { ProspectCompanyDB, ProspectStage } from '@/types/prospect';

export interface PgError {
  code?: string;
  message?: string;
}

export type CompanyFields = Partial<
  Pick<
    ProspectCompanyDB,
    'name' | 'cnpj' | 'linkedin_url' | 'instagram_url' | 'website' | 'segment' | 'ring' | 'tier' | 'notes'
  >
>;

export interface ContactFields {
  contact_name?: string;
  contact_role?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  primary_channel?: string;
  owner_id?: string | null;
  lever?: string | null;
}

export interface ContactFilter {
  companyId?: string;
  empresa?: string;
  contato?: string;
  etapa?: ProspectStage;
  incluirEncerrados?: boolean;
  responsavelId?: string;
  alavanca?: string;
  vencendoAte?: string;
  limite: number;
}

export interface ActivityInput {
  prospectId: string;
  channel: string;
  notes: string;
  gotResponse: boolean;
  activityDate?: string;
}
