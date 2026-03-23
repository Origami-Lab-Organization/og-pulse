import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter,
  startOfYear, endOfYear,
} from 'date-fns';
import { Loader2, Clock, BanknoteIcon, DollarSign, Percent, Users, AlertTriangle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AnalyticsFilters, Granularity } from '@/components/analytics/AnalyticsFilters';
import { AnalyticsKPIs } from '@/components/analytics/AnalyticsKPIs';
import { EmployeeUtilizationTable } from '@/components/analytics/EmployeeUtilizationTable';
import { CostCompositionChart } from '@/components/analytics/CostCompositionChart';
import { CostByProjectTable } from '@/components/analytics/CostByProjectTable';
import { ProjectHealthTable } from '@/components/analytics/ProjectHealthTable';
import { StakeholderKPIs } from '@/components/analytics/StakeholderKPIs';
import { StakeholderDistributionChart } from '@/components/analytics/StakeholderDistributionChart';
import { DetractorAlertTable } from '@/components/analytics/DetractorAlertTable';
import { OkrKPIs } from '@/components/analytics/OkrKPIs';
import { OkrByProjectTable } from '@/components/analytics/OkrByProjectTable';
import { ConfidenceDistributionChart } from '@/components/analytics/ConfidenceDistributionChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAnalyticsData, useAnalyticsFilterOptions } from '@/hooks/useAnalyticsData';
import { useProjectHealthData } from '@/hooks/useProjectHealthData';
import { useStakeholderAnalytics } from '@/hooks/useStakeholderAnalytics';
import { useOkrAnalytics } from '@/hooks/useOkrAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatPercent } from '@/lib/formatters';

