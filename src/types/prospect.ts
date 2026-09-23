/**
 * Prospecção — fonte ÚNICA de etapas, rótulos e motivos de descarte do pipeline frio.
 *
 * Espelha o desenho de `src/types/lead.ts`, com uma ausência deliberada: não existe
 * `forecastWeight`. Prospecção mede atenção conquistada, não receita — se um peso de
 * forecast aparecer aqui, o pipeline frio voltou para dentro da previsão comercial e a
 * separação que sustenta o módulo acabou.
 */

export type ProspectStage =
  | 'a_abordar'
  | 'em_cadencia'
  | 'respondeu'
  | 'reuniao_agendada'
  | 'reuniao_feita'
  | 'qualificado'
  | 'sem_resposta'
  | 'descartado'
  | 'convertido';

interface ProspectStageMeta {
  id: ProspectStage;
  label: string;
  /** Classe Tailwind de badge (tokens do tema — sem hex avulso). */
  color: string;
  /**
   * Dias sem atividade a partir dos quais o card é sinalizado como parado.
   * `null` = a etapa não sinaliza — caso dos três desfechos, onde parar é o esperado.
   */
  stallDays: number | null;
}

export const PROSPECT_STAGE_META: Record<ProspectStage, ProspectStageMeta> = {
  a_abordar: {
    id: 'a_abordar',
    label: 'A abordar',
    color: 'bg-muted text-muted-foreground',
    stallDays: 7,
  },
  em_cadencia: {
    id: 'em_cadencia',
    label: 'Em cadência',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    stallDays: 7,
  },
  respondeu: {
    id: 'respondeu',
    label: 'Respondeu',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    stallDays: 3,
  },
  reuniao_agendada: {
    id: 'reuniao_agendada',
    label: 'Reunião agendada',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    stallDays: 3,
  },
  reuniao_feita: {
    id: 'reuniao_feita',
    label: 'Reunião feita',
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    stallDays: 5,
  },
  qualificado: {
    id: 'qualificado',
    label: 'Oportunidade qualificada',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    stallDays: null,
  },
  sem_resposta: {
    id: 'sem_resposta',
    label: 'Sem resposta',
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    stallDays: null,
  },
  descartado: {
    id: 'descartado',
    label: 'Descartado',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    stallDays: null,
  },
  convertido: {
    id: 'convertido',
    label: 'Convertido',
    color: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
    stallDays: null,
  },
};

/**
 * As etapas do funil, em ordem. São as colunas do Kanban.
 *
 * "Reunião feita" entrou em 17/09/2026: é a separação entre agenda cheia e conversa que
 * de fato aconteceu, e sem ela a taxa de comparecimento não existe.
 *
 * "Sem resposta", "Descartado" e "Convertido" ficam de fora de propósito: são desfechos,
 * não avanço, e virariam progresso aparente se aparecessem como coluna.
 */
export const PROSPECT_FUNNEL_STAGES: readonly ProspectStage[] = [
  'a_abordar',
  'em_cadencia',
  'respondeu',
  'reuniao_agendada',
  'reuniao_feita',
  'qualificado',
];

/** Desfechos: saem do board e vivem nas abas de encerrados. */
export const PROSPECT_TERMINAL_STAGES: readonly ProspectStage[] = [
  'sem_resposta',
  'descartado',
  'convertido',
];

export const PROSPECT_KANBAN_COLUMNS: readonly ProspectStageMeta[] =
  PROSPECT_FUNNEL_STAGES.map((stage) => PROSPECT_STAGE_META[stage]);

/**
 * Etapas que o próprio usuário conduz arrastando o card.
 *
 * `em_cadencia` e `sem_resposta` NÃO entram: quem decide as duas é a cadência, no banco.
 * `respondeu` também não — só entra por atividade com resposta registrada, que é a regra
 * dura do módulo: o card avança por evento verificável, nunca por impressão.
 */
