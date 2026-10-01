import { CostComparisonKind } from '@/types/conciliacao';
import type { CostComparisonRow, PayablesByCostCenterRow } from '@/types/conciliacao';
import type { CostCenter, CostCenterCostRow } from '@/types/costCenter';

/**
 * Compara, por centro de custo, o custo de pessoas do Pulse com o pago no Conta Azul (ADR-0044,
 * parte 4). Não é a mesma grandeza — o Pulse estima horas × custo-hora, o Conta Azul tem tudo o
 * que saiu do caixa e foi rateado para o centro — e a tela diz isso. A distância entre os dois é
 * justamente o que o Pulse não enxerga.
 */
export function compareByCostCenter(
  pulseRows: readonly CostCenterCostRow[],
  paidRows: readonly PayablesByCostCenterRow[],
  centers: readonly CostCenter[],
): CostComparisonRow[] {
  const pulseByCenter = new Map(pulseRows.map((r) => [r.costCenterId, r.totalCost]));
  const paidByCenter = new Map<string, number>();
  for (const r of paidRows) {
    if (r.cost_center_id) paidByCenter.set(r.cost_center_id, (paidByCenter.get(r.cost_center_id) ?? 0) + Number(r.amount));
  }

  const linked: CostComparisonRow[] = centers
    .filter((c) => c.is_active || pulseByCenter.has(c.id) || paidByCenter.has(c.id))
    .map((c) => ({
      key: c.id,
      kind: CostComparisonKind.Linked,
      label: c.name,
      pulseCost: pulseByCenter.get(c.id) ?? 0,
      paid: paidByCenter.get(c.id) ?? 0,
    }));

  const unlinked: CostComparisonRow[] = paidRows
    .filter((r) => r.ca_cost_center_id && !r.cost_center_id)
    .map((r) => ({
      key: `ca:${r.ca_cost_center_id}`,
      kind: CostComparisonKind.Unlinked,
      label: r.ca_cost_center_name ?? 'Centro do Conta Azul',
      pulseCost: null,
      paid: Number(r.amount),
    }));

  const extras: CostComparisonRow[] = [];
  const noCenterPaid = paidRows.filter((r) => !r.ca_cost_center_id).reduce((s, r) => s + Number(r.amount), 0);
  if (noCenterPaid > 0) {
    extras.push({ key: 'sem-centro-ca', kind: CostComparisonKind.NoCenterContaAzul, label: 'Sem centro no Conta Azul', pulseCost: null, paid: noCenterPaid });
  }
  const noCenterPulse = pulseByCenter.get(null) ?? 0;
  if (noCenterPulse > 0) {
    extras.push({ key: 'sem-centro-pulse', kind: CostComparisonKind.NoCenterPulse, label: 'Sem centro no Pulse', pulseCost: noCenterPulse, paid: null });
  }

  const byPaid = (a: CostComparisonRow, b: CostComparisonRow) => (b.paid ?? 0) - (a.paid ?? 0);
  return [...linked.sort(byPaid), ...unlinked.sort(byPaid), ...extras];
}

export function totals(rows: readonly CostComparisonRow[]): { pulseCost: number; paid: number } {
  return rows.reduce(
    (acc, r) => ({ pulseCost: acc.pulseCost + (r.pulseCost ?? 0), paid: acc.paid + (r.paid ?? 0) }),
    { pulseCost: 0, paid: 0 },
  );
}
