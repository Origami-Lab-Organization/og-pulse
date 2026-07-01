import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Target, DollarSign, Receipt, Wallet, Percent } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectWithRelations } from '@/types/project';
import { getProjectMonthLabel } from '@/lib/formatters';
import { useMaskedCurrency, useMaskedPercent, useHideValues } from '@/contexts/HideValuesContext';
import { ProjectFinancialChart } from './ProjectFinancialChart';
import { ProjectTrendChart } from './ProjectTrendChart';
import { ProjectInstallmentsTable } from '@/components/projects/ProjectInstallmentsTable';
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectSupplierMonths } from '@/hooks/useProjectSupplierMonths';
import { useTimesheetsByMembers } from '@/hooks/useProjectTimesheets';
import { useProjectSupplierActuals } from '@/hooks/useProjectSupplierActuals';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { parseISO, differenceInMonths, startOfMonth, addMonths } from 'date-fns';
import { useBudget } from '@/hooks/useBudgets';
import { useProjectCommissions } from '@/hooks/useProjectCommissions';
import { useProjectPlannedLaborCost } from '@/hooks/useProjectPlannedLaborCost';

interface ProjectFinancialTabProps {
  project: ProjectWithRelations;
  isReadOnly?: boolean;
  canManageInstallments?: boolean;
}

