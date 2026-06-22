import { supabase } from '@/integrations/supabase/client';
import { ContractType } from '@/types/employee';
import {
  CreateVacationRequestInput,
  VacationApproval,
  VacationApprovalDB,
  VacationRequest,
  VacationRequestDB,
  isVacationEligible,
} from '@/types/vacation';
import {
  RequesterRole,
  mapRequesterRole,
  resolveApprovers,
  resolveRequestStatus,
} from '@/lib/vacationApproval';

// As tabelas de férias ainda não estão no types.ts gerado — casts `as any` seguem o
// mesmo padrão do reembolso até a regeneração dos tipos do Supabase.
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface VacationRequester {
  employeeId: string;
  tenantId: string;
  nome: string;
  isAdmin: boolean;
  /** is_gerente do AuthContext (true também para admin). */
  isManager: boolean;
}

export interface EmployeeVacationProfile {
  admissionDate: string | null;
  contractType: ContractType;
  eligible: boolean;
}

const ACTIVE_PROJECT_FILTER = '("completed")';

async function fetchActiveProjectManagerIds(employeeId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select('projects!inner(manager_id, portfolio_stage)')
    .eq('employee_id', employeeId)
    .not('projects.portfolio_stage', 'in', ACTIVE_PROJECT_FILTER);
  if (error) throw error;
  const ids = (data || [])
    .map((row: any) => row.projects?.manager_id as string | null)
    .filter((id: string | null): id is string => !!id);
  return [...new Set(ids)];
}

async function fetchAdminEmployeeIds(tenantId: string): Promise<string[]> {
  const { data: roles } = await supabase
    .from('user_roles' as any)
    .select('user_id')
    .eq('tenant_id', tenantId)
    .eq('role', 'admin');
  const userIds = ((roles || []) as any[]).map((r) => r.user_id);
  if (userIds.length === 0) return [];
  const { data: emps } = await supabase
    .from('employees')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('auth_id', userIds);
  return ((emps || []) as any[]).map((e) => e.id);
}

