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
  | 'ganho'
  | 'descartado'
  /** Só em linhas antigas: desde 28/09/2026 a cadência esgotada não encerra mais o contato. */
  | 'sem_resposta'
  /**
   * Só no HISTÓRICO de etapa: a conversão para o Pipeline saiu em 28/09/2026, e em
   * 29/09/2026 cada contato convertido recebeu de volta a oportunidade dele.
   */
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
  ganho: {
    id: 'ganho',
    label: 'Ganho',
    color: 'bg-success-subtle text-success-emphasis',
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
    // O valor no banco é o de sempre; o rótulo mudou em 28/09/2026, como `qualificado`.
    label: 'Perda',
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
 * As etapas de TRABALHO, em ordem: o que ainda está em aberto no quadro.
 *
 * "Reunião feita" entrou em 17/09/2026: é a separação entre agenda cheia e conversa que
 * de fato aconteceu, e sem ela a taxa de comparecimento não existe.
 */
export const PROSPECT_FUNNEL_STAGES: readonly ProspectStage[] = [
  'a_abordar',
  'em_cadencia',
  'respondeu',
  'reuniao_agendada',
  'reuniao_feita',
  'qualificado',
];

/**
 * Os dois jeitos de sair do quadro (28/09/2026): ou vendemos, ou perdemos. São as últimas
 * colunas do Kanban, e mostram só os desfechos recentes — o quadro é de trabalho em aberto.
 */
export const PROSPECT_OUTCOME_STAGES: readonly ProspectStage[] = ['ganho', 'descartado'];

/** As colunas do Kanban: o trabalho e, no fim, os dois desfechos. */
export const PROSPECT_BOARD_STAGES: readonly ProspectStage[] = [
  ...PROSPECT_FUNNEL_STAGES,
  ...PROSPECT_OUTCOME_STAGES,
];

/** Encerrados: os dois desfechos e as duas etapas antigas, que não recebem mais ninguém. */
export const PROSPECT_TERMINAL_STAGES: readonly ProspectStage[] = [
  ...PROSPECT_OUTCOME_STAGES,
  'sem_resposta',
  'convertido',
];

/** De onde se chega a Ganho: venda sem reunião feita não existe. Regra também no banco. */
export const PROSPECT_WIN_ORIGINS: readonly ProspectStage[] = ['reuniao_feita', 'qualificado'];

/** Recorte das colunas de desfecho: mostram os recentes, e o resto a um clique. */
export interface ProspectColumnCut {
  total: number;
  expandida: boolean;
  dias: number;
  onToggle: () => void;
}

export const PROSPECT_KANBAN_COLUMNS: readonly ProspectStageMeta[] =
  PROSPECT_BOARD_STAGES.map((stage) => PROSPECT_STAGE_META[stage]);

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
  qualificado: 'ganho',
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
 * - `reuniao_feita` abre o registro de como a reunião foi, antes de mover;
 * - `ganho` abre o registro da venda (data e valor); `descartado` (Perda), o do motivo.
 */
export type ProspectAdvanceMode = 'activity' | 'response' | 'prompt' | 'win' | 'loss' | 'stage';

const PROSPECT_ADVANCE_MODE: Partial<Record<ProspectStage, ProspectAdvanceMode>> = {
  em_cadencia: 'activity',
  respondeu: 'response',
  reuniao_feita: 'prompt',
  ganho: 'win',
  descartado: 'loss',
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
 * Motivos de perda — lista FECHADA, nunca texto livre (28/09/2026).
 *
 * Motivo digitado à mão não vira métrica: "sem budget", "sem orçamento" e "não tem verba"
 * viram três linhas diferentes do mesmo fato. Cobre as duas perdas do comercial: o contato
 * que não responde e a proposta recusada. Nenhuma perda é automática: esgotada a cadência, o
 * contato fica em "Em cadência" até alguém decidir. Mesma lista do CHECK de 20260928200000.
 */
export const PROSPECT_DISCARD_REASONS = [
  { value: 'sem_resposta', label: 'Sem resposta / sem contato' },
  { value: 'proposta_preco', label: 'Proposta recusada: preço' },
  { value: 'proposta_escopo', label: 'Proposta recusada: escopo' },
  { value: 'concorrente', label: 'Perdemos para concorrente' },
  { value: 'sem_orcamento', label: 'Sem orçamento' },
  { value: 'momento_errado', label: 'Momento errado / adiado' },
  { value: 'sem_fit', label: 'Sem fit' },
  { value: 'sem_interesse', label: 'Sem interesse' },
  { value: 'contato_invalido', label: 'Contato errado / dados inválidos' },
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
  /** Dia em que fechamos negócio — só em Ganho. */
  won_on: string | null;
  /** Valor vendido; `null` em Ganho = "Sem valor", pendente de registro. */
  won_value: number | null;
  /**
   * Valor estimado do negócio antes de haver orçamento (29/09/2026, quando o contato
   * absorveu a Oportunidade). O valor do contato é o do orçamento quando > 0 (ADR-0017).
   */
  estimated_value: number | null;
  /** Observações livres. Recebeu, na migração, título, serviços e Stand By da oportunidade. */
  notes: string | null;
  /** Concorrente na disputa, quando houver. */
  competitor_name: string | null;
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

/**
 * Tarefa: o que ainda precisa ser feito com o contato (24/09/2026).
 *
 * Não é atividade: não conta toque, não agenda cadência e não move etapa.
 */
export interface ProspectTaskDB {
  id: string;
  tenant_id: string;
  prospect_id: string;
  description: string;
  due_date: string;
  /** Herdado do responsável do contato na criação (trigger no banco). */
  owner_id: string | null;
  /** `null` = pendente. */
  done_at: string | null;
  done_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** O mínimo de uma tarefa pendente para os avisos do quadro e da tela Empresas. */
export type PendingTaskLite = Pick<ProspectTaskDB, 'prospect_id' | 'due_date' | 'description'>;

/**
 * A próxima tarefa pendente de cada contato — a mais urgente. Desde 28/09/2026 é a ÚNICA
 * data que gera aviso de vencimento: a data da cadência é sugestão do sistema, a tarefa é
 * compromisso que alguém do time assumiu.
 */
export function nextTaskByProspect(tarefas: PendingTaskLite[]): Map<string, PendingTaskLite> {
  const mapa = new Map<string, PendingTaskLite>();
  for (const t of tarefas) {
    const atual = mapa.get(t.prospect_id);
    if (!atual || t.due_date < atual.due_date) mapa.set(t.prospect_id, t);
  }
  return mapa;
}

/** Tarefa vencida: pendente com data de conclusão anterior a hoje. */
export function isTaskOverdue(
  task: Pick<ProspectTaskDB, 'due_date' | 'done_at'>,
  today = new Date(),
): boolean {
  return !task.done_at && task.due_date < toISODate(today);
}

/** Pendentes primeiro, da mais urgente para a mais distante; concluídas no fim. */
export function sortProspectTasks<T extends Pick<ProspectTaskDB, 'due_date' | 'done_at' | 'created_at'>>(
  tasks: T[],
): T[] {
  return [...tasks].sort((a, b) => {
    if (!!a.done_at !== !!b.done_at) return a.done_at ? 1 : -1;
    if (a.done_at && b.done_at) return b.done_at.localeCompare(a.done_at);
    return a.due_date.localeCompare(b.due_date) || a.created_at.localeCompare(b.created_at);
  });
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

/** Ganho só de Reunião feita em diante — o banco recusa o resto (prospects_outcome_rules). */
export function canWin(prospect: Pick<ProspectDB, 'stage'>): boolean {
  return PROSPECT_WIN_ORIGINS.includes(prospect.stage);
}

export function isOutcomeStage(stage: ProspectStage): boolean {
  return PROSPECT_OUTCOME_STAGES.includes(stage);
}

/** Dia do desfecho: o do ganho, ou o da perda. `null` fora dos desfechos. */
export function outcomeDateOf(prospect: Pick<ProspectDB, 'stage' | 'won_on' | 'discarded_at'>): string | null {
  const datas: Partial<Record<ProspectStage, string | null>> = {
    ganho: prospect.won_on,
    descartado: prospect.discarded_at ? toISODate(new Date(prospect.discarded_at)) : null,
  };
  return datas[prospect.stage] ?? null;
}


/** Data local em ISO (YYYY-MM-DD), sem passar por UTC — a lista é do dia de quem olha. */
export function toISODate(date: Date): string {
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mes}-${dia}`;
}