export function ProjectFinancialTab({ project, isReadOnly = false, canManageInstallments = false }: ProjectFinancialTabProps) {
  const formatCurrency = useMaskedCurrency();
  const formatPercent = useMaskedPercent();
  const hideValues = useHideValues();
  const memberIds = useMemo(
    () => (project.members || []).map((m) => m.id),
    [project.members]
  );
  const supplierIds = useMemo(
    () => (project.suppliers || []).map((s) => s.id),
    [project.suppliers]
  );

  const { data: memberMonths = [] } = useProjectMemberMonths(memberIds);
  const { data: timesheets = [] } = useTimesheetsByMembers(memberIds);
  const { data: supplierMonths = [] } = useProjectSupplierMonths(supplierIds);
  const { data: supplierActuals = [] } = useProjectSupplierActuals(supplierIds);
  const { data: financialSettings } = useFinancialSettings();
  const { data: budget } = useBudget(project.budget_id);
  const { data: commissions = [] } = useProjectCommissions(project.id);
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

  const fallbackHourlyCost = (member: NonNullable<typeof project.members>[number]) => {
    if (!member.employee) return Number((member as any).hourly_rate) || 0;
    const totalCost = member.employee.total_monthly_cost_estimated || 0;
    const workHours = member.employee.jornada_mensal || 168;
    return workHours > 0 ? totalCost / workHours : 0;
  };

  // Aggregate cost data (same logic as OverviewTab)
  const costData = useMemo(() => {
    const laborPlanned = plannedLaborFromAllocations.hasRoleAllocations
      ? plannedLaborFromAllocations.total
      : (project.members || []).reduce((acc, member) => {
          const fallbackCost = fallbackHourlyCost(member);
          const memberEntries = memberMonths.filter((mm) => mm.project_member_id === member.id);
          if (memberEntries.length === 0) {
            return acc + fallbackCost * Number(member.hours_per_month || 0) * projectDuration;
          }

          return acc + memberEntries.reduce((sum, mm) => {
            const hourlyCost = (mm as any).cost_per_hour != null ? Number((mm as any).cost_per_hour) : fallbackCost;
            return sum + hourlyCost * Number(mm.hours);
          }, 0);
        }, 0);

    const laborActual = (project.members || []).reduce((acc, member) => {
      const fallbackCost = fallbackHourlyCost(member);
      const memberActualCost = timesheets
        .filter((t) => t.project_member_id === member.id)
        .reduce((sum, t) => {
          const hourlyCost = (t as any).cost_per_hour != null ? Number((t as any).cost_per_hour) : fallbackCost;
          return sum + hourlyCost * Number(t.hours);
        }, 0);
      return acc + memberActualCost;
    }, 0);

    const supplierPlanned = supplierMonths.reduce((s, sm) => s + sm.value, 0) ||
      (project.suppliers || []).reduce((acc, sup) => {
        const months = sup.end_month ? sup.end_month - sup.start_month + 1 : projectDuration;
        return acc + Number(sup.monthly_value || 0) * months;
      }, 0);

    const supplierActualTotal = supplierActuals.reduce((s, sa) => s + sa.value, 0);

    const materialPlanned = (project.materials || []).reduce((s, m) => s + Number(m.value || 0), 0);
    const materialActual = (project.materials || [])
      .filter((m) => m.is_realized)
      .reduce((s, m) => s + Number(m.value || 0), 0);

    const totalPlanned = laborPlanned + supplierPlanned + materialPlanned;
    const totalActual = laborActual + supplierActualTotal + materialActual;

    return { totalPlanned, totalActual, laborPlanned, laborActual, supplierPlanned, supplierActualTotal, materialPlanned, materialActual };
  }, [
    project,
    memberMonths,
    timesheets,
    supplierMonths,
    supplierActuals,
    projectDuration,
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
    const commissionExecuted = commissionPlanned > 0 ? (commissionActual / commissionPlanned) * 100 : 0;

    const marginPlanned = revenuePlanned > 0 ? ((revenuePlanned - commissionPlanned - costPlanned) / revenuePlanned) * 100 : 0;
    const marginActual = revenueActual > 0 ? ((revenueActual - commissionActual - costActual) / revenueActual) * 100 : 0;
    const marginVar = marginActual - marginPlanned;

    return {
      revenuePlanned, revenueActual, revenueExecuted,
      commissionPlanned, commissionActual, commissionExecuted,
      costPlanned, costActual, costExecuted,
      marginPlanned, marginActual, marginVar,
    };
  }, [project, costData, financialSettings, budget, commissions]);

  // Monthly chart data
  const monthlyChartData = useMemo(() => {
    const startDate = parseISO(project.start_date);

    return Array.from({ length: projectDuration }, (_, i) => {
      const monthNum = i + 1;

      // Planned labor for this month
      const laborPlan = plannedLaborFromAllocations.hasRoleAllocations
        ? plannedLaborFromAllocations.byMonth.get(monthNum) || 0
        : (project.members || []).reduce((acc, member) => {
            const fallbackCost = fallbackHourlyCost(member);
            const monthEntry = memberMonths.find((mm) => mm.project_member_id === member.id && mm.month_number === monthNum);
            const hourlyCost = (monthEntry as any)?.cost_per_hour != null
              ? Number((monthEntry as any).cost_per_hour)
              : fallbackCost;
            const hours = monthEntry ? monthEntry.hours : Number(member.hours_per_month || 0);
            return acc + hourlyCost * hours;
          }, 0);

      // Actual labor for this month (map timesheet dates to project month)
      const monthStart = startOfMonth(addMonths(startDate, i));
      const monthEnd = startOfMonth(addMonths(startDate, i + 1));
      const laborReal = (project.members || []).reduce((acc, member) => {
        const fallbackCost = fallbackHourlyCost(member);
        const memberActualCost = timesheets
          .filter((t) => {
            const d = parseISO(t.work_date);
            return t.project_member_id === member.id && d >= monthStart && d < monthEnd;
          })
          .reduce((sum, t) => {
            const hourlyCost = (t as any).cost_per_hour != null ? Number((t as any).cost_per_hour) : fallbackCost;
            return sum + hourlyCost * Number(t.hours);
          }, 0);
        return acc + memberActualCost;
      }, 0);

      // Planned suppliers for this month
      const supplierPlan = supplierMonths
        .filter((sm) => sm.month_number === monthNum)
        .reduce((s, sm) => s + sm.value, 0) ||
        (project.suppliers || []).reduce((acc, sup) => {
          if (monthNum >= sup.start_month && (!sup.end_month || monthNum <= sup.end_month)) {
            return acc + Number(sup.monthly_value || 0);
          }
          return acc;
        }, 0);

      // Actual suppliers for this month
      const supplierReal = supplierActuals
        .filter((sa) => sa.month_number === monthNum)
        .reduce((s, sa) => s + sa.value, 0);

      // Materials for this month
      const materialPlan = (project.materials || [])
        .filter((m) => (m.month_number || 1) === monthNum)
        .reduce((s, m) => s + Number(m.value || 0), 0);
      const materialReal = (project.materials || [])
        .filter((m) => m.is_realized && (m.month_number || 1) === monthNum)
        .reduce((s, m) => s + Number(m.value || 0), 0);

      return {
        name: getProjectMonthLabel(monthNum, project.start_date),
        planejado: laborPlan + supplierPlan + materialPlan,
        realizado: laborReal + supplierReal + materialReal,
      };
    });
  }, [
    project,
    memberMonths,
    timesheets,
    supplierMonths,
    supplierActuals,
    projectDuration,
    plannedLaborFromAllocations.byMonth,
    plannedLaborFromAllocations.hasRoleAllocations,
  ]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Receita */}
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">Receita</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <p className="text-xl font-bold">{formatCurrency(kpiData.revenueActual)}</p>
                <span className="text-xs text-muted-foreground">Realizado</span>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-muted-foreground">{formatCurrency(kpiData.revenuePlanned)}</p>
                <span className="text-xs text-muted-foreground">Planejado</span>
              </div>
              <div className="pt-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  {hideValues ? '•••' : `${kpiData.revenueExecuted.toFixed(1)}%`}
                </span>
                <span className="text-xs text-muted-foreground ml-1">executado</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comissão 
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Percent className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">Comissão</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <p className="text-xl font-bold">{formatCurrency(kpiData.commissionActual)}</p>
                <span className="text-xs text-muted-foreground">Realizado</span>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-muted-foreground">{formatCurrency(kpiData.commissionPlanned)}</p>
                <span className="text-xs text-muted-foreground">Planejado</span>
              </div>
              <div className="pt-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  {hideValues ? '•••' : `${kpiData.commissionExecuted.toFixed(1)}%`}
                </span>
                <span className="text-xs text-muted-foreground ml-1">executado</span>
              </div>
            </div>
          </CardContent>
        </Card>
        */}

        {/* Custos */}
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Target className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">Custos</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <p className="text-xl font-bold">{formatCurrency(kpiData.costActual)}</p>
                <span className="text-xs text-muted-foreground">Realizado</span>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-muted-foreground">{formatCurrency(kpiData.costPlanned)}</p>
                <span className="text-xs text-muted-foreground">Planejado</span>
              </div>
              <div className="pt-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  {hideValues ? '•••' : `${kpiData.costExecuted.toFixed(1)}%`}
                </span>
                <span className="text-xs text-muted-foreground ml-1">executado</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Margem */}
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-2 mb-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                kpiData.marginActual >= marginTarget ? 'bg-green-100 dark:bg-green-900/30' :
                kpiData.marginActual < marginTarget * 0.5 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-muted'
              }`}>
                {kpiData.marginActual >= marginTarget ? (
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : kpiData.marginActual < marginTarget * 0.5 ? (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <p className="text-sm font-semibold text-muted-foreground">Margem</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <p className={`text-xl font-bold ${
                  kpiData.marginActual >= marginTarget ? 'text-green-600 dark:text-green-400' :
                  kpiData.marginActual < marginTarget * 0.5 ? 'text-red-600 dark:text-red-400' : ''
                }`}>
                  {formatPercent(kpiData.marginActual)}
                </p>
                <span className="text-xs text-muted-foreground">Realizado</span>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-muted-foreground">{formatPercent(kpiData.marginPlanned)}</p>
                <span className="text-xs text-muted-foreground">Planejado</span>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-muted-foreground">{formatPercent(marginTarget)}</p>
                <span className="text-xs text-muted-foreground">Meta</span>
              </div>
              <div className="pt-1">
                <span className={`text-xs font-semibold ${kpiData.marginVar >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {hideValues
                    ? '••• pp'
                    : `${kpiData.marginVar >= 0 ? '+' : ''}${kpiData.marginVar.toFixed(1)}pp`}
                </span>
                <span className="text-xs text-muted-foreground ml-1">variação</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Installments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Parcelas / Faturamento</CardTitle>
          <CardDescription>
            Gerencie a emissão de NF e registre os recebimentos do projeto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectInstallmentsTable
            installments={project.installments || []}
            projectId={project.id}
            isManualInstallments={project.service_line === 'financiamento_inovacao'}
            canManageInstallments={canManageInstallments}
          />
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ProjectFinancialChart data={monthlyChartData} />
        <ProjectTrendChart data={monthlyChartData} budgetLine={Number(project.total_value || 0)} />
      </div>
    </div>
  );
}
