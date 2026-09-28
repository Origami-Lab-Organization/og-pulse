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

/** Por onde uma empresa já cadastrada foi reconhecida. */
export type CompanyMatchCriterion = 'CNPJ' | 'LinkedIn' | 'nome';

export interface CompanyMatch {
  empresa: ProspectCompanyDB;
  criterio: CompanyMatchCriterion;
}

/** Identificadores fortes (CNPJ, LinkedIn) separados do nome, que não é único. */
export interface CompanyMatches {
  fortes: CompanyMatch[];
  porNome: CompanyMatch[];
}

export interface CompanyLookup {
  nome?: string;
  cnpj?: string;
  linkedin_url?: string;
}

export interface CompanyTarget extends Partial<CompanyMatch> {
  empresa: ProspectCompanyDB;
  origem: 'informada' | 'reaproveitada' | 'criada';
}

/** Argumentos de `list_prospect_tasks`, já com os padrões do schema aplicados. */
export interface TaskListArgs {
  prospect_id?: string;
  responsavel: string;
  ate?: string;
  incluir_concluidas: boolean;
  limite: number;
}
