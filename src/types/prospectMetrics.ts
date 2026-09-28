/**
 * Contratos da aba Métricas da Prospecção (28/09/2026).
 *
 * As regras vivem em `src/lib/prospecting/periods.ts`, `milestones.ts` e
 * `periodMetrics.ts`; aqui ficam só os formatos que elas trocam entre si e com a tela.
 */

import type { AccountCoverage } from '@/lib/prospecting/metrics';
import type { PendingTaskLite, ProspectCompanyDB, ProspectStage, ProspectWithCompany } from '@/types/prospect';

export type PeriodPreset =
  | 'esta_semana'
  | 'semana_passada'
  | 'este_mes'
  | 'mes_passado'
  | 'este_trimestre'
  | 'ultimos_30'
  | 'ultimos_90'
  | 'personalizado';

/** Agrupamento da evolução. A semana começa na segunda. */
export type Grain = 'semana' | 'mes';

/** Datas ISO (AAAA-MM-DD), as duas pontas incluídas. */
export interface PeriodRange {
  from: string;
  to: string;
}

export interface PeriodSelection {
  preset: PeriodPreset;
  /** Só para `personalizado`. */
  custom?: PeriodRange;
  grain: Grain;
}

/** O período já resolvido: o escolhido, o trecho que já passou e o de comparação. */
export interface ResolvedPeriod {
  range: PeriodRange;
  /** `range` cortado em hoje — um período em andamento só conta o que já aconteceu. */
  elapsed: PeriodRange;
  previous: PeriodRange;
  /** "vs semana anterior", "vs mesmo trecho do mês anterior"... */
  comparisonLabel: string;
}

/** Uma coluna da evolução. */
export interface Bucket {
  key: string;
  from: string;
  to: string;
  /** Rótulo curto do eixo: "22/09" ou "set/26". */
  label: string;
  /** Rótulo longo do tooltip: "Semana de 22/09 a 28/09". */
  title: string;
  /** Sobrepõe o período escolhido — recebe o destaque. */
  selected: boolean;
  /** Contém hoje e ainda não terminou. */
  inProgress: boolean;
}

export type StageChangeSource = 'registrado' | 'reconstruido' | 'anterior';

/** Linha de `prospect_stage_changes` (migration 20260928120000). */
export interface ProspectStageChangeDB {
  prospect_id: string;
  from_stage: ProspectStage | null;
  to_stage: ProspectStage;
  discard_reason: string | null;
  occurred_on: string;
  source: StageChangeSource;
}

/** O mínimo de uma atividade que a métrica precisa. */
export interface ActivityLite {
  prospect_id: string;
  activity_date: string;
  sequence_no: number;
  got_response: boolean;
}

/**
 * Um marco do funil para um contato.
 *
 * `reached` e `date` são independentes de propósito: um contato que já estava em Reunião
 * agendada quando o histórico começou ALCANÇOU a etapa (conta na conversão da safra), mas
 * em data desconhecida (não conta em período nenhum).
 */
export interface Milestone {
  reached: boolean;
  date: string | null;
}

export interface ProspectMilestones {
  prospect: ProspectWithCompany;
  cadastrado: string;
  ativado: string | null;
  conversa: string | null;
  /** Número do toque em que veio a 1ª resposta. */
  toquesAteResponder: number | null;
  agendada: Milestone;
  feita: Milestone;
  qualificada: Milestone;
  /** Dia do fechamento — só de quem está em Ganho hoje. Desfazer o ganho tira daqui. */
  ganho: string | null;
  /** Valor vendido; `null` em Ganho = registrado sem valor. */
  valor: number | null;
  /** A perda vigente: quem foi reaberto deixou de ser perda. */
  perda: LossMilestone | null;
}

export interface LossMilestone {
  date: string;
  reason: string | null;
  /** A etapa em que o contato estava quando se perdeu — "onde perdemos". */
  fromStage: ProspectStage | null;
}

export type MetricKey =
  | 'empresas'
  | 'contatos'
  | 'contas'
  | 'ativados'
  | 'atividades'
  | 'conversas'
  | 'agendadas'
  | 'feitas'
  | 'qualificadas'
  | 'ganhos'
  | 'perdas';

