import type { ProspectCompanyDB, ProspectStage } from '@/types/prospect';
import type { MetricFilter, PeriodSelection } from '@/types/prospectMetrics';

export interface PgError {
  code?: string;
  message?: string;
}

export type CompanyFields = Partial<
  Pick<
    ProspectCompanyDB,
    'name' | 'cnpj' | 'linkedin_url' | 'instagram_url' | 'website' | 'segment' | 'ring' | 'tier' | 'notes' | 'client_id'
  >
>;

/** Cliente da carteira, como `search_clients` o mostra (29/09/2026). */
export interface ClientLite {
  id: string;
  company_name: string;
  trading_name: string | null;
  cnpj: string | null;
  /** Empresa da Prospecção já ligada a este cliente, se houver. */
  prospectCompanyId?: string | null;
}

/** Orçamento e projeto que nasceram do contato — `budgets/projects.prospect_id`. */
export interface ContactDeal {
  orcamento: { id: string; budget_number: string; title: string; final_total: number; status: string } | null;
  projeto: { id: string; name: string; status: string } | null;
}

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
  /** Valor estimado do negócio antes do orçamento (29/09/2026). */
  estimated_value?: number | null;
  competitor_name?: string | null;
  /** Observações do contato — `prospects.notes`. Nome próprio para não colidir com as da empresa. */
  observacoes?: string | null;
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
export type CompanyMatchCriterion = 'CNPJ' | 'LinkedIn' | 'nome' | 'cliente';

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

/** Quebra de Canais nas métricas: os mesmos dois recortes da aba. */
export type CorteDeCanal = 'lever' | 'owner';

export interface PedidoDeMetricas {
  selecao: PeriodSelection;
  filtro: MetricFilter;
  corte?: CorteDeCanal;
  pessoas: Map<string, string>;
}
