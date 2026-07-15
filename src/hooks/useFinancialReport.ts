import { useMemo } from 'react';
import { useFinancialEvolution, type FinancialMonthlyPoint } from '@/hooks/useFinancialEvolution';
import { useRevenueAnalytics, type RevenueAnalyticsData } from '@/hooks/useRevenueAnalytics';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import type { AnalyticsFilters } from '@/hooks/useAnalyticsData';

export interface ClientBreakdownRow {
  id: string;
  label: string;
  faturado: number;
  recebido: number;
  custo: number;
  margem: number | null;
}

export interface FinancialDelta {
  pct: number | null;
  /** true quando a variação é "boa" (subir receita/faturamento é bom; subir custo é ruim). */
  positive: boolean;
}

export interface FinancialCostCategory {
  key: string;
  label: string;
  value: number;
  pct: number;
  scope: 'billable' | 'interno' | 'misto';
  billable?: number;
  internal?: number;
}

export interface FinancialReportData {
  comparisonLabel: string;
  faturamento: number;
  receita: number;
  custos: number;
  // Previsto (contratado/planejado) no período, para o comparativo realizado × previsto
  faturamentoPrevisto: number;
  receitaPrevista: number;
  custosPrevisto: number;
  resultado: number;
  margemPct: number | null;
  metaPct: number | null;
  faturamentoDelta: FinancialDelta;
  receitaDelta: FinancialDelta;
  custosDelta: FinancialDelta;
  margemDeltaPp: number | null;
  billableCost: number;
  internalCost: number;
  billablePct: number | null;
  categories: FinancialCostCategory[];
  clientBreakdown: ClientBreakdownRow[];
  evolutionMonths: FinancialMonthlyPoint[];
  revenue: RevenueAnalyticsData;
}

const EMPTY_REVENUE: RevenueAnalyticsData = {
  overdueNFs: [], overdueReceipts: [], periodNFs: [], periodReceivables: [],
  byClient: [], byManager: [], byServiceLine: [],
  receivablesByDueMonth: [], overdueReceivableTotal: 0, totalReceivable: 0,
};

function pctDelta(current: number, prev: number): number | null {
  if (!prev) return null;
  return ((current - prev) / prev) * 100;
}

const sumRange = (months: FinancialMonthlyPoint[], a: number, b: number, pick: (m: FinancialMonthlyPoint) => number) => {
  let total = 0;
  for (let i = a; i <= b; i++) if (months[i]) total += pick(months[i]);
  return total;
};

