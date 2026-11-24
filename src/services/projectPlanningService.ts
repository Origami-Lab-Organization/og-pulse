import { supabase } from '@/integrations/supabase/client';
import { tabela } from '@/services/prospectingTables';
import { PLANNING_APPROVAL_STATUS } from '@/lib/projectPlanning.constants';
import type {
  DecideApprovalInput,
  KeyResultInput,
  ObjectiveInput,
  PlanningApproval,
  PlanningApprovalStatus,
  PlanningNotice,
  RequestApprovalInput,
} from '@/types/projectPlanning';

/**
 * Leitura e escrita do planejamento guiado por checklist (US-0039): o pedido de aprovação do
 * admin quando o planejado fica abaixo do orçado, e a conclusão do planejamento.
 * As regras de quem pode o quê estão na RLS e no gatilho de `project_planning_approvals`
 * (migration 20261124140000); aqui só se grava.
 */

const APPROVAL_COLUMNS =
  'id, project_id, status, requested_by, requested_at, planned_result, budgeted_result, decided_by, decided_at, return_reason';

type ApprovalRow = Omit<PlanningApproval, 'status'> & { status: string };

const toApproval = (row: ApprovalRow): PlanningApproval => ({
  ...row,
  status: row.status as PlanningApprovalStatus,
  planned_result: Number(row.planned_result),
  budgeted_result: Number(row.budgeted_result),
});

/** Último pedido do projeto (aberto, decidido ou cancelado), ou `null`. */
export async function fetchLatestPlanningApproval(projectId: string): Promise<PlanningApproval | null> {
  const { data, error } = await supabase
    .from('project_planning_approvals')
    .select(APPROVAL_COLUMNS)
    .eq('project_id', projectId)
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toApproval(data) : null;
}

/** Projetos com pedido aberto, para a pendência no card do portfólio (cenário 12). */
export async function fetchOpenPlanningApprovals(projectIds: string[]): Promise<Set<string>> {
  if (!projectIds.length) return new Set();
  const { data, error } = await supabase
    .from('project_planning_approvals')
    .select('project_id')
    .in('project_id', projectIds)
    .eq('status', PLANNING_APPROVAL_STATUS.REQUESTED);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.project_id));
}

/** Abre o pedido e devolve o id dele. */
export async function requestPlanningApproval(input: RequestApprovalInput): Promise<string> {
  const { data, error } = await supabase
    .from('project_planning_approvals')
    .insert({
      project_id: input.projectId,
      tenant_id: input.tenantId,
      planned_result: Number(input.plannedResult.toFixed(2)),
      budgeted_result: Number(input.budgetedResult.toFixed(2)),
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/** Cancela (GP), aprova ou devolve (admin) um pedido aberto. */
export async function decidePlanningApproval(input: DecideApprovalInput): Promise<void> {
  const { error } = await supabase
    .from('project_planning_approvals')
    .update({ status: input.status, return_reason: input.returnReason?.trim() || null })
    .eq('id', input.approvalId)
    .eq('status', PLANNING_APPROVAL_STATUS.REQUESTED);
  if (error) throw error;
}

/** Aviso no sino (notificações existentes). Falha no aviso não desfaz a ação. */
export async function notifyPlanning(notice: PlanningNotice): Promise<void> {
  const recipients = Array.from(new Set(notice.recipientIds.filter(Boolean)));
  if (!recipients.length) return;
  await supabase.from('notifications').insert(
    recipients.map((recipientId) => ({
      tenant_id: notice.tenantId,
      recipient_id: recipientId,
      type: notice.type,
      category: 'project',
      priority: 'normal',
      title: notice.title,
      message: notice.message,
      reference_id: notice.projectId,
      action_url: `/projects/${notice.projectId}`,
    })),
  );
}

/**
 * Conclui o planejamento: o projeto vai para Entrega de Valor e fica ativo. A data de início
 * não muda — continua a do período (decisão do Victor, 23/11/2026).
 */
export async function concludePlanning(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .update({ portfolio_stage: 'value_delivery', status: 'active' })
    .eq('id', projectId);
  if (error) throw error;
}

/** Dia em que a Oportunidade de origem foi ganha (`prospects.won_on`), ou `null`. */
export async function fetchWonOn(prospectId: string): Promise<string | null> {
  // Quem não lê a Prospecção recebe vazio da RLS: a origem mostra só o orçamento.
  const { data, error } = await tabela('prospects').select('won_on').eq('id', prospectId).maybeSingle();
  if (error || !data) return null;
  return (data as { won_on: string | null }).won_on;
}

/** Grava os resultados-chave de um objetivo; o valor atual começa na linha de base. */
export async function addKeyResults(okrId: string, keyResults: KeyResultInput[]): Promise<void> {
  if (!keyResults.length) return;
  const { error } = await supabase.from('project_key_results').insert(
    keyResults.map((kr) => ({
      okr_id: okrId,
      description: kr.description,
      measurement: kr.measurement,
      baseline_value: kr.baseline,
      current_value: kr.baseline,
      target_value: kr.target,
      unit: kr.unit,
      target_date: kr.targetDate,
      confidence_level: 'medium',
    })),
  );
  if (error) throw error;
}

/** Objetivo e resultados-chave de uma vez (cenário 4). Se os resultados falharem, o objetivo sai. */
export async function createObjectiveWithKeyResults(input: ObjectiveInput): Promise<void> {
  const { data, error } = await supabase
    .from('project_okrs')
    .insert({ project_id: input.projectId, objective: input.objective, status: 'pending' })
    .select('id')
    .single();
  if (error) throw error;
  try {
    await addKeyResults(data.id, input.keyResults);
  } catch (krError) {
    await supabase.from('project_okrs').delete().eq('id', data.id);
    throw krError;
  }
}
