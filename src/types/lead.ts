export type CRMStage = 'screening' | 'qualification' | 'proposal' | 'negotiation' | 'closed' | 'closed_lost';

export const SERVICE_LINE_OPTIONS = [
  { value: 'financiamento_inovacao', label: 'Financiamento da Inovação' },
  { value: 'consultoria_estrategica', label: 'Consultoria Estratégica' },
  { value: 'product_studio', label: 'Product Studio' },
  { value: 'educacao_corporativa', label: 'Educação Corporativa' },
  { value: 'ventures', label: 'Ventures' },
] as const;

export const SERVICE_LINE_LABELS: Record<string, string> = Object.fromEntries(
  SERVICE_LINE_OPTIONS.map((o) => [o.value, o.label])
);

export const CRM_LEAD_COLUMNS = [
  { id: 'screening' as CRMStage, label: 'Prospecção/Oportunidade', color: 'bg-muted text-muted-foreground' },
  { id: 'qualification' as CRMStage, label: 'Qualificação', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'proposal' as CRMStage, label: 'Proposta Enviada', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' },
  { id: 'negotiation' as CRMStage, label: 'Negociação', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  { id: 'closed' as CRMStage, label: 'Fechado - Ganho', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { id: 'closed_lost' as CRMStage, label: 'Fechado - Perda', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
] as const;

export const LEAD_SOURCE_OPTIONS = [
  { value: 'indicacao', label: 'Indicação' },
  { value: 'evento', label: 'Evento' },
  { value: 'parceiro', label: 'Parceiro' },
  { value: 'abordagem_direta', label: 'Abordagem Direta' },
  { value: 'expansao', label: 'Expansão' },
  { value: 'inbound', label: 'Inbound — cliente nos procurou' },
  { value: 'outro', label: 'Outro' },
] as const;

export const LEAD_SOURCE_LABELS: Record<string, string> = Object.fromEntries(
  LEAD_SOURCE_OPTIONS.map((o) => [o.value, o.label])
);

export const ARCHIVE_REASONS = [
  { value: 'no_budget', label: 'Sem orçamento / Fora do perfil' },
  { value: 'price', label: 'Preço / Budget do cliente' },
  { value: 'deadline', label: 'Prazo / Disponibilidade' },
  { value: 'competitor', label: 'Concorrência' },
  { value: 'out_of_portfolio', label: 'Não aderência ao portfólio' },
  { value: 'canceled', label: 'Projeto cancelado pelo cliente' },
  { value: 'other', label: 'Outro' },
] as const;

export interface LeadDB {
  id: string;
  tenant_id: string;
  name: string;
  company_name: string | null;
  client_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  estimated_value: number;
  source: string | null;
  notes: string | null;
  crm_stage: CRMStage;
  budget_id: string | null;
  archived: boolean;
  archived_at: string | null;
  archive_reason: string | null;
  archive_notes: string | null;
  competitor_name: string | null;
  restored_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  service_line: string | null;
  responsible_id: string | null;
  closed_at: string | null;
  lost_at: string | null;
}

export interface LeadWithBudget extends LeadDB {
  budget?: {
    id: string;
    budget_number: string;
    final_total: number;
    status: string;
    title: string;
    subtotal: number;
    total_with_fees: number;
    discount_value: number;
    duration_months: number;
    start_date: string;
    monthly_value?: number | null;
    is_recurring?: boolean;
  } | null;
  creator?: {
    id: string;
    nome: string;
  } | null;
  responsible?: {
    id: string;
    nome: string;
  } | null;
}

/** Janela do badge "Reativada" após a restauração de uma oportunidade (GP-J7 CA-04). */
export const REACTIVATED_BADGE_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Indica se a oportunidade foi restaurada há menos de 48h (badge "Reativada").
 * Derivado em runtime a partir de `restored_at` — sem job agendado.
 */
export function isRecentlyRestored(lead: { restored_at?: string | null; archived?: boolean }): boolean {
  if (lead.archived || !lead.restored_at) return false;
  return Date.now() - new Date(lead.restored_at).getTime() < REACTIVATED_BADGE_WINDOW_MS;
}
