import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectWithRelations, PAYMENT_METHOD_OPTIONS } from '@/types/project';
import { useMaskedCurrency } from '@/contexts/HideValuesContext';
import { ProjectTeamSection } from './ProjectTeamSection';
import { ProjectKPIBar } from './ProjectKPIBar';
import { useProjectMemberMonths } from '@/hooks/useProjectMemberMonths';
import { useProjectSupplierMonths } from '@/hooks/useProjectSupplierMonths';
import { useTimesheetsByMembers } from '@/hooks/useProjectTimesheets';
import { useProjectSupplierActuals } from '@/hooks/useProjectSupplierActuals';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useBudget } from '@/hooks/useBudgets';
import { useProjectCommissions } from '@/hooks/useProjectCommissions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectOverviewTabProps {
  project: ProjectWithRelations;
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const formatCurrency = useMaskedCurrency();
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

  const metrics = useMemo(() => {
    const contractValue = Number(project.total_value || 0);
    const receivedValue = (project.installments || [])
      .filter((i) => i.status === 'received')
      .reduce((sum, i) => sum + Number(i.value), 0);
    return { contractValue, receivedValue };
  }, [project]);

  const costData = useMemo(() => {
    const fallbackHourlyCost = (member: NonNullable<typeof project.members>[number]) => {
      if (!member.employee) return Number((member as any).hourly_rate) || 0;
      const totalCost = member.employee.total_monthly_cost_estimated || 0;
      const workHours = member.employee.jornada_mensal || 168;
      return workHours > 0 ? totalCost / workHours : 0;
    };

    const laborPlanned = (project.members || []).reduce((acc, member) => {
      const fallbackCost = fallbackHourlyCost(member);
      const memberEntries = memberMonths.filter((mm) => mm.project_member_id === member.id);
      if (memberEntries.length === 0) {
        return acc + fallbackCost * Number(member.hours_per_month || 0) * project.duration_months;
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
  }, [project, memberMonths, timesheets, supplierMonths, supplierActuals]);

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

      {/* Barra de KPIs financeiros */}
      <ProjectKPIBar {...kpiData} />

      {/* Equipe */}
      <ProjectTeamSection
        members={project.members || []}
        projectId={project.id}
        memberMonths={memberMonths}
        timesheets={timesheets}
      />
    </div>
  );
}
