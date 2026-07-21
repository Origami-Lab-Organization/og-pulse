import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectWithRelations } from '@/types/project';
import { getProjectMonthLabel } from '@/lib/formatters';
import { useMaskedCurrency, useHideValues } from '@/contexts/HideValuesContext';
import { ProjectInstallmentsTable } from '@/components/projects/ProjectInstallmentsTable';
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectTimesheets } from '@/hooks/useProjectTimesheets';
import { useProjectCostItems } from '@/hooks/useProjectCostItems';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import {
  parseISO,
  differenceInMonths,
  differenceInCalendarDays,
  startOfMonth,
  addMonths,
} from 'date-fns';
import { useBudget } from '@/hooks/useBudgets';
import { useProjectCommissions } from '@/hooks/useProjectCommissions';
import { useProjectPlannedLaborCost } from '@/hooks/useProjectPlannedLaborCost';
import { useHolidays } from '@/hooks/useHolidays';
import { getFallbackHourlyCost } from '@/lib/employeeCost';
import { FinancialKpiCards } from './financial/FinancialKpiCards';
import { ProjectPnLBridge } from './financial/ProjectPnLBridge';
import {
  ProjectContractCurveChart,
  ContractCurvePoint,
} from './financial/ProjectContractCurveChart';
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
  const memberIds = useMemo(
    () => (project.members || []).map((m) => m.id),
    [project.members]
  );
  const memberMap = useMemo(
    () => new Map((project.members || []).map((m) => [m.id, m])),
    [project.members],
  );

  const { data: memberMonths = [] } = useProjectMemberMonths(memberIds);
  // Por project_id, não pela equipe atual — projetos com equipe trocada tinham
  // lançamentos históricos excluídos do custo realizado (member.id não batia mais).
  const { data: timesheets = [] } = useProjectTimesheets(project.id);
  const { data: projectCosts = [] } = useProjectCostItems(project.id);
  const { data: financialSettings } = useFinancialSettings();
  const { data: budget } = useBudget(project.budget_id);
  const { data: commissions = [] } = useProjectCommissions(project.id);
  const { data: holidays = [] } = useHolidays();
  const marginTarget = financialSettings?.gross_margin_target_percent ?? 0;

  const projectDuration = useMemo(() => {
    if (project.is_continuous) return 12;
    if (!project.end_date) return 6;
    const start = parseISO(project.start_date);
    const end = parseISO(project.end_date);
    return Math.max(1, differenceInMonths(end, start) + 1);
  }, [project]);
  const plannedLaborFromAllocations = useProjectPlannedLaborCost(
    project,
    projectDuration,
  );

  const fallbackHourlyCost = (member: NonNullable<typeof project.members>[number], year: number, monthIndex: number) => {
    if (!member.employee) return Number((member as any).hourly_rate) || 0;
    return getFallbackHourlyCost(member.employee.total_monthly_cost_estimated || 0, member.employee.jornada_diaria || 8, year, monthIndex, holidays);
  };

  // Aggregate cost data (same logic as OverviewTab)
  const costData = useMemo(() => {
    const projStart = startOfMonth(parseISO(project.start_date));
    const laborPlanned = plannedLaborFromAllocations.hasRoleAllocations
      ? plannedLaborFromAllocations.total
      : (project.members || []).reduce((acc, member) => {
          const memberEntries = memberMonths.filter((mm) => mm.project_member_id === member.id);
          if (memberEntries.length === 0) {
            const fallbackCost = fallbackHourlyCost(member, projStart.getFullYear(), projStart.getMonth());
            return acc + fallbackCost * Number(member.hours_per_month || 0) * projectDuration;
          }

          return acc + memberEntries.reduce((sum, mm) => {
            if ((mm as any).cost_per_hour != null) {
              return sum + Number((mm as any).cost_per_hour) * Number(mm.hours);
            }
            const monthDate = addMonths(projStart, mm.month_number - 1);
            const fallbackCost = fallbackHourlyCost(member, monthDate.getFullYear(), monthDate.getMonth());
            return sum + fallbackCost * Number(mm.hours);
          }, 0);
        }, 0);

    const laborActual = timesheets.reduce((sum, t) => {
      if ((t as any).cost_per_hour != null) {
        return sum + Number((t as any).cost_per_hour) * Number(t.hours);
      }
      const member = memberMap.get(t.project_member_id);
      if (!member) return sum;
      const tsDate = parseISO(t.work_date);
      const fallbackCost = fallbackHourlyCost(member, tsDate.getFullYear(), tsDate.getMonth());
      return sum + fallbackCost * Number(t.hours);
    }, 0);

    // Custos extras (fornecedores, materiais, etc.) vêm da fonte unificada
    // `project_costs` — mesma origem usada pela aba Despesas.
    const extraPlanned = projectCosts.reduce(
      (sum, cost) => sum + Number(cost.planned_amount_brl || 0),
      0,
    );
    const extraActual = projectCosts.reduce(
      (sum, cost) => sum + Number(cost.actual_amount_brl || 0),
      0,
    );

    const totalPlanned = laborPlanned + extraPlanned;
    const totalActual = laborActual + extraActual;

    return { totalPlanned, totalActual, laborPlanned, laborActual, extraPlanned, extraActual };
  }, [
    project,
    memberMap,
    memberMonths,
    timesheets,
    projectCosts,
    projectDuration,
    holidays,
    plannedLaborFromAllocations.hasRoleAllocations,
    plannedLaborFromAllocations.total,
  ]);

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

  // Custos planejado/realizado por mês do projeto (mesma origem da aba Despesas).
  const monthlyChartData = useMemo(() => {
    const startDate = parseISO(project.start_date);

    const extraPlannedByMonth = new Map<number, number>();
    const extraActualByMonth = new Map<number, number>();
    projectCosts.forEach((cost) => {
      const isRecurring = Boolean((cost as any).is_recurring);
      if (isRecurring) {
        const startMonth = Number((cost as any).start_month || 1);
        const endMonth = Math.min(
          Number((cost as any).end_month || projectDuration),
          projectDuration,
        );
        const monthly = Number(
          (cost as any).monthly_amount_brl ||
            (cost as any).monthly_amount ||
            0,
        );
        for (let m = startMonth; m <= endMonth; m++) {
          if (m < 1 || m > projectDuration) continue;
          extraPlannedByMonth.set(m, (extraPlannedByMonth.get(m) || 0) + monthly);
        }
        if (cost.actual_amount_brl != null) {
          extraActualByMonth.set(
            startMonth,
            (extraActualByMonth.get(startMonth) || 0) + Number(cost.actual_amount_brl),
          );
        }
        return;
      }

      const stored = Number((cost as any).month_number || 0);
      const monthNumber =
        stored ||
        (cost.cost_date
          ? differenceInMonths(parseISO(cost.cost_date), startOfMonth(startDate)) + 1
          : 1);
      const clamped = Math.max(1, Math.min(monthNumber, projectDuration));
      extraPlannedByMonth.set(
        clamped,
        (extraPlannedByMonth.get(clamped) || 0) + Number(cost.planned_amount_brl || 0),
      );
      if (cost.actual_amount_brl != null) {
        extraActualByMonth.set(
          clamped,
          (extraActualByMonth.get(clamped) || 0) + Number(cost.actual_amount_brl || 0),
        );
      }
    });

    return Array.from({ length: projectDuration }, (_, i) => {
      const monthNum = i + 1;

      const laborPlanMonthDate = addMonths(startOfMonth(startDate), monthNum - 1);
      const laborPlan = plannedLaborFromAllocations.hasRoleAllocations
        ? plannedLaborFromAllocations.byMonth.get(monthNum) || 0
        : (project.members || []).reduce((acc, member) => {
            const fallbackCost = fallbackHourlyCost(member, laborPlanMonthDate.getFullYear(), laborPlanMonthDate.getMonth());
            const monthEntry = memberMonths.find((mm) => mm.project_member_id === member.id && mm.month_number === monthNum);
            const hourlyCost = (monthEntry as any)?.cost_per_hour != null
              ? Number((monthEntry as any).cost_per_hour)
              : fallbackCost;
            const hours = monthEntry ? monthEntry.hours : Number(member.hours_per_month || 0);
            return acc + hourlyCost * hours;
          }, 0);

      const monthStart = startOfMonth(addMonths(startDate, i));
      const monthEnd = startOfMonth(addMonths(startDate, i + 1));
      const laborReal = timesheets
        .filter((t) => {
          const d = parseISO(t.work_date);
          return d >= monthStart && d < monthEnd;
        })
        .reduce((sum, t) => {
          if ((t as any).cost_per_hour != null) {
            return sum + Number((t as any).cost_per_hour) * Number(t.hours);
          }
          const member = memberMap.get(t.project_member_id);
          const fallbackCost = member ? fallbackHourlyCost(member, monthStart.getFullYear(), monthStart.getMonth()) : 0;
          return sum + fallbackCost * Number(t.hours);
        }, 0);

      const extraPlan = extraPlannedByMonth.get(monthNum) || 0;
      const extraReal = extraActualByMonth.get(monthNum) || 0;

      return {
        name: getProjectMonthLabel(monthNum, project.start_date),
        planejado: laborPlan + extraPlan,
        realizado: laborReal + extraReal,
      };
    });
  }, [
    project,
    memberMap,
    memberMonths,
    timesheets,
    projectCosts,
    projectDuration,
    holidays,
    plannedLaborFromAllocations.byMonth,
    plannedLaborFromAllocations.hasRoleAllocations,
  ]);

  // Mês corrente do projeto (1-based), limitado à duração.
  const currentMonthIndex = useMemo(() => {
    const start = startOfMonth(parseISO(project.start_date));
    const elapsed = differenceInMonths(startOfMonth(new Date()), start) + 1;
    return Math.min(Math.max(elapsed, 1), projectDuration);
  }, [project.start_date, projectDuration]);

  // Receita por mês do projeto (planejada = todas as parcelas; realizada = recebidas).
  const revenueByMonth = useMemo(() => {
    const start = startOfMonth(parseISO(project.start_date));
    const actual = new Array(projectDuration).fill(0);
    const planned = new Array(projectDuration).fill(0);
    (project.installments || []).forEach((inst) => {
      const monthNum = Math.min(
        Math.max(differenceInMonths(startOfMonth(parseISO(inst.due_date)), start) + 1, 1),
        projectDuration,
      );
      planned[monthNum - 1] += Number(inst.value);
      if (inst.status === 'received') actual[monthNum - 1] += Number(inst.value);
    });
    return { actual, planned };
  }, [project.installments, project.start_date, projectDuration]);

  // Forecast (EAC): custo incorrido até hoje + plano restante (burn-rate).
  const forecast = useMemo(() => {
    const costActualToday = monthlyChartData
      .slice(0, currentMonthIndex)
      .reduce((a, d) => a + d.realizado, 0);
    const plannedRemaining = monthlyChartData
      .slice(currentMonthIndex)
      .reduce((a, d) => a + d.planejado, 0);
    const forecastCost = costActualToday + plannedRemaining;
    const forecastMargin = kpiData.revenuePlanned > 0
      ? ((kpiData.revenuePlanned - kpiData.commissionPlanned - forecastCost) / kpiData.revenuePlanned) * 100
      : 0;
    return { forecastCost, forecastMargin };
  }, [monthlyChartData, currentMonthIndex, kpiData.revenuePlanned, kpiData.commissionPlanned]);

  // Curva acumulada receita × custo (sólido até hoje, tracejado na projeção).
  const curveData = useMemo<ContractCurvePoint[]>(() => {
    const revActualToday = revenueByMonth.actual
      .slice(0, currentMonthIndex)
      .reduce((a, b) => a + b, 0);
    const costActualToday = monthlyChartData
      .slice(0, currentMonthIndex)
      .reduce((a, d) => a + d.realizado, 0);
    let revA = 0;
    let costA = 0;
    let revProj = revActualToday;
    let costProj = costActualToday;
    return monthlyChartData.map((d, i) => {
      const monthNum = i + 1;
      revA += revenueByMonth.actual[i] || 0;
      costA += d.realizado;
      if (monthNum > currentMonthIndex) {
        revProj += revenueByMonth.planned[i] || 0;
        costProj += d.planejado;
      }
      const isPast = monthNum <= currentMonthIndex;
      const atToday = monthNum === currentMonthIndex;
      return {
        name: d.name,
        revenue: isPast ? revA : null,
        cost: isPast ? costA : null,
        revenueProj: monthNum >= currentMonthIndex ? (atToday ? revActualToday : revProj) : null,
        costProj: monthNum >= currentMonthIndex ? (atToday ? costActualToday : costProj) : null,
      };
    });
  }, [monthlyChartData, revenueByMonth, currentMonthIndex]);

  const todayLabel = monthlyChartData[currentMonthIndex - 1]?.name ?? null;

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
    if (marginTarget > 0 && forecast.forecastMargin < marginTarget) {
      list.push(
        `Margem projetada (${forecast.forecastMargin.toFixed(0)}%) abaixo da meta (${marginTarget.toFixed(0)}%)`,
      );
    }
    return list;
  }, [project.installments, forecast.forecastMargin, marginTarget]);

  // Resumo de faturamento (rodapé da tabela de parcelas).
  const revenueGap = Math.max(0, kpiData.revenuePlanned - kpiData.revenueActual);
  const pendingCount = (project.installments || []).filter((i) => i.status !== 'received').length;
  const marginGapPp = forecast.forecastMargin - marginTarget;

  const insight = hideValues
    ? 'Projeção de fechamento com base no ritmo atual.'
    : `No ritmo atual, o projeto fecha com margem de ${forecast.forecastMargin.toFixed(0)}% — ${Math.abs(marginGapPp).toFixed(0)}pp ${marginGapPp >= 0 ? 'acima' : 'abaixo'} da meta. Gap de faturamento: ${formatCurrency(revenueGap)} a emitir (${pendingCount} ${pendingCount === 1 ? 'parcela' : 'parcelas'}).`;

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parcelas / Faturamento</CardTitle>
          <CardDescription>
            Gerencie a emissão de NF e registre os recebimentos do projeto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ProjectInstallmentsTable
            installments={project.installments || []}
            projectId={project.id}
            isManualInstallments={project.service_line === 'financiamento_inovacao'}
            canManageInstallments={canManageInstallments}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs">
            <span className="text-muted-foreground">
              Σ contrato{' '}
              <b className="font-mono tabular-nums text-foreground">
                {formatCurrency(kpiData.revenuePlanned)}
              </b>{' '}
              · recebido{' '}
              <b className="font-mono tabular-nums text-primary-deep">
                {formatCurrency(kpiData.revenueActual)}
              </b>
            </span>
            <span className="text-muted-foreground">
              a emitir:{' '}
              <b className="font-mono tabular-nums text-foreground">
                {formatCurrency(revenueGap)}
              </b>{' '}
              ({pendingCount} {pendingCount === 1 ? 'parcela' : 'parcelas'})
            </span>
          </div>
        </CardContent>
      </Card>

      <FinancialAlertBanner alerts={alerts} />
    </div>
  );
}