export default function Analytics() {
  const { employee } = useAuth();
  const isAdmin = employee?.isAdmin ?? false;

  const [granularity, setGranularity] = useState<Granularity>('month');
  const [currentPeriodDate, setCurrentPeriodDate] = useState(() => startOfMonth(new Date()));
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const [selectedManagerId, setSelectedManagerId] = useState<string | undefined>();
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();

  const filters = useMemo(() => {
    let startDate: Date;
    let endDate: Date;
    switch (granularity) {
      case 'quarter':
        startDate = startOfQuarter(currentPeriodDate);
        endDate = endOfQuarter(currentPeriodDate);
        break;
      case 'year':
        startDate = startOfYear(currentPeriodDate);
        endDate = endOfYear(currentPeriodDate);
        break;
      case 'custom':
        startDate = customStart || startOfMonth(new Date());
        endDate = customEnd || endOfMonth(new Date());
        break;
      default:
        startDate = startOfMonth(currentPeriodDate);
        endDate = endOfMonth(currentPeriodDate);
    }
    return { startDate, endDate, clientId: selectedClientId, managerId: selectedManagerId, projectId: selectedProjectId };
  }, [granularity, currentPeriodDate, customStart, customEnd, selectedClientId, selectedManagerId, selectedProjectId]);

  const { data: analyticsData, isLoading }                      = useAnalyticsData(filters);
  const { data: healthRows = [], isLoading: isHealthLoading }   = useProjectHealthData(filters);
  const { data: stakeholderData, isLoading: isStakeholderLoading } = useStakeholderAnalytics(filters);
  const { data: okrData, isLoading: isOkrLoading }              = useOkrAnalytics(filters);
  const { data: filterOptions }                                 = useAnalyticsFilterOptions();

  const clientOptions = useMemo(
    () => (filterOptions?.clients || []).map(c => ({ id: c.id, label: c.company_name })),
    [filterOptions]
  );
  const managerOptions = useMemo(
    () => (filterOptions?.managers || []).map(m => ({ id: m.id, label: m.nome })),
    [filterOptions]
  );
  const projectOptions = useMemo(
    () => (filterOptions?.projects || []).map(p => ({ id: p.id, label: p.name })),
    [filterOptions]
  );

  const avgUtilization = useMemo(() => {
    if (!analyticsData?.employeeUtilization.length) return 0;
    return analyticsData.employeeUtilization.reduce((s, e) => s + e.utilization, 0)
      / analyticsData.employeeUtilization.length;
  }, [analyticsData]);

  const criticalCount = useMemo(
    () => healthRows.filter(r => r.health.overall.status === 'red').length,
    [healthRows]
  );

  const anyLoading = isLoading || isHealthLoading || isStakeholderLoading || isOkrLoading;

  return (
    <AppLayout
      title="Analytics de Projetos"
      description="Performance, saúde e impacto dos projetos"
      breadcrumbs={[{ label: 'Analytics de Projetos' }]}
    >
      <div className="space-y-6">
        <AnalyticsFilters
          granularity={granularity}
          onGranularityChange={setGranularity}
          currentPeriodDate={currentPeriodDate}
          onPeriodDateChange={setCurrentPeriodDate}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
          clients={clientOptions}
          managers={managerOptions}
          projects={projectOptions}
          selectedClientId={selectedClientId}
          onClientChange={setSelectedClientId}
          selectedManagerId={selectedManagerId}
          onManagerChange={setSelectedManagerId}
          selectedProjectId={selectedProjectId}
          onProjectChange={setSelectedProjectId}
          showManagerFilter={isAdmin}
        />

        {anyLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : analyticsData ? (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="financial">Financeiro</TabsTrigger>
              <TabsTrigger value="utilization">Utilização &amp; Custos</TabsTrigger>
              <TabsTrigger value="satisfaction">Satisfação</TabsTrigger>
              <TabsTrigger value="okrs">OKRs &amp; Impacto</TabsTrigger>
            </TabsList>

            {/* ── Visão Geral ──────────────────────────────────────────────── */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid gap-4 grid-cols-5">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Projetos Críticos
                    </CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {criticalCount}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      de {healthRows.length} projeto(s) analisado(s)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Receita Recebida
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(analyticsData.revenueActual)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">no período</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Margem Bruta
                    </CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercent(analyticsData.grossMargin)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {analyticsData.grossMarginTarget != null
                        ? `meta: ${formatPercent(analyticsData.grossMarginTarget)}`
                        : 'sem meta definida'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Utilização Média
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercent(avgUtilization)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {analyticsData.employeeUtilization.length} funcionário(s)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Custo Ociosidade
                    </CardTitle>
                    <BanknoteIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(analyticsData.idleCost)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">horas não alocadas</p>
                  </CardContent>
                </Card>
              </div>

              <ProjectHealthTable data={healthRows} />
            </TabsContent>

            {/* ── Financeiro ───────────────────────────────────────────────── */}
            <TabsContent value="financial" className="space-y-6 mt-6">
              <AnalyticsKPIs
                revenueActual={analyticsData.revenueActual}
                revenueProjected={analyticsData.revenueProjected}
                revenueDiff={analyticsData.revenueDiff}
                totalCosts={analyticsData.totalCosts}
                taxesPercent={analyticsData.taxesPercent}
                taxesValue={analyticsData.taxesValue}
                commissionValue={analyticsData.commissionValue}
                grossMargin={analyticsData.grossMargin}
                grossMarginTarget={analyticsData.grossMarginTarget}
              />
            </TabsContent>

            {/* ── Utilização & Custos ──────────────────────────────────────── */}
            <TabsContent value="utilization" className="space-y-6 mt-6">
              <div className="grid gap-4 grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Horas Ociosas
                    </CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analyticsData.idleHours.toFixed(1)}h</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {analyticsData.totalCapacity > 0
                        ? `${formatPercent((analyticsData.idleHours / analyticsData.totalCapacity) * 100)} da capacidade total`
                        : 'Sem capacidade no período'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Custo da Ociosidade
                    </CardTitle>
                    <BanknoteIcon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(analyticsData.idleCost)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Custo estimado das horas não alocadas
                    </p>
                  </CardContent>
                </Card>
              </div>

              <EmployeeUtilizationTable data={analyticsData.employeeUtilization} />

              <div className="grid gap-4 grid-cols-2">
                <CostCompositionChart
                  laborCost={analyticsData.laborCost}
                  supplierCost={analyticsData.supplierCost}
                  materialCost={analyticsData.materialCost}
                />
                <CostByProjectTable data={analyticsData.costsByProject} />
              </div>
            </TabsContent>

            {/* ── Satisfação ───────────────────────────────────────────────── */}
            <TabsContent value="satisfaction" className="space-y-6 mt-6">
              {stakeholderData ? (
                <>
                  <StakeholderKPIs
                    total={stakeholderData.totals.total}
                    promoters={stakeholderData.totals.promoters}
                    neutrals={stakeholderData.totals.neutrals}
                    detractors={stakeholderData.totals.detractors}
                  />
                  <StakeholderDistributionChart data={stakeholderData.byProject} />
                  <DetractorAlertTable data={stakeholderData.highInfluenceDetractors} />
                </>
              ) : (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </TabsContent>

            {/* ── OKRs & Impacto ───────────────────────────────────────────── */}
            <TabsContent value="okrs" className="space-y-6 mt-6">
              {okrData ? (
                <>
                  <OkrKPIs
                    activeOkrs={okrData.totals.activeOkrs}
                    avgProgress={okrData.totals.avgProgress}
                    onTrack={okrData.totals.onTrack}
                    atRisk={okrData.totals.atRisk}
                    completed={okrData.totals.completed}
                  />
                  <OkrByProjectTable data={okrData.byProject} />
                  <ConfidenceDistributionChart data={okrData.byProject} />
                </>
              ) : (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </div>
    </AppLayout>
  );
}
