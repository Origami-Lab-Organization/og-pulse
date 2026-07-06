import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectWithRelations } from '@/types/project';
import { getProjectMonthLabel } from '@/lib/formatters';
import { useMaskedCurrency, useMaskedPercent, useHideValues } from '@/contexts/HideValuesContext';
import { ProjectKPIBar } from './ProjectKPIBar';
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

  const fallbackHourlyCost = (member: NonNullable<typeof project.members>[number]) => {
    if (!member.employee) return Number((member as any).hourly_rate) || 0;
    const totalCost = member.employee.total_monthly_cost_estimated || 0;
    const workHours = member.employee.jornada_mensal || 168;
    return workHours > 0 ? totalCost / workHours : 0;
  };

  // Aggregate cost data (same logic as OverviewTab)
  const costData = useMemo(() => {
    const laborPlanned = (project.members || []).reduce((acc, member) => {
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
  }, [project, memberMonths, timesheets, supplierMonths, supplierActuals, projectDuration]);

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
      const laborPlan = (project.members || []).reduce((acc, member) => {
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
  }, [project, memberMonths, timesheets, supplierMonths, supplierActuals, projectDuration]);

  return (
    <div className="space-y-6">
      {/* Barra de KPIs financeiros */}
      <ProjectKPIBar
        revenuePlanned={kpiData.revenuePlanned}
        revenueActual={kpiData.revenueActual}
        revenueExecuted={kpiData.revenueExecuted}
        commissionPlanned={kpiData.commissionPlanned}
        commissionActual={kpiData.commissionActual}
        commissionExecuted={kpiData.commissionExecuted}
        costPlanned={kpiData.costPlanned}
        costActual={kpiData.costActual}
        costExecuted={kpiData.costExecuted}
        marginPlanned={kpiData.marginPlanned}
        marginActual={kpiData.marginActual}
        marginVar={kpiData.marginVar}
        marginTarget={marginTarget}
      />

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
