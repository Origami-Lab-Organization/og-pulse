import { VacationApprovalStatus, VacationRequestStatus } from '@/types/vacation';

export type RequesterRole = 'admin' | 'manager' | 'user';

/**
 * Mapeia as flags do AuthContext para o papel efetivo do solicitante.
 * Atenção: `isManager` (is_gerente) também é true para admins, por isso a ordem importa.
 */
export function mapRequesterRole(isAdmin: boolean, isManager: boolean): RequesterRole {
  if (isAdmin) return 'admin';
  if (isManager) return 'manager';
  return 'user';
}

export interface ApproverResolutionInput {
  requesterId: string;
  requesterRole: RequesterRole;
  /** Gerentes (employee ids) dos projetos ativos do funcionário — pode ter duplicatas/self/vazio. */
  projectManagerIds: readonly string[];
  /** Admins do tenant (employee ids) — fallback de aprovação. */
  adminIds: readonly string[];
}

export interface ApproverResolution {
  autoApprove: boolean;
  approverIds: string[];
}

function dedupeExcluding(ids: readonly string[], excludeId: string): string[] {
  return [...new Set(ids)].filter((id) => id && id !== excludeId);
}

/**
 * Quem precisa aprovar a solicitação (snapshot na criação, ver ADR-0003):
 *  - admin   → auto-aprovado (sem aprovadores)
 *  - manager → admins do tenant
 *  - user    → gerentes distintos dos projetos ativos; sem projeto/gerente → admins
 * O próprio solicitante é sempre excluído.
 */
export function resolveApprovers({
  requesterId,
  requesterRole,
  projectManagerIds,
  adminIds,
}: ApproverResolutionInput): ApproverResolution {
  if (requesterRole === 'admin') {
    return { autoApprove: true, approverIds: [] };
  }

  if (requesterRole === 'manager') {
    return { autoApprove: false, approverIds: dedupeExcluding(adminIds, requesterId) };
  }

  // user
  const fromProjects = dedupeExcluding(projectManagerIds, requesterId);
  const approverIds = fromProjects.length > 0 ? fromProjects : dedupeExcluding(adminIds, requesterId);
  return { autoApprove: false, approverIds };
}

/**
 * Status do pedido derivado dos votos dos aprovadores:
 *  - qualquer rejeição        → 'rejected'
 *  - todos aprovaram (≥1 voto) → 'approved'
 *  - caso contrário           → 'pending'
 */
export function resolveRequestStatus(
  approvalStatuses: readonly VacationApprovalStatus[],
): Extract<VacationRequestStatus, 'pending' | 'approved' | 'rejected'> {
  if (approvalStatuses.some((s) => s === 'rejected')) return 'rejected';
  if (approvalStatuses.length > 0 && approvalStatuses.every((s) => s === 'approved')) {
    return 'approved';
  }
  return 'pending';
}
