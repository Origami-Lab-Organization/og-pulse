import { useMemo } from 'react';
import { DollarSign, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectWithRelations, PAYMENT_METHOD_OPTIONS } from '@/types/project';
import { useMaskedCurrency, useMaskedPercent } from '@/contexts/HideValuesContext';
import { ProjectTeamSection } from './ProjectTeamSection';
import { InstallmentAlertsBanner } from './financial/InstallmentAlertsBanner';
import { ProjectKPIBar } from './ProjectKPIBar';
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectSupplierMonths } from '@/hooks/useProjectSupplierMonths';
import { useProjectTimesheets } from '@/hooks/useProjectTimesheets';
import { useProjectSupplierActuals } from '@/hooks/useProjectSupplierActuals';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useBudget } from '@/hooks/useBudgets';
import { useProjectCommissions } from '@/hooks/useProjectCommissions';
import { useProjectPlannedLaborCost } from '@/hooks/useProjectPlannedLaborCost';
import { useHolidays } from '@/hooks/useHolidays';
import { getFallbackHourlyCost } from '@/lib/employeeCost';
import { formatPercent } from '@/lib/formatters';
import { format, parseISO, startOfMonth, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectOverviewTabProps {
  project: ProjectWithRelations;
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const formatCurrency = useMaskedCurrency();
  const formatPercent = useMaskedPercent();
  const memberIds = useMemo(
    () => (project.members || []).map((m) => m.id),
    [project.members]
  );
  const supplierIds = useMemo(
    () => (project.suppliers || []).map((s) => s.id),
    [project.suppliers]
  );
  const memberMap = useMemo(
    () => new Map((project.members || []).map((m) => [m.id, m])),
    [project.members],
  );

  const { data: memberMonths = [] } = useProjectMemberMonths(memberIds);
  // Por project_id, não pela equipe atual — ver ProjectFinancialTab.tsx.
  const { data: timesheets = [] } = useProjectTimesheets(project.id);
  const { data: supplierMonths = [] } = useProjectSupplierMonths(supplierIds);
  const { data: supplierActuals = [] } = useProjectSupplierActuals(supplierIds);
  const { data: holidays = [] } = useHolidays();
  const plannedLaborFromAllocations = useProjectPlannedLaborCost(
    project,
    project.duration_months,
  );

  const metrics = useMemo(() => {
    const contractValue = Number(project.total_value || 0);
    const receivedValue = (project.installments || [])
      .filter((i) => i.status === 'received')
      .reduce((sum, i) => sum + Number(i.value), 0);
    return { contractValue, receivedValue };
  }, [project]);

  const costData = useMemo(() => {
    const fallbackHourlyCost = (member: NonNullable<typeof project.members>[number], year: number, monthIndex: number) => {
      if (!member.employee) return Number((member as any).hourly_rate) || 0;
      return getFallbackHourlyCost(member.employee.total_monthly_cost_estimated || 0, member.employee.jornada_diaria || 8, year, monthIndex, holidays);
    };

    const projStart = startOfMonth(parseISO(project.start_date));
    const laborPlanned = plannedLaborFromAllocations.hasRoleAllocations
      ? plannedLaborFromAllocations.total
      : (project.members || []).reduce((acc, member) => {
          const memberEntries = memberMonths.filter((mm) => mm.project_member_id === member.id);
          if (memberEntries.length === 0) {
            const fallbackCost = fallbackHourlyCost(member, projStart.getFullYear(), projStart.getMonth());
            return acc + fallbackCost * Number(member.hours_per_month || 0) * project.duration_months;
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

    const supplierPlanned = supplierMonths.reduce((s, sm) => s + sm.value, 0) ||
      (project.suppliers || []).reduce((acc, sup) => {
        const months = sup.end_month ? sup.end_month - sup.start_month + 1 : project.duration_months;
        return acc + Number(sup.monthly_value || 0) * months;
      }, 0);

    const supplierActualTotal = supplierActuals.reduce((s, sa) => s + sa.value, 0);

    const materialPlanned = (project.materials || []).reduce((s, m) => s + Number(m.value || 0), 0);
    const materialActual = (project.materials || [])
      .filter((m) => m.is_realized)
      .reduce((s, m) => s + Number(m.value || 0), 0);

    const totalPlanned = laborPlanned + supplierPlanned + materialPlanned;
    const totalActual = laborActual + supplierActualTotal + materialActual;

    return { totalPlanned, totalActual };
  }, [
    project,
    memberMap,
    memberMonths,
    timesheets,
    supplierMonths,
    supplierActuals,
    holidays,
    plannedLaborFromAllocations.hasRoleAllocations,
    plannedLaborFromAllocations.total,
  ]);

  const { data: financialSettings } = useFinancialSettings();
  const { data: budget } = useBudget(project.budget_id);
  const { data: commissions = [] } = useProjectCommissions(project.id);

  const kpiData = useMemo(() => {
    const revenuePlanned = metrics.contractValue;
    const revenueActual = metrics.receivedValue;
    const revenueExecuted = revenuePlanned > 0 ? (revenueActual / revenuePlanned) * 100 : 0;

    const commissionPlanned = budget
      ? (budget.commission_percent / 100) * budget.total_with_fees
      : 0;
    const commissionActual = commissions.filter((c) => c.is_paid).reduce((s, c) => s + Number(c.planned_value), 0);
    const commissionExecuted = commissionPlanned > 0 ? (commissionActual / commissionPlanned) * 100 : 0;

    const costPlanned = costData.totalPlanned;
    const costActual = costData.totalActual;
    const costExecuted = costPlanned > 0 ? (costActual / costPlanned) * 100 : 0;

    const marginPlanned = revenuePlanned > 0 ? ((revenuePlanned - commissionPlanned - costPlanned) / revenuePlanned) * 100 : 0;
    const marginActual = revenueActual > 0 ? ((revenueActual - commissionActual - costActual) / revenueActual) * 100 : 0;
    const marginVar = marginActual - marginPlanned;

    return {
      revenuePlanned, revenueActual, revenueExecuted,
      commissionPlanned, commissionActual, commissionExecuted,
      costPlanned, costActual, costExecuted,
      marginPlanned, marginActual, marginVar,
    };
  }, [metrics, costData, financialSettings, budget, commissions, project.installments]);

  const getPaymentMethodLabel = (method: string) => {
    const found = PAYMENT_METHOD_OPTIONS.find((m) => m.value === method);
    return found?.label || method;
  };

  return (
    <div className="space-y-4">
      <InstallmentAlertsBanner project={project} />
      {/* Informações do projeto e financeiras */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Informações do Projeto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="ol-label text-muted-foreground mb-0.5">Cliente</p>
              <p className="text-sm font-medium text-foreground">
                {project.client?.trading_name || project.client?.company_name || 'Não definido'}
              </p>
            </div>
            <div>
              <p className="ol-label text-muted-foreground mb-0.5">Gerente</p>
              <p className="text-sm font-medium text-foreground">
                {project.manager?.nome || 'Não definido'}
              </p>
            </div>
            <div>
              <p className="ol-label text-muted-foreground mb-0.5">Período</p>
              <p className="text-sm font-medium text-foreground">
                {format(new Date(project.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                {project.end_date && (
                  <> a {format(new Date(project.end_date), 'dd/MM/yyyy', { locale: ptBR })}</>
                )}
                {project.is_continuous && (
                  <Badge variant="outline" className="ml-2">Contínuo</Badge>
                )}
              </p>
            </div>
            {project.description && (
              <div>
                <p className="ol-label text-muted-foreground mb-0.5">Descrição</p>
                <p className="text-sm text-foreground">{project.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Informações Financeiras</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="ol-label text-muted-foreground mb-1">Valor do Contrato</p>
              <p className="font-mono text-[1.75rem] font-semibold leading-none tabular-nums text-foreground">
                {formatCurrency(project.total_value)}
              </p>
            </div>
            {project.service_line === 'financiamento_inovacao' ? (
              <>
                <div>
                  <p className="ol-label text-muted-foreground mb-0.5">Prazo de Pagamento</p>
                  <p className="text-sm font-medium text-foreground">
                    Pagamento em {project.due_day} dias após NF
                  </p>
                </div>
                {(project as any).success_fee_percent != null && (
                  <div>
                    <p className="ol-label text-muted-foreground mb-0.5">Percentual de Sucesso</p>
                    <p className="text-sm font-medium text-foreground">
                      {(project as any).success_fee_percent}%
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <p className="ol-label text-muted-foreground mb-0.5">Forma de Pagamento</p>
                  <p className="text-sm font-medium text-foreground">
                    {getPaymentMethodLabel(project.payment_method)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {project.installments_count} parcela(s)
                  </p>
                </div>
                <div>
                  <p className="ol-label text-muted-foreground mb-0.5">Dia de Vencimento</p>
                  <p className="text-sm font-medium text-foreground">Dia {project.due_day}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: KPI Bar (padrão unificado) */}
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
        marginTarget={financialSettings?.gross_margin_target_percent ?? undefined}
      />

      {/* Row 3: Team */}
      <ProjectTeamSection members={project.members || []} projectId={project.id} memberMonths={memberMonths} timesheets={timesheets} />
    </div>
  );
}
