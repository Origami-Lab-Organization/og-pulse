import { useMemo } from 'react';
import { ProjectWithRelations } from '@/types/project';
import { useMaskedCurrency, useHideValues } from '@/contexts/HideValuesContext';
import { FinanceInstallmentsTable } from './financial/FinanceInstallmentsTable';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { useBudget } from '@/hooks/useBudgets';
import { useProjectCommissions } from '@/hooks/useProjectCommissions';
import { useProjectCostSummary } from '@/hooks/useProjectCostSummary';
import { buildContractCurve, buildProjectForecast, forecastTone } from '@/lib/projectForecast';
import { FinancialKpiCards } from './financial/FinancialKpiCards';
import { ProjectPnLBridge } from './financial/ProjectPnLBridge';
import { ProjectContractCurveChart } from './financial/ProjectContractCurveChart';
import { FinancialAlertBanner } from './financial/FinancialAlertBanner';

interface ProjectFinancialTabProps {
  project: ProjectWithRelations;
  isReadOnly?: boolean;
  canManageInstallments?: boolean;
  onNavigateToTab?: (tab: string) => void;
}

export function ProjectFinancialTab({
  project,
  isReadOnly = false,
  canManageInstallments = false,
  onNavigateToTab,
}: ProjectFinancialTabProps) {
  const formatCurrency = useMaskedCurrency();
  const hideValues = useHideValues();
  // A meta e os percentuais que julgam ESTE projeto são os que valiam quando ele começou
  // (PUL-260). Mudar a política em setembro não muda o que um projeto de janeiro assinou.
  const { data: financialSettings } = useFinancialSettings(project.start_date);
  const { data: budget } = useBudget(project.budget_id);
  const { data: commissions = [] } = useProjectCommissions(project.id);
  const marginTarget = financialSettings?.gross_margin_target_percent ?? 0;

  // Totais, meses, forecast e curva: regra única do custo do projeto (US-0025/US-0026) — o
  // mesmo número da Visão Geral e da aba Despesas, mês a mês de calendário (US-0031).
  const costSummary = useProjectCostSummary(project);
  const costData = useMemo(
    () => ({
      totalPlanned: costSummary.totalPlanned,
      totalActual: costSummary.totalActual,
      laborPlanned: costSummary.laborPlanned,
      laborActual: costSummary.laborActual,
      extraPlanned: costSummary.otherPlanned,
      extraActual: costSummary.otherActual,
    }),
    [costSummary],
  );

  // KPI data (same logic as OverviewTab)
  const kpiData = useMemo(() => {
    const contractValue = Number(project.total_value || 0);
    const receivedValue = (project.installments || [])
      .filter((i) => i.status === 'received')
      .reduce((sum, i) => sum + Number(i.value), 0);

    const revenuePlanned = contractValue;
    const revenueActual = receivedValue;
    const revenueExecuted = revenuePlanned > 0 ? (revenueActual / revenuePlanned) * 100 : 0;

    const costPlanned = costData.totalPlanned;
    const costActual = costData.totalActual;
    const costExecuted = costPlanned > 0 ? (costActual / costPlanned) * 100 : 0;

    // Commission
    const commissionPlanned = budget
      ? (budget.commission_percent / 100) * budget.total_with_fees
      : 0;
    const commissionActual = commissions.filter((c) => c.is_paid).reduce((s, c) => s + Number(c.planned_value), 0);

    const marginPlanned = revenuePlanned > 0 ? ((revenuePlanned - commissionPlanned - costPlanned) / revenuePlanned) * 100 : 0;
    const marginActual = revenueActual > 0 ? ((revenueActual - commissionActual - costActual) / revenueActual) * 100 : 0;

    return {
      revenuePlanned, revenueActual, revenueExecuted,
      commissionPlanned, commissionActual,
      costPlanned, costActual, costExecuted,
      marginPlanned, marginActual,
    };
  }, [project, costData, budget, commissions]);

  // Forecast: custo realizado + o que ainda falta do plano; depois da data de fim, só o
  // realizado (US-0031).
  const forecast = useMemo(
    () =>
      buildProjectForecast({
        months: costSummary.months,
        project,
        contract: kpiData.revenuePlanned,
        commissionPlanned: kpiData.commissionPlanned,
        today: new Date(),
      }),
    [costSummary.months, project, kpiData.revenuePlanned, kpiData.commissionPlanned],
  );

  // Curva acumulada receita × custo (sólido até hoje, tracejado na projeção).
  const { points: curveData, todayLabel } = useMemo(
    () =>
      buildContractCurve({
        months: costSummary.months,
        installments: project.installments || [],
        project,
        today: new Date(),
      }),
    [costSummary.months, project],
  );

  // Alertas reais (único uso de vermelho nesta aba).
  const alerts = useMemo(() => {
    const list: string[] = [];
    const today = new Date();
    (project.installments || []).forEach((inst) => {
      const days = differenceInCalendarDays(today, parseISO(inst.due_date));
      const overdue = inst.status === 'overdue' || (inst.status !== 'received' && days > 0);
      if (overdue && days > 0) {
        list.push(`Parcela ${inst.installment_number} vencida há ${days} ${days === 1 ? 'dia' : 'dias'}`);
      }
    });
    // Só na faixa vermelha (mais de 10% abaixo da meta), como o card (US-0032).
    if (forecastTone(forecast.forecastMargin, marginTarget, costData.totalPlanned > 0) === 'critical') {
      list.push(
        `Margem projetada (${forecast.forecastMargin.toFixed(0)}%) abaixo da meta (${marginTarget.toFixed(0)}%)`,
      );
    }
    return list;
  }, [project.installments, forecast.forecastMargin, marginTarget, costData.totalPlanned]);

  // Resumo de faturamento (rodapé da tabela de parcelas).
  const revenueGap = Math.max(0, kpiData.revenuePlanned - kpiData.revenueActual);
  const pendingCount = (project.installments || []).filter((i) => i.status !== 'received').length;
  const marginGapPp = forecast.forecastMargin - marginTarget;

  const insight = hideValues
    ? 'Projeção de fechamento com base no ritmo atual.'
    : `No ritmo atual, o projeto fecha com margem de ${forecast.forecastMargin.toFixed(0)}% — ${Math.abs(marginGapPp).toFixed(0)}pp ${marginGapPp >= 0 ? 'acima' : 'abaixo'} da meta. Gap de faturamento: ${formatCurrency(revenueGap)} a emitir (${pendingCount} ${pendingCount === 1 ? 'parcela' : 'parcelas'}).`;

  // Sem custo planejado (totalPlanned = 0), o forecast não pode ser projetado
  const hasCostPlanned = costData.totalPlanned > 0;

  return (
    <div className="space-y-3">
      <FinancialKpiCards
        revenueActual={kpiData.revenueActual}
        revenuePlanned={kpiData.revenuePlanned}
        revenueExecuted={kpiData.revenueExecuted}
        costActual={kpiData.costActual}
        costPlanned={kpiData.costPlanned}
        costExecuted={kpiData.costExecuted}
        marginActual={kpiData.marginActual}
        marginPlanned={kpiData.marginPlanned}
        marginTarget={marginTarget}
        forecastMargin={forecast.forecastMargin}
        forecastCost={forecast.forecastCost}
        projectEnded={forecast.projectEnded}
        hasCostPlanned={hasCostPlanned}
        onNavigateToExpenses={onNavigateToTab ? () => onNavigateToTab('costs') : undefined}
      />

      <div className="grid gap-3 lg:grid-cols-[1.05fr_1.5fr]">
        <ProjectPnLBridge
          contract={kpiData.revenuePlanned}
          commission={kpiData.commissionPlanned}
          labor={costData.laborPlanned}
          other={costData.extraPlanned}
        />
        <ProjectContractCurveChart
          data={curveData}
          contractValue={kpiData.revenuePlanned}
          todayLabel={todayLabel}
          insight={insight}
        />
      </div>

      <FinanceInstallmentsTable project={project} canManage={canManageInstallments} />

      <FinancialAlertBanner alerts={alerts} />
    </div>
  );
}