export type MetricBlock = 'lista' | 'esforco' | 'resultado' | 'desfecho';

/** Uma ocorrência que a métrica conta — e que o detalhe lista. */
export interface Occurrence {
  date: string;
  prospect?: ProspectWithCompany;
  company?: ProspectCompanyDB;
}

export interface MetricFilter {
  ownerId?: string;
  lever?: string;
}

/** O que as métricas leem, já filtrado por responsável e alavanca. */
export interface MetricsDataset {
  companies: ProspectCompanyDB[];
  milestones: ProspectMilestones[];
  activities: ActivityLite[];
  changes: ProspectStageChangeDB[];
  /** Empresa não tem alavanca: com esse filtro, "Empresas cadastradas" não se aplica. */
  companiesApply: boolean;
  /** Primeiro dia com etapa registrada; antes dele, reunião e qualificação não têm data. */
  historyStart: string | null;
}

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  block: MetricBlock;
  /** A pergunta que o número responde, na voz do time. */
  question: string;
  /** Depende do histórico de etapa — antes de `historyStart` não há dado. */
  needsHistory: boolean;
  /** Abre a lista do que foi contado. */
  drillable: boolean;
  /** Ausente = sempre se aplica. */
  applies?: (dataset: MetricsDataset) => boolean;
  occurrences: (dataset: MetricsDataset) => Occurrence[];
}

export interface MetricValue {
  definition: MetricDefinition;
  /** `null` quando a métrica não se aplica ao filtro. */
  current: number | null;
  previous: number | null;
  /** O período começa antes do histórico: o número é parcial. */
  partial: boolean;
}

export interface SeriesPoint {
  bucket: Bucket;
  values: Partial<Record<MetricKey, number | null>>;
}

/** Conversão de uma safra de ativação, uma taxa por passagem do funil. */
export interface SafraPoint {
  bucket: Bucket;
  ativados: number;
  resposta: number | null;
  agendamento: number | null;
  comparecimento: number | null;
  qualificacao: number | null;
  /** Ganhos ÷ qualificadas: das oportunidades, quantas viraram venda. */
  fechamento: number | null;
  /** A safra é recente demais para as etapas do fim terem acontecido. */
  maturing: boolean;
}

export type SafraRateKey = 'resposta' | 'agendamento' | 'comparecimento' | 'qualificacao' | 'fechamento';

export interface CycleTime {
  key: string;
  label: string;
  /** Mediana em dias (ou em toques). `null` sem amostra suficiente. */
  median: number | null;
  sample: number;
  unit: 'dias' | 'toques';
}

export interface DiscardCount {
  reason: string;
  label: string;
  count: number;
}

export interface CutFlowRow {
  key: string;
  ativados: number;
  conversas: number;
  agendadas: number;
  feitas: number;
  qualificadas: number;
  ganhos: number;
  perdas: number;
}

/** O que a aba carrega do banco, sem filtro. */
export interface MetricsSource {
  prospects: ProspectWithCompany[];
  companies: ProspectCompanyDB[];
  /** Todas as atividades com resposta, desde sempre — a 1ª resposta pode ser antiga. */
  responses: ActivityLite[];
  /** Todas as atividades a partir do início da evolução. */
  activities: ActivityLite[];
  changes: ProspectStageChangeDB[];
}

export interface StageLossCount {
  stage: ProspectStage | null;
  label: string;
  count: number;
}

/** As perdas do período: por que e em que etapa perdemos. */
export interface PeriodLosses {
  total: number;
  byReason: DiscardCount[];
  byStage: StageLossCount[];
}

/** O que vendemos no período, e o mesmo trecho do período anterior. */
export interface SalesSummary {
  valor: number;
  valorAnterior: number | null;
  ganhos: number;
  /** Ganhos registrados sem valor — ficam fora do valor e do ticket médio. */
  semValor: number;
  /** Valor ÷ ganhos COM valor. `null` sem nenhum. */
  ticketMedio: number | null;
}

/** Estado da lista: cobertura no período e os contatos com tarefa vencida hoje. */
export interface ListHealthData {
  coverage: AccountCoverage;
  overdue: Array<{ prospect: ProspectWithCompany; task: PendingTaskLite }>;
}