export const PROSPECT_MANUAL_STAGES: readonly ProspectStage[] = [
  'a_abordar',
  'reuniao_agendada',
  'reuniao_feita',
  'qualificado',
];

/**
 * O próximo passo de cada etapa do funil. A tela oferece UM botão, sempre.
 *
 * `a_abordar` e `em_cadencia` apontam para `respondeu`, e não para a etapa seguinte na
 * régua: a única saída da cadência é a pessoa responder. Pular de "Em cadência" direto
 * para "Reunião agendada" descreveria um funil que não aconteceu.
 */
export const PROSPECT_NEXT_STAGE: Partial<Record<ProspectStage, ProspectStage>> = {
  a_abordar: 'em_cadencia',
  em_cadencia: 'respondeu',
  respondeu: 'reuniao_agendada',
  reuniao_agendada: 'reuniao_feita',
  reuniao_feita: 'qualificado',
};

/**
 * COMO se chega em cada etapa. Ausente = a tela escreve a etapa direto.
 *
 * Três etapas não se alcança escrevendo a etapa, e essa é a regra dura do módulo — o card
 * avança por evento verificável, nunca por impressão:
 *
 * - `em_cadencia` e `respondeu` nascem de uma atividade registrada; quem move o card é o
 *   trigger no banco, a mesma fonte que decide a cadência. Se a tela escrevesse a etapa,
 *   existiriam dois donos da mesma regra e a taxa de resposta mediria otimismo;
 * - `reuniao_feita` abre o registro de como a reunião foi, antes de mover.
 */
export type ProspectAdvanceMode = 'activity' | 'response' | 'prompt' | 'stage';

const PROSPECT_ADVANCE_MODE: Partial<Record<ProspectStage, ProspectAdvanceMode>> = {
  em_cadencia: 'activity',
  respondeu: 'response',
  reuniao_feita: 'prompt',
};

export function advanceModeFor(stage: ProspectStage): ProspectAdvanceMode {
  return PROSPECT_ADVANCE_MODE[stage] ?? 'stage';
}



/**
 * Alavancas — lista FECHADA (17/09/2026). É o corte que explica O QUE faz responder.
 *
 * Guardado em slug: o rótulo é da interface e muda ("Rede dos Sócios" virou "Rede Origami"
 * no dia em que a lista foi definida). Com rótulo no banco, toda renomeação seria migration.
 */
export const PROSPECT_LEVERS = [
  { value: 'rede_origami', label: 'Rede Origami' },
  { value: 'outbound', label: 'Outbound' },
  { value: 'inbound', label: 'Inbound' },
  { value: 'abm', label: 'ABM' },
  { value: 'indicacao_parceiros', label: 'Indicação de Parceiros' },
  { value: 'recomendacao', label: 'Recomendação' },
  { value: 'feira', label: 'Feira' },
  { value: 'sindicato', label: 'Sindicato' },
  { value: 'expansao', label: 'Expansão' },
] as const;

export const PROSPECT_LEVER_LABELS: Record<string, string> = Object.fromEntries(
  PROSPECT_LEVERS.map((l) => [l.value, l.label])
);

export function getLeverLabel(lever: string | null | undefined): string | null {
  if (!lever) return null;
  return PROSPECT_LEVER_LABELS[lever] ?? lever;
}

/**
 * Motivos de descarte — lista FECHADA, nunca texto livre.
 *
 * Motivo digitado à mão não vira métrica: "sem budget", "sem orçamento" e "não tem verba"
 * viram três linhas diferentes do mesmo fato.
 */
export const PROSPECT_DISCARD_REASONS = [
  { value: 'sem_fit', label: 'Sem fit' },
  { value: 'sem_orcamento', label: 'Sem orçamento' },
  { value: 'concorrente_incumbente', label: 'Concorrente incumbente' },
  { value: 'contato_errado', label: 'Contato errado' },
  { value: 'sem_interesse', label: 'Sem interesse' },
  { value: 'momento_errado', label: 'Momento errado' },
  { value: 'dados_invalidos', label: 'Dados inválidos' },
  { value: 'pediu_para_parar', label: 'Pediu para parar' },
] as const;

