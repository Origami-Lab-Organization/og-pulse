import { useMemo } from 'react';
import { DollarSign, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProjectWithRelations, PAYMENT_METHOD_OPTIONS } from '@/types/project';
import { useMaskedCurrency, useMaskedPercent } from '@/contexts/HideValuesContext';
import { InstallmentAlertsBanner } from './financial/InstallmentAlertsBanner';
import { ProjectKPIBar } from './ProjectKPIBar';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useProjectCommissions } from '@/hooks/useProjectCommissions';
import { useProjectPlannedMargin } from '@/hooks/useProjectPlannedMargin';
import { formatDate } from '@/lib/formatters';
import { clientLabel, projectKindOf } from '@/lib/projectKind';

interface ProjectOverviewTabProps {
  project: ProjectWithRelations;
}

const executedPercent = (actual: number, planned: number) => (planned > 0 ? (actual / planned) * 100 : 0);

const marginPercent = (revenue: number, commission: number, cost: number) =>
  revenue > 0 ? ((revenue - commission - cost) / revenue) * 100 : 0;

function computeOverviewKpis(input: {
  revenuePlanned: number;
  revenueActual: number;
  commissionPlanned: number;
  commissionActual: number;
  costPlanned: number;
  costActual: number;
}) {
  const { revenuePlanned, revenueActual, commissionPlanned, commissionActual, costPlanned, costActual } = input;
  const marginPlanned = marginPercent(revenuePlanned, commissionPlanned, costPlanned);
  const marginActual = marginPercent(revenueActual, commissionActual, costActual);
  return {
    ...input,
    revenueExecuted: executedPercent(revenueActual, revenuePlanned),
    commissionExecuted: executedPercent(commissionActual, commissionPlanned),
    costExecuted: executedPercent(costActual, costPlanned),
    marginPlanned,
    marginActual,
    marginVar: marginActual - marginPlanned,
  };
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const formatCurrency = useMaskedCurrency();
  const formatPercent = useMaskedPercent();
  // Custo, comissão e margem PLANEJADOS e custo REALIZADO: regra única do custo do
  // projeto (US-0025) — o mesmo número da aba Despesas, do Financeiro e do simulador.
  const plannedMargin = useProjectPlannedMargin(project);

  const metrics = useMemo(() => {
    const contractValue = Number(project.total_value || 0);
    const receivedValue = (project.installments || [])
      .filter((i) => i.status === 'received')
      .reduce((sum, i) => sum + Number(i.value), 0);
    return { contractValue, receivedValue };
  }, [project]);

  const costData = useMemo(
    () => ({
      totalPlanned: plannedMargin.costPlanned,
      totalActual: plannedMargin.costSummary.totalActual,
    }),
    [plannedMargin.costPlanned, plannedMargin.costSummary.totalActual],
  );

  // A meta e os percentuais que julgam ESTE projeto são os que valiam quando ele começou
  // (PUL-260). Mudar a política em setembro não muda o que um projeto de janeiro assinou.
  const { data: financialSettings } = useFinancialSettings(project.start_date);
  const { data: commissions = [] } = useProjectCommissions(project.id);

  const kpiData = useMemo(
    () =>
      computeOverviewKpis({
        revenuePlanned: metrics.contractValue,
        revenueActual: metrics.receivedValue,
        commissionPlanned: plannedMargin.commissionPlanned,
        commissionActual: commissions.filter((c) => c.is_paid).reduce((s, c) => s + Number(c.planned_value), 0),
        costPlanned: costData.totalPlanned,
        costActual: costData.totalActual,
      }),
    [metrics, costData, plannedMargin.commissionPlanned, commissions],
  );

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
                {clientLabel(project.client?.trading_name || project.client?.company_name, projectKindOf(project))}
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
                {formatDate(project.start_date)}
                {project.end_date && (
                  <> a {formatDate(project.end_date)}</>
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
    </div>
  );
}
