import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { approvalIsStale } from '@/lib/projectPlanning';
import { PLANNING_APPROVAL_STATUS } from '@/lib/projectPlanning.constants';
import { decidePlanningApproval } from '@/services/projectPlanningService';
import type { PlanningApproval, PlanningChecklist, PlanningItemKey } from '@/types/projectPlanning';

const JUST_DONE_MS = 2600;

/**
 * Item que acabou de ficar pronto ganha o "Pronto ·" por alguns segundos (cenário 3): o
 * retorno de que o checklist acompanhou. O primeiro carregamento não conta como mudança.
 */
export function usePlanningJustDone(checklist: PlanningChecklist, ready: boolean): PlanningItemKey | null {
  const previous = useRef<Map<PlanningItemKey, boolean> | null>(null);
  const [justDone, setJustDone] = useState<PlanningItemKey | null>(null);

  useEffect(() => {
    if (!ready) return;
    const current = new Map(checklist.items.map((item) => [item.key, item.done] as const));
    const before = previous.current;
    previous.current = current;
    const flipped = before && checklist.items.find((item) => item.done && before.get(item.key) === false);
    if (!flipped) return;
    setJustDone(flipped.key);
    const timer = window.setTimeout(() => setJustDone(null), JUST_DONE_MS);
    return () => window.clearTimeout(timer);
  }, [checklist, ready]);

  return justDone;
}

interface StaleApprovalInput {
  approval: PlanningApproval | null;
  plannedResult: number;
  /** Só quem pediu cancela: a conta dele é a mesma do momento do pedido. */
  employeeId: string | undefined;
  ready: boolean;
  onCancelled: () => void;
}

/**
 * Mudou o resultado planejado depois do pedido: o pedido cai e o GP é avisado de que precisa
 * pedir de novo (cenário 13).
 */
export function useCancelStaleApproval(input: StaleApprovalInput) {
  const { toast } = useToast();
  const cancelling = useRef<string | null>(null);
  const { approval, plannedResult, employeeId, ready, onCancelled } = input;
  const stale = ready && Boolean(employeeId) && approval?.requested_by === employeeId && approvalIsStale(approval, plannedResult);

  useEffect(() => {
    if (!stale || !approval || cancelling.current === approval.id) return;
    cancelling.current = approval.id;
    decidePlanningApproval({ approvalId: approval.id, status: PLANNING_APPROVAL_STATUS.CANCELLED })
      .then(() => {
        toast({
          title: 'Pedido de aprovação cancelado',
          description: 'O resultado planejado mudou depois do pedido. Se ainda ficar abaixo do orçado, peça de novo.',
        });
        onCancelled();
      })
      .catch(() => {
        cancelling.current = null;
      });
  }, [stale, approval, toast, onCancelled]);
}