export const PROSPECT_DISCARD_REASON_LABELS: Record<string, string> = Object.fromEntries(
  PROSPECT_DISCARD_REASONS.map((r) => [r.value, r.label])
);

// --------------------------------------------------------------------------
// Tipos de dado
// --------------------------------------------------------------------------

export interface ProspectCompanyDB {
  id: string;
  tenant_id: string;
  name: string;
  cnpj: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  website: string | null;
  segment: string | null;
  /** "Anel" — segmentação de proximidade. Texto livre, editável no card. */
  ring: string | null;
  /** "Tier" — segmentação de porte/prioridade. Texto livre, editável no card. */
  tier: string | null;
  client_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectDB {
  id: string;
  tenant_id: string;
  company_id: string;
  contact_name: string;
  contact_role: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  primary_channel: string;
  owner_id: string | null;
  /** Alavanca / origem da lista. */
  lever: string | null;
  stage: ProspectStage;
  /** Imutável depois da primeira atividade (trigger no banco). */
  first_touch_at: string | null;
  activity_count: number;
  next_activity_on: string | null;
  discard_reason: string | null;
  discarded_at: string | null;
  converted_lead_id: string | null;
  closed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProspectWithCompany extends ProspectDB {
  company?: ProspectCompanyDB | null;
  owner?: { id: string; nome: string } | null;
}

import type { ProspectAttachment } from '@/lib/prospectAttachments';

export interface ProspectActivityDB {
  id: string;
  tenant_id: string;
  prospect_id: string;
  activity_date: string;
  channel: string;
  owner_id: string | null;
  sequence_no: number;
  got_response: boolean;
  notes: string | null;
  attachments: ProspectAttachment[];
  created_by: string | null;
  created_at: string;
}

export interface ProspectActivityWithOwner extends ProspectActivityDB {
  owner?: { id: string; nome: string } | null;
}

// --------------------------------------------------------------------------
// Helpers puros — todo consumidor deriva daqui, nunca com cópia local
// --------------------------------------------------------------------------

export function getProspectStageLabel(stage: string): string {
  return PROSPECT_STAGE_META[stage as ProspectStage]?.label ?? stage;
}

export function getProspectStageColor(stage: string): string {
  return PROSPECT_STAGE_META[stage as ProspectStage]?.color ?? 'bg-muted text-muted-foreground';
}

export function getDiscardReasonLabel(reason: string | null): string {
  if (!reason) return '—';
  return PROSPECT_DISCARD_REASON_LABELS[reason] ?? reason;
}

/** Desfecho encerrado: o card é somente leitura e está fora do board. */
export function isProspectClosed(stage: string): boolean {
  return PROSPECT_TERMINAL_STAGES.includes(stage as ProspectStage);
}

/**
 * O card convertido nunca volta a ser editável: dois lugares editáveis para o mesmo
 * contato é como as duas bases divergem.
 */
export function isProspectReadOnly(prospect: Pick<ProspectDB, 'stage'>): boolean {
  return prospect.stage === 'convertido';
}

/** Só contato qualificado passa para o comercial. */
export function canConvertToLead(prospect: Pick<ProspectDB, 'stage' | 'converted_lead_id'>): boolean {
  return prospect.stage === 'qualificado' && !prospect.converted_lead_id;
}

export function isOverdue(prospect: Pick<ProspectDB, 'next_activity_on'>, today = new Date()): boolean {
  if (!prospect.next_activity_on) return false;
  return prospect.next_activity_on < toISODate(today);
}

/** Data local em ISO (YYYY-MM-DD), sem passar por UTC — a lista é do dia de quem olha. */
export function toISODate(date: Date): string {
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mes}-${dia}`;
}
