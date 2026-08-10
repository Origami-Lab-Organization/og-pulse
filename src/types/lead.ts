export type CRMStage =
  | 'screening'
  | 'qualification'
  | 'proposal'
  | 'negotiation'
  | 'closed'
  | 'closed_lost'
  | 'stand_by';

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

interface CRMStageMeta {
  id: CRMStage;
  label: string;
  /** Classe Tailwind de badge (tokens do tema — sem hex avulso). */
  color: string;
  /** Cor de série em gráficos (funil, donut, barras). */
  chartColor: string;
  /** Peso da etapa no forecast ponderado. 0 = não entra na projeção. */
  forecastWeight: number;
  /**
   * Dias sem movimento a partir dos quais a oportunidade é sinalizada como
   * parada (jornada GP-J3 F3). `null` = a etapa não sinaliza — caso do Follow Up,
   * onde ficar parado é o comportamento esperado, e dos desfechos encerrados.
   */
  stallDays: number | null;
}

/**
 * Metadados de TODAS as etapas, inclusive as que não aparecem como coluna do
 * Pipeline. Fonte ÚNICA de rótulo, cor, peso de forecast e limite de "parado" —
 * qualquer consumidor deve derivar daqui em vez de manter cópia local.
 */
export const CRM_STAGE_META: Record<CRMStage, CRMStageMeta> = {
  screening: {
    id: 'screening',
    label: 'Prospecção/Oportunidade',
    color: 'bg-muted text-muted-foreground',
    chartColor: 'hsl(var(--chart-1))',
    forecastWeight: 0.1,
    stallDays: 14,
  },
  qualification: {
    id: 'qualification',
    label: 'Qualificação',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    chartColor: 'hsl(var(--chart-5))',
    forecastWeight: 0.25,
    stallDays: 14,
  },
  proposal: {
    id: 'proposal',
    label: 'Proposta Enviada',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    chartColor: 'hsl(var(--chart-3))',
    forecastWeight: 0.5,
    stallDays: 7,
  },
  negotiation: {
    id: 'negotiation',
    label: 'Negociação',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    chartColor: 'hsl(var(--chart-4))',
    forecastWeight: 0.75,
    stallDays: 3,
  },
  closed: {
    id: 'closed',
    label: 'Fechado - Ganho',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    chartColor: 'hsl(var(--success))',
    forecastWeight: 1,
    stallDays: null,
  },
  closed_lost: {
    id: 'closed_lost',
    label: 'Perdido',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    chartColor: 'hsl(var(--destructive))',
    forecastWeight: 0,
    stallDays: null,
  },
  stand_by: {
    id: 'stand_by',
    label: 'Stand By',
    color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
    chartColor: 'hsl(var(--chart-2))',
    forecastWeight: 0,
    stallDays: null,
  },
};

/**
 * Etapas sequenciais do funil, em ordem. É a régua de progressão: alimenta o
 * funil de conversão, a ordenação por etapa e a regra de adjacência do arraste.
 *
 * Nem `closed_lost` nem `follow_up` entram — são desfecho e estado lateral,
 * respectivamente, e incluí-los distorceria conversão e forecast.
 */
export const CRM_FUNNEL_STAGES: readonly CRMStage[] = [
  'screening',
  'qualification',
  'proposal',
  'negotiation',
  'closed',
];

/**
 * Colunas visíveis do Kanban: o funil mais o Follow Up, renderizado à parte.
 *
 * `closed_lost` NÃO é coluna — dar perda arquiva a oportunidade, que passa a
 * viver na aba "Perdas" (ver `closeLeadAsLost` em leadService).
 */
export const CRM_LEAD_COLUMNS: readonly CRMStageMeta[] = [
  ...CRM_FUNNEL_STAGES.map((stage) => CRM_STAGE_META[stage]),
  CRM_STAGE_META.stand_by,
];

/** Índice da etapa no funil; -1 para etapas fora da sequência. */
export function getFunnelIndex(stage: string): number {
  return CRM_FUNNEL_STAGES.indexOf(stage as CRMStage);
}

export function isInStandBy(stage: string | null | undefined): boolean {
  return stage === 'stand_by';
}

/** Desfecho encerrado: ganho ou perdido. Não admite edição nem avanço. */
export function isClosedOutcome(stage: string | null | undefined): boolean {
  return stage === 'closed' || stage === 'closed_lost';
}

export function getStageLabel(stage: string): string {
  return CRM_STAGE_META[stage as CRMStage]?.label ?? stage;
}

export function getStageColor(stage: string): string {
  return CRM_STAGE_META[stage as CRMStage]?.color ?? 'bg-muted text-muted-foreground';
}

export function getStageChartColor(stage: string): string {
  return CRM_STAGE_META[stage as CRMStage]?.chartColor ?? 'hsl(var(--muted))';
}

export function getStageForecastWeight(stage: string): number {
  return CRM_STAGE_META[stage as CRMStage]?.forecastWeight ?? 0;
}

export function getStageStallDays(stage: string): number | null {
  return CRM_STAGE_META[stage as CRMStage]?.stallDays ?? null;
}

/** Próxima etapa do funil, ou null se a etapa não avança. */
export function getNextFunnelStage(stage: string): CRMStage | null {
  const index = getFunnelIndex(stage);
  if (index < 0 || index >= CRM_FUNNEL_STAGES.length - 1) return null;
  return CRM_FUNNEL_STAGES[index + 1];
}

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

/** Taxonomia de motivo de perda (persistida em `leads.archive_reason`). */
export const ARCHIVE_REASONS = [
  { value: 'no_budget', label: 'Sem orçamento / Fora do perfil' },
  { value: 'price', label: 'Preço / Budget do cliente' },
  { value: 'deadline', label: 'Prazo / Disponibilidade' },
  { value: 'competitor', label: 'Concorrência' },
  { value: 'out_of_portfolio', label: 'Não aderência ao portfólio' },
  { value: 'canceled', label: 'Projeto cancelado pelo cliente' },
  { value: 'other', label: 'Outro' },
] as const;

export const ARCHIVE_REASON_LABELS: Record<string, string> = Object.fromEntries(
  ARCHIVE_REASONS.map((r) => [r.value, r.label])
);

export function getLossReasonLabel(reason?: string | null): string {
  if (!reason) return '-';
  return ARCHIVE_REASON_LABELS[reason] ?? reason;
}

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
  /** Etapa do funil à qual a oportunidade volta ao sair do Stand By. */
  stand_by_return_stage: CRMStage | null;
  stand_by_since: string | null;
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