async function fetchApprovalsByRequestIds(requestIds: string[]): Promise<Map<string, VacationApproval[]>> {
  const byRequest = new Map<string, VacationApproval[]>();
  if (requestIds.length === 0) return byRequest;

  const { data, error } = await supabase
    .from('vacation_request_approvals' as any)
    .select('*')
    .in('request_id', requestIds);
  if (error) throw error;

  const approvals = (data || []) as unknown as VacationApprovalDB[];
  const approverIds = [...new Set(approvals.map((a) => a.approver_id))];
  const projectIds = [...new Set(approvals.filter((a) => a.project_id).map((a) => a.project_id!))];

  const [empsRes, projsRes] = await Promise.all([
    approverIds.length > 0
      ? supabase.from('employees').select('id, nome').in('id', approverIds)
      : Promise.resolve({ data: [] as any[] }),
    projectIds.length > 0
      ? supabase.from('projects').select('id, name').in('id', projectIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const nameMap = new Map(((empsRes as any).data || []).map((e: any) => [e.id, e.nome]));
  const projMap = new Map(((projsRes as any).data || []).map((p: any) => [p.id, p.name]));

  for (const approval of approvals) {
    const enriched: VacationApproval = {
      ...approval,
      approver_name: nameMap.get(approval.approver_id) || 'Desconhecido',
      project_name: approval.project_id ? projMap.get(approval.project_id) || '' : '',
    };
    const list = byRequest.get(approval.request_id) || [];
    list.push(enriched);
    byRequest.set(approval.request_id, list);
  }
  return byRequest;
}

async function attachApprovals(requests: VacationRequestDB[]): Promise<VacationRequest[]> {
  const byRequest = await fetchApprovalsByRequestIds(requests.map((r) => r.id));
  return requests.map((r) => ({ ...r, approvals: byRequest.get(r.id) || [] }));
}

async function notifyVacation(
  recipientIds: string[],
  tenantId: string,
  payload: {
    type: string;
    title: string;
    message: string;
    referenceId: string;
    actionType: string;
    priority?: string;
    metadata?: Record<string, any>;
  },
): Promise<void> {
  const recipients = [...new Set(recipientIds)].filter(Boolean);
  if (recipients.length === 0) return;
  await supabase.from('notifications' as any).insert(
    recipients.map((recipientId) => ({
      tenant_id: tenantId,
      recipient_id: recipientId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      reference_id: payload.referenceId,
      category: 'vacation',
      action_type: payload.actionType,
      priority: payload.priority || 'normal',
      metadata: payload.metadata || {},
    })) as any,
  );
}

function formatPtDate(iso: string): string {
  // iso = 'YYYY-MM-DD'
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

export const vacationService = {
  async getEmployeeProfile(employeeId: string): Promise<EmployeeVacationProfile> {
    const { data, error } = await supabase
      .from('employees')
      .select('data_admissao, tipo_contratacao')
      .eq('id', employeeId)
      .single();
    if (error) throw error;
    const contractType = (data as any)?.tipo_contratacao as ContractType;
    return {
      admissionDate: (data as any)?.data_admissao ?? null,
      contractType,
      eligible: isVacationEligible(contractType),
    };
  },

  async listMyRequests(employeeId: string): Promise<VacationRequest[]> {
    const { data, error } = await supabase
      .from('vacation_requests' as any)
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return attachApprovals((data || []) as unknown as VacationRequestDB[]);
  },

  /** Pedidos pendentes em que o usuário atual é aprovador com voto ainda pendente. */
  async listPendingApprovals(approverEmployeeId: string): Promise<VacationRequest[]> {
    const { data: myApprovals, error } = await supabase
      .from('vacation_request_approvals' as any)
      .select('request_id')
      .eq('approver_id', approverEmployeeId)
      .eq('status', 'pending');
    if (error) throw error;

    const requestIds = [...new Set(((myApprovals || []) as any[]).map((a) => a.request_id))];
    if (requestIds.length === 0) return [];

    const { data: reqs, error: reqErr } = await supabase
      .from('vacation_requests' as any)
      .select('*')
      .in('id', requestIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (reqErr) throw reqErr;

    const requests = (reqs || []) as unknown as VacationRequestDB[];
    return enrichWithEmployeeNames(await attachApprovals(requests));
  },

  /** Visão de gestão: admin vê tudo do tenant; gerente vê pedidos que aprova. */
  async listTeamRequests(ctx: VacationRequester): Promise<VacationRequest[]> {
    let requests: VacationRequestDB[] = [];

    if (ctx.isAdmin) {
      const { data, error } = await supabase
        .from('vacation_requests' as any)
        .select('*')
        .eq('tenant_id', ctx.tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      requests = (data || []) as unknown as VacationRequestDB[];
    } else {
      const { data: myApprovals } = await supabase
        .from('vacation_request_approvals' as any)
        .select('request_id')
        .eq('approver_id', ctx.employeeId);
      const requestIds = [...new Set(((myApprovals || []) as any[]).map((a) => a.request_id))];
      if (requestIds.length === 0) return [];
      const { data, error } = await supabase
        .from('vacation_requests' as any)
        .select('*')
        .in('id', requestIds)
        .order('created_at', { ascending: false });
      if (error) throw error;
      requests = (data || []) as unknown as VacationRequestDB[];
    }

    return enrichWithEmployeeNames(await attachApprovals(requests));
  },

  async createRequest(ctx: VacationRequester, input: CreateVacationRequestInput): Promise<VacationRequestDB> {
    const profile = await vacationService.getEmployeeProfile(ctx.employeeId);
    if (!profile.eligible) {
      throw new Error('Seu tipo de contrato não tem direito a solicitar férias.');
    }

    const role = mapRequesterRole(ctx.isAdmin, ctx.isManager);
    const [projectManagerIds, adminIds] = await Promise.all([
      role === 'user' ? fetchActiveProjectManagerIds(ctx.employeeId) : Promise.resolve<string[]>([]),
      role === 'admin' ? Promise.resolve<string[]>([]) : fetchAdminEmployeeIds(ctx.tenantId),
    ]);

    const { autoApprove, approverIds } = resolveApprovers({
      requesterId: ctx.employeeId,
      requesterRole: role,
      projectManagerIds,
      adminIds,
    });

    const now = new Date().toISOString();
    const { data: created, error } = await supabase
      .from('vacation_requests' as any)
      .insert({
        tenant_id: ctx.tenantId,
        employee_id: ctx.employeeId,
        start_date: input.startDate,
        end_date: input.endDate,
        days_requested: input.daysRequested,
        notes: input.notes || null,
        ...(autoApprove ? { status: 'approved', auto_approved: true, reviewed_at: now } : {}),
      } as any)
      .select()
      .single();
    if (error) throw error;

    const request = created as unknown as VacationRequestDB;

    // Mapeia aprovador -> projeto (para registrar o contexto da aprovação).
    if (!autoApprove && approverIds.length > 0) {
      const projectByManager = await mapManagerToProject(ctx.employeeId, approverIds, role);
      const rows = approverIds.map((approverId) => ({
        request_id: request.id,
        approver_id: approverId,
        project_id: projectByManager.get(approverId) || null,
      }));
      const { error: apprErr } = await supabase
        .from('vacation_request_approvals' as any)
        .insert(rows as any);
      if (apprErr) throw apprErr;
    }

    await notifyOnCreate(ctx, request, autoApprove, approverIds, input);
    return request;
  },

  async approve(ctx: VacationRequester, requestId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('vacation_request_approvals' as any)
      .update({ status: 'approved', reviewed_at: now } as any)
      .eq('request_id', requestId)
      .eq('approver_id', ctx.employeeId);
    if (error) throw error;

    const { data: approvals } = await supabase
      .from('vacation_request_approvals' as any)
      .select('status')
      .eq('request_id', requestId);
    const statuses = ((approvals || []) as any[]).map((a) => a.status);

    if (resolveRequestStatus(statuses) === 'approved') {
      await supabase
        .from('vacation_requests' as any)
        .update({ status: 'approved', reviewed_at: now } as any)
        .eq('id', requestId);
      await notifyRequesterOutcome(ctx, requestId, 'approved');
    } else {
      await notifyRequesterPartialApproval(ctx, requestId);
    }
  },

  async reject(ctx: VacationRequester, requestId: string, reason: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('vacation_request_approvals' as any)
      .update({ status: 'rejected', rejection_reason: reason, reviewed_at: now } as any)
      .eq('request_id', requestId)
      .eq('approver_id', ctx.employeeId);
    if (error) throw error;

    const { error: reqErr } = await supabase
      .from('vacation_requests' as any)
      .update({ status: 'rejected', rejection_reason: reason, reviewed_at: now } as any)
      .eq('id', requestId);
    if (reqErr) throw reqErr;

    await notifyRequesterOutcome(ctx, requestId, 'rejected', reason);
  },

  async cancelRequest(employeeId: string, requestId: string): Promise<void> {
    const { error } = await supabase
      .from('vacation_requests' as any)
      .update({ status: 'cancelled' } as any)
      .eq('id', requestId)
      .eq('employee_id', employeeId)
      .eq('status', 'pending');
    if (error) throw error;
  },
};

// ---- helpers que dependem do service (mantidos fora do objeto) ----

async function enrichWithEmployeeNames(requests: VacationRequest[]): Promise<VacationRequest[]> {
  const employeeIds = [...new Set(requests.map((r) => r.employee_id))];
  if (employeeIds.length === 0) return requests;
  const { data } = await supabase.from('employees').select('id, nome').in('id', employeeIds);
  const nameMap = new Map(((data || []) as any[]).map((e) => [e.id, e.nome]));
  return requests.map((r) => ({ ...r, employee_name: nameMap.get(r.employee_id) || 'Desconhecido' }));
}

/** Para cada gerente aprovador, encontra um projeto ativo do funcionário que ele gerencia. */
async function mapManagerToProject(
  employeeId: string,
  approverIds: string[],
  role: RequesterRole,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (role !== 'user') return map; // admin aprovando gerente não tem projeto associado

  const { data } = await supabase
    .from('project_members')
    .select('projects!inner(id, manager_id, portfolio_stage)')
    .eq('employee_id', employeeId)
    .not('projects.portfolio_stage', 'in', ACTIVE_PROJECT_FILTER);

  for (const row of (data || []) as any[]) {
    const managerId = row.projects?.manager_id as string | null;
    const projectId = row.projects?.id as string | null;
    if (managerId && projectId && approverIds.includes(managerId) && !map.has(managerId)) {
      map.set(managerId, projectId);
    }
  }
  return map;
}

async function notifyOnCreate(
  ctx: VacationRequester,
  request: VacationRequestDB,
  autoApprove: boolean,
  approverIds: string[],
  input: CreateVacationRequestInput,
): Promise<void> {
  try {
    if (autoApprove || approverIds.length === 0) return;
    const period = `${formatPtDate(input.startDate)} a ${formatPtDate(input.endDate)}`;
    await notifyVacation(approverIds, ctx.tenantId, {
      type: 'vacation_pending',
      title: `${ctx.nome} solicitou férias (${input.daysRequested} dias)`,
      message: `Período: ${period}. Aguardando sua aprovação.`,
      referenceId: request.id,
      actionType: 'approve_reject',
      priority: 'high',
      metadata: {
        requester_name: ctx.nome,
        days: input.daysRequested,
        start_date: input.startDate,
        end_date: input.endDate,
      },
    });
  } catch (e) {
    console.error('Erro ao notificar aprovadores de férias:', e);
  }
}

async function notifyRequesterOutcome(
  ctx: VacationRequester,
  requestId: string,
  outcome: 'approved' | 'rejected',
  reason?: string,
): Promise<void> {
  try {
    const { data: req } = await supabase
      .from('vacation_requests' as any)
      .select('employee_id, days_requested, start_date, end_date')
      .eq('id', requestId)
      .maybeSingle();
    if (!req) return;
    const r = req as any;
    const period = `${formatPtDate(r.start_date)} a ${formatPtDate(r.end_date)}`;
    const approved = outcome === 'approved';
    await notifyVacation([r.employee_id], ctx.tenantId, {
      type: approved ? 'vacation_approved' : 'vacation_rejected',
      title: approved
        ? `Férias aprovadas (${r.days_requested} dias)`
        : `Férias recusadas (${r.days_requested} dias)`,
      message: approved
        ? `Seu período de ${period} foi aprovado.`
        : `Seu período de ${period} foi recusado por ${ctx.nome}.${reason ? ` Motivo: "${reason}"` : ''}`,
      referenceId: requestId,
      actionType: 'info',
      metadata: { reviewer_name: ctx.nome, days: r.days_requested, rejection_reason: reason },
    });
  } catch (e) {
    console.error('Erro ao notificar solicitante de férias:', e);
  }
}

async function notifyRequesterPartialApproval(ctx: VacationRequester, requestId: string): Promise<void> {
  try {
    const { data: req } = await supabase
      .from('vacation_requests' as any)
      .select('employee_id, days_requested')
      .eq('id', requestId)
      .maybeSingle();
    if (!req) return;
    const r = req as any;
    await notifyVacation([r.employee_id], ctx.tenantId, {
      type: 'vacation_partially_approved',
      title: `${ctx.nome} aprovou suas férias`,
      message: 'Ainda aguardando a aprovação dos demais gerentes.',
      referenceId: requestId,
      actionType: 'info',
      metadata: { reviewer_name: ctx.nome, days: r.days_requested },
    });
  } catch (e) {
    console.error('Erro ao notificar aprovação parcial de férias:', e);
  }
}
