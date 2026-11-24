import { useMemo } from 'react';
import { DollarSign, Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProjectWithRelations, PAYMENT_METHOD_OPTIONS } from '@/types/project';
import { useMaskedCurrency, useMaskedPercent } from '@/contexts/HideValuesContext';
import { isNfEmissionDue } from '@/lib/installmentStatus';
import { ProjectKPIBar } from './ProjectKPIBar';
import { useFinancialSettings } from '@/hooks/useFinancialSettings';
import { useProjectCommissions } from '@/hooks/useProjectCommissions';
import { useProjectPlannedMargin } from '@/hooks/useProjectPlannedMargin';
import { ProjectPendingPanel } from './ProjectPendingPanel';
import { ProjectTeamThisMonth } from './ProjectTeamThisMonth';
import { alertsOf } from '@/lib/portfolioBoard';
import { buildProjectForecast } from '@/lib/projectForecast';
import { useHideValues } from '@/contexts/HideValuesContext';
import { format } from 'date-fns';

interface ProjectOverviewTabProps {
  project: ProjectWithRelations;
  /** Abre outra aba do projeto (o "Ver equipe" do bloco da equipe). */
  onNavigateToTab?: (tab: string) => void;
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

export function ProjectOverviewTab({ project, onNavigateToTab }: ProjectOverviewTabProps) {
  const formatCurrency = useMaskedCurrency();
  const formatPercent = useMaskedPercent();
  // Custo, comissão e margem PLANEJADOS e custo REALIZADO: regra única do custo do
  // projeto (US-0025) — o mesmo número da aba Custos, do Financeiro e do simulador.
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

  // Pendências: as mesmas do sino do portfólio, com o forecast da aba Financeiro (US-0037).
  const hideValues = useHideValues();
  const alerts = useMemo(() => {
    const forecast = buildProjectForecast({
      months: plannedMargin.costSummary.months,
      project,
      contract: metrics.contractValue,
      commissionPlanned: plannedMargin.commissionPlanned,
      today: new Date(),
    });
    const nfDue = (project.installments || [])
      .filter((installment) => isNfEmissionDue(installment, project.nf_emission_lead_days ?? 7, new Date()))
      .map((installment) => ({
        level: 'attention' as const,
        text: `Parcela ${installment.installment_number} aguardando emissão de NF (a janela já abriu)`,
      }));
    return [...alertsOf(project, format(new Date(), 'yyyy-MM-dd'), {
      projectId: project.id,
      contract: metrics.contractValue,
      forecastCost: forecast.forecastCost,
      forecastMargin: forecast.forecastMargin,
      hasCostPlanned: plannedMargin.costSummary.totalPlanned > 0,
      target: financialSettings?.gross_margin_target_percent ?? 0,
    }, hideValues), ...nfDue];
  }, [project, metrics.contractValue, plannedMargin.costSummary, plannedMargin.commissionPlanned, financialSettings, hideValues]);

  const getPaymentMethodLabel = (method: string) => {
    const found = PAYMENT_METHOD_OPTIONS.find((m) => m.value === method);
    return found?.label || method;
  };

  return (
    <div className="space-y-4">
      {/* Indicadores logo abaixo das abas: o que o GP olha primeiro. */}
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

      {/* Financeiro à esquerda, pendências à direita. Cliente, GP e período já estão no cabeçalho. */}
      <div className="grid gap-4 md:auto-rows-[minmax(13.5rem,auto)] md:grid-cols-2">
        <Card>
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-sm font-semibold">Informações Financeiras</CardTitle>
          </CardHeader>
          {/* Compacto para a Visão Geral caber sem rolagem no notebook de 14". */}
          <CardContent className="space-y-5 p-5 pt-0">
            <div>
              <p className="ol-label text-muted-foreground mb-1">Valor do Contrato</p>
              <p className="font-mono text-[1.75rem] font-semibold leading-none tabular-nums text-foreground">
                {formatCurrency(project.total_value)}
              </p>
            </div>
            {project.service_line === 'financiamento_inovacao' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="ol-label text-muted-foreground mb-0.5">Prazo de Pagamento</p>
                  <p className="text-sm font-medium text-foreground">{project.due_day} dias após NF</p>
                </div>
                {project.success_fee_percent != null && (
                  <div>
                    <p className="ol-label text-muted-foreground mb-0.5">Percentual de Sucesso</p>
                    <p className="text-sm font-medium text-foreground">{project.success_fee_percent}%</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="ol-label text-muted-foreground mb-0.5">Forma de Pagamento</p>
                  <p className="text-sm font-medium text-foreground">
                    {getPaymentMethodLabel(project.payment_method)}
                    <span className="font-normal text-muted-foreground">
                      {' '}· {project.installments_count} {project.installments_count === 1 ? 'parcela' : 'parcelas'}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="ol-label text-muted-foreground mb-0.5">Dia de Vencimento</p>
                  <p className="text-sm font-medium text-foreground">Dia {project.due_day}</p>
                </div>
              </div>
            )}
          </CardContent>
          {project.description && (
            <CardContent className="border-t p-5 pt-4">
              <p className="ol-label mb-0.5 text-muted-foreground">Descrição</p>
              <p className="text-sm text-foreground">{project.description}</p>
            </CardContent>
          )}
        </Card>
        <ProjectPendingPanel alerts={alerts} />
      </div>

      <ProjectTeamThisMonth project={project} onOpenTeam={onNavigateToTab ? () => onNavigateToTab('team') : undefined} />

    </div>
  );
}
