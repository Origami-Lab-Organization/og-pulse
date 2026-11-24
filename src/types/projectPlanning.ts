import type { ProjectAllocation } from '@/types/equipe.types';
import type { ProjectCostDB } from '@/types/project';
import type { ProjectMilestone } from '@/types/projectMilestone';

/**
 * Planejamento do projeto guiado por checklist (US-0039).
 *
 * O checklist é derivado do que está salvo nas abas — nunca marcado à mão. A mesma regra
 * serve a página do projeto e o card do portfólio (`src/lib/projectPlanning.ts`).
 */

/** As cinco abas que se planejam, na ordem em que se pensa o projeto. */
export type PlanningItemKey = 'okrs' | 'roadmap' | 'team' | 'stakeholders' | 'costs';

export interface PlanningItem {
  key: PlanningItemKey;
  label: string;
  /** Obrigatório trava a conclusão; opcional só aparece como "não informado". */
  required: boolean;
  done: boolean;
  /** Resumo do que foi preenchido, ou do que falta. */
  summary: string;
}

/** Período do projeto. `end` nulo = contínuo, sem fim. */
export interface PlanningPeriod {
  start: string;
  end: string | null;
}

/** O que foi carregado das abas, antes de virar contagem. */
export interface PlanningSources {
  period: PlanningPeriod;
  keyResultsPerObjective: number[];
  milestones: Pick<ProjectMilestone, 'start_date' | 'end_date'>[];
  allocations: Pick<ProjectAllocation, 'employeeId' | 'monthlyHours'>[];
  stakeholderCount: number;
  costs: Pick<ProjectCostDB, 'status' | 'planned_amount_brl'>[];
  hasClient: boolean;
  clientName: string;
}

/** Contagens já carregadas de um projeto, base do checklist. */
export interface PlanningCounts {
  /** Quantidade de resultados-chave de cada objetivo. */
  keyResultsPerObjective: number[];
  /** Data (`yyyy-MM-dd`) de cada marco que cai dentro do período do projeto. */
  milestoneDatesInPeriod: string[];
  /** Horas de cada pessoa dentro do período do projeto. */
  hoursPerPersonInPeriod: number[];
  stakeholderCount: number;
  /** Valores (BRL) dos custos informados, sem os cancelados. */
  costValues: number[];
  hasClient: boolean;
  /** Nome curto do cliente, para o resumo dos stakeholders. */
  clientName: string;
}

export interface PlanningChecklist {
  items: PlanningItem[];
  requiredDone: number;
  requiredTotal: number;
  allRequiredDone: boolean;
}

/** Linhas do orçamento vendido que o planejamento compara (cenário 9). */
export interface PlanningBreakdown {
  contract: number;
  commission: number;
  labor: number;
  costs: number;
}

export interface PlanningResult {
  /** contrato − comissão − equipe − custos. */
  result: number;
  /** resultado ÷ contrato, em %. */
  margin: number;
}

/** Comparação do resultado planejado com o orçado. `budgeted` nulo = sem orçamento vinculado. */
export interface PlanningComparison {
  planned: PlanningBreakdown & PlanningResult;
  budgeted: (PlanningBreakdown & PlanningResult) | null;
  /** Quanto o resultado planejado ficou abaixo do orçado (0 quando não ficou). */
  shortfall: number;
}

export type PlanningApprovalStatus = 'requested' | 'approved' | 'returned' | 'cancelled';

/** Pedido de aprovação do planejamento abaixo do orçado (`project_planning_approvals`). */
export interface PlanningApproval {
  id: string;
  project_id: string;
  status: PlanningApprovalStatus;
  requested_by: string;
  requested_at: string;
  /** Resultado planejado no momento do pedido: se mudar, o pedido cai (cenário 13). */
  planned_result: number;
  budgeted_result: number;
  decided_by: string | null;
  decided_at: string | null;
  return_reason: string | null;
}

/** O que o fim do checklist mostra (cenários 10 a 15). */
export type PlanningCta =
  | 'read_only'
  | 'blocked'
  | 'conclude'
  | 'request_approval'
  /** Admin abaixo do orçado sem pedido aberto: conclui com a própria aprovação. */
  | 'admin_concludes'
  | 'awaiting_admin'
  | 'admin_decides';

/** Quem olha e em que pé está, para decidir o fim do checklist. */
export interface PlanningCtaInput {
  canEdit: boolean;
  canApprove: boolean;
  allRequiredDone: boolean;
  shortfall: number;
  approval: PlanningApproval | null;
}

/** O mínimo de um projeto do portfólio para calcular a prontidão do planejamento. */
export interface PlanningReadinessProject {
  id: string;
  start_date: string;
  end_date: string | null;
  is_continuous: boolean;
  hasClient: boolean;
}

/** Pronto do planejamento de um projeto, para o card do portfólio (cenário 17). */
export interface PlanningReadiness {
  requiredDone: number;
  requiredTotal: number;
  /** Há pedido de aprovação aberto (pendência no card, cenário 12). */
  awaitingApproval: boolean;
}

export interface RequestApprovalInput {
  projectId: string;
  tenantId: string;
  plannedResult: number;
  budgetedResult: number;
}

export interface DecideApprovalInput {
  approvalId: string;
  status: Exclude<PlanningApprovalStatus, 'requested'>;
  returnReason?: string;
}

export interface PlanningNotice {
  tenantId: string;
  recipientIds: string[];
  projectId: string;
  type: string;
  title: string;
  message: string;
}

/** Resultado-chave como digitado no cadastro do objetivo (US-0039, cenário 4). */
export interface KeyResultDraft {
  description: string;
  /** Como medir: o indicador e a fonte do número. */
  measurement: string;
  baseline: string;
  target: string;
  unit: string;
  /** `yyyy-MM-dd`, obrigatório; pode passar do fim do projeto. */
  targetDate: string;
}

/** Resultado-chave pronto para gravar. */
export interface KeyResultInput {
  description: string;
  measurement: string;
  baseline: number;
  target: number;
  unit: string;
  targetDate: string;
}

export interface ObjectiveInput {
  projectId: string;
  objective: string;
  keyResults: KeyResultInput[];
}