export function useFinancialReport(filters: AnalyticsFilters) {
  const evolution = useFinancialEvolution(filters);
  const revenue = useRevenueAnalytics(filters);
  const projFin = useProjectFinancials(filters);

  const data = useMemo<FinancialReportData | null>(() => {
    if (!evolution.data) return null;
    const months = evolution.data.months;
    // useFinancialEvolution carrega os 12 meses do ano de startDate; os meses do
    // período são derivados do range (o campo m.isHighlighted do hook é sempre false).
    const year = evolution.data.year;
    const minIdx = filters.startDate.getFullYear() < year ? 0 : filters.startDate.getMonth();
    const maxIdx = filters.endDate.getFullYear() > year ? 11 : filters.endDate.getMonth();
    if (maxIdx < minIdx) return null;
    const len = maxIdx - minIdx + 1;

    const sum = (pick: (m: FinancialMonthlyPoint) => number) => sumRange(months, minIdx, maxIdx, pick);

    const faturamento = sum((m) => m.faturado);
    const receita = sum((m) => m.revenueReal);
    const custos = sum((m) => m.totalCosts);
    // Previsto: parcelas contratadas por vencimento no período (plano de receita/faturamento)
    // e custos planejados (mão de obra + fornecedores + materiais planejados).
    const receitaPrevista = sum((m) => m.revenuePlanned);
    const faturamentoPrevisto = receitaPrevista;
    const custosPrevisto = sum((m) => m.plannedTotalCosts);
    const resultado = receita - custos;
    const margemPct = receita > 0 ? (resultado / receita) * 100 : null;
    const metaPct = evolution.data.grossMarginTarget && evolution.data.grossMarginTarget > 0
      ? evolution.data.grossMarginTarget
      : null;

    // Período anterior (mesmo comprimento, dentro do ano carregado).
    const prevMax = minIdx - 1;
    const prevMin = prevMax - len + 1;
    const hasPrev = prevMin >= 0;
    const prevFat = hasPrev ? sumRange(months, prevMin, prevMax, (m) => m.faturado) : 0;
    const prevRec = hasPrev ? sumRange(months, prevMin, prevMax, (m) => m.revenueReal) : 0;
    const prevCus = hasPrev ? sumRange(months, prevMin, prevMax, (m) => m.totalCosts) : 0;
    const prevMargem = hasPrev && prevRec > 0 ? ((prevRec - prevCus) / prevRec) * 100 : null;
    const margemDeltaPp = margemPct != null && prevMargem != null ? margemPct - prevMargem : null;
    const comparisonLabel = !hasPrev ? '' : len === 1 ? (months[prevMax]?.label ?? '') : 'período anterior';

    const internalCost = sum((m) => m.internalLaborCost);
    const custosSemInterno = Math.max(0, custos - internalCost);
    const billableCost = custosSemInterno;
    const billablePct = custos > 0 ? (billableCost / custos) * 100 : null;

    const laborBillable = sum((m) => m.laborCost);
    const materialEquip = sum((m) => m.materialCost) + sum((m) => m.equipmentCost);
    const rawCategories: FinancialCostCategory[] = [
      { key: 'labor', label: 'Mão de obra', value: laborBillable + internalCost, pct: 0, scope: 'misto', billable: laborBillable, internal: internalCost },
      { key: 'supplier', label: 'Fornecedores', value: sum((m) => m.supplierCost), pct: 0, scope: 'billable' },
      { key: 'material', label: 'Materiais / equipamentos', value: materialEquip, pct: 0, scope: 'billable' },
      { key: 'commission', label: 'Comissões', value: sum((m) => m.commissionCost), pct: 0, scope: 'billable' },
      { key: 'subscription', label: 'Assinaturas / ferramentas', value: sum((m) => m.subscriptionCost), pct: 0, scope: 'billable' },
      { key: 'reimbursement', label: 'Reembolsos', value: sum((m) => m.reimbursementCost), pct: 0, scope: 'billable' },
      { key: 'other', label: 'Outros / viagens', value: sum((m) => m.travelOtherCost), pct: 0, scope: 'billable' },
    ];
    const categories = rawCategories
      .filter((c) => c.value > 0)
      .map((c) => ({ ...c, pct: custos > 0 ? (c.value / custos) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    // Breakdown por cliente: faturado/recebido de useRevenueAnalytics + custo (billable de
    // projeto) de useProjectFinancials, casados por id de cliente.
    const costByClient = new Map((projFin.data?.byClient ?? []).map((c) => [c.id, c.costs]));
    const clientBreakdown: ClientBreakdownRow[] = (revenue.data?.byClient ?? [])
      .map((c) => {
        const custo = costByClient.get(c.id) ?? 0;
        const recebido = c.received;
        return {
          id: c.id,
          label: c.label,
          faturado: c.faturado,
          recebido,
          custo,
          margem: recebido > 0 ? ((recebido - custo) / recebido) * 100 : null,
        };
      })
      .filter((c) => c.faturado > 0 || c.recebido > 0 || c.custo > 0)
      .sort((a, b) => b.recebido - a.recebido || b.faturado - a.faturado);

    return {
      comparisonLabel,
      faturamento,
      receita,
      custos,
      faturamentoPrevisto,
      receitaPrevista,
      custosPrevisto,
      resultado,
      margemPct,
      metaPct,
      faturamentoDelta: { pct: hasPrev ? pctDelta(faturamento, prevFat) : null, positive: faturamento >= prevFat },
      receitaDelta: { pct: hasPrev ? pctDelta(receita, prevRec) : null, positive: receita >= prevRec },
      custosDelta: { pct: hasPrev ? pctDelta(custos, prevCus) : null, positive: custos <= prevCus },
      margemDeltaPp,
      billableCost,
      internalCost,
      billablePct,
      categories,
      clientBreakdown,
      evolutionMonths: months.slice(0, maxIdx + 1),
      revenue: revenue.data ?? EMPTY_REVENUE,
    };
  }, [evolution.data, revenue.data, projFin.data, filters.startDate, filters.endDate]);

  return {
    data,
    isLoading: evolution.isLoading,
    isError: evolution.isError,
    refetch: evolution.refetch,
  };
}
