import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter,
  startOfYear, endOfYear,
} from 'date-fns';
import { Loader2, FileText, DollarSign, Target, Users, Building2, Package, Percent, Receipt } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AnalyticsFilters, Granularity } from '@/components/analytics/AnalyticsFilters';
import { AnalyticsKPIs } from '@/components/analytics/AnalyticsKPIs';
import { RevenueComparisonChart } from '@/components/analytics/RevenueComparisonChart';
import { FinancialEvolutionChart } from '@/components/analytics/FinancialEvolutionChart';
import { CostBreakdownChart } from '@/components/analytics/CostBreakdownChart';
import { AdminActivitiesChart } from '@/components/analytics/AdminActivitiesChart';
import { OverdueTable } from '@/components/analytics/OverdueTable';
import { DonutChart } from '@/components/analytics/DonutChart';
import { CostDonutChart } from '@/components/analytics/CostDonutChart';
import { AllocationChart } from '@/components/analytics/AllocationChart';
import { ProjectMarginTable } from '@/components/analytics/ProjectMarginTable';
import { TaxesOverview } from '@/components/analytics/TaxesOverview';
import { StakeholderKPIs } from '@/components/analytics/StakeholderKPIs';
import { StakeholderDistributionChart } from '@/components/analytics/StakeholderDistributionChart';
import { DetractorAlertTable } from '@/components/analytics/DetractorAlertTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAnalyticsFilterOptions } from '@/hooks/useAnalyticsData';
import { useFinancialEvolution } from '@/hooks/useFinancialEvolution';
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';
import { useStakeholderAnalytics } from '@/hooks/useStakeholderAnalytics';
import { useAdminActivitiesEvolution } from '@/hooks/useAdminActivitiesEvolution';
import { useYearlyEvolution } from '@/hooks/useYearlyEvolution';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatPercent } from '@/lib/formatters';

const FINANCIAL_TABS = ['overview', 'revenue', 'taxes', 'costs', 'margin', 'admin-costs'];

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
  const [activeTab, setActiveTab] = useState('overview');

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

  const isFinancialTab = FINANCIAL_TABS.includes(activeTab);

  const { data: financialEvolution, isLoading: isFinancialLoading } = useFinancialEvolution(filters, { enabled: isFinancialTab });
  const { data: revenueData, isLoading: isRevenueLoading } = useRevenueAnalytics(filters, { enabled: activeTab === 'revenue' });
  const { data: projectFinancials, isLoading: isProjectFinancialsLoading } = useProjectFinancials(filters, {
    enabled: activeTab === 'costs' || activeTab === 'margin',
  });
  const { data: stakeholderData, isLoading: isStakeholderLoading } = useStakeholderAnalytics(filters, { enabled: activeTab === 'satisfaction' });
  const { data: adminActivities, isLoading: isAdminLoading } = useAdminActivitiesEvolution(
    filters.startDate.getFullYear(),
    { enabled: activeTab === 'admin-costs' || activeTab === 'overview' },
  );
  const { data: yearlyEvolution, isLoading: isYearlyEvolutionLoading } = useYearlyEvolution(filters, { enabled: activeTab === 'costs' });
  const { data: filterOptions } = useAnalyticsFilterOptions();

  // Recompute isHighlighted from current filters (fixes stale cache on period change within same year)
  const financialMonths = useMemo(() => {
    if (!financialEvolution) return [];
    return financialEvolution.months.map(m => {
      const monthStart = startOfMonth(new Date(financialEvolution.year, m.monthIndex, 1));
      const monthEnd = endOfMonth(monthStart);
      return { ...m, isHighlighted: monthStart <= filters.endDate && monthEnd >= filters.startDate };
    });
  }, [financialEvolution, filters]);

  const financialKPIs = useMemo(() => {
    if (!financialMonths.length || !financialEvolution) return null;
    const highlighted = financialMonths.filter(m => m.isHighlighted);
    const faturado = highlighted.reduce((s, m) => s + m.faturado, 0);
    const revenueActual = highlighted.reduce((s, m) => s + m.revenueReal, 0);
    const revenueProjected = highlighted.reduce((s, m) => s + m.revenuePlanned, 0);
    const taxesValue = highlighted.reduce((s, m) => s + m.taxesValue, 0);
    const totalCosts = highlighted.reduce((s, m) => s + m.totalCosts, 0);
    const laborCost = highlighted.reduce((s, m) => s + m.laborCost, 0);
    const supplierCost = highlighted.reduce((s, m) => s + m.supplierCost, 0);
    const materialCost = highlighted.reduce((s, m) => s + m.materialCost, 0);
    const commissionCost = highlighted.reduce((s, m) => s + m.commissionCost, 0);
    const reimbursementCost = highlighted.reduce((s, m) => s + m.reimbursementCost, 0);
    const grossMargin = revenueActual > 0
      ? ((revenueActual - taxesValue - totalCosts) / revenueActual) * 100
      : 0;
    return {
      faturado, revenueActual, revenueProjected,
      revenueDiff: revenueActual - revenueProjected,
      taxesValue, taxesPercent: financialEvolution.taxesPercent,
      totalCosts, laborCost, supplierCost, materialCost, commissionCost, reimbursementCost,
      grossMargin, grossMarginTarget: financialEvolution.grossMarginTarget,
    };
  }, [financialMonths, financialEvolution]);

  const clientOptions = useMemo(
    () => (filterOptions?.clients || []).map(c => ({ id: c.id, label: c.company_name })),
    [filterOptions],
  );
  const managerOptions = useMemo(
    () => (filterOptions?.managers || []).map(m => ({ id: m.id, label: m.nome })),
    [filterOptions],
  );
  const projectOptions = useMemo(
    () => (filterOptions?.projects || []).map(p => ({ id: p.id, label: p.name })),
    [filterOptions],
  );

  const financialLoader = (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

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

        <Tabs defaultValue="overview" onValueChange={setActiveTab}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="revenue">Receita</TabsTrigger>
            <TabsTrigger value="taxes">Impostos</TabsTrigger>
            <TabsTrigger value="costs">Custos</TabsTrigger>
            <TabsTrigger value="margin">Margem Bruta</TabsTrigger>
            <TabsTrigger value="admin-costs">Despesas Adm</TabsTrigger>
            <TabsTrigger value="satisfaction">Satisfação</TabsTrigger>
          </TabsList>

          {/* ── Visão Geral ──────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {isFinancialLoading ? financialLoader : financialKPIs && financialEvolution ? (<>
              <AnalyticsKPIs
                faturado={financialKPIs.faturado}
                revenueActual={financialKPIs.revenueActual}
                revenueProjected={financialKPIs.revenueProjected}
                revenueDiff={financialKPIs.revenueDiff}
                totalCosts={financialKPIs.totalCosts}
                taxesPercent={financialKPIs.taxesPercent}
                taxesValue={financialKPIs.taxesValue}
                grossMargin={financialKPIs.grossMargin}
                grossMarginTarget={financialKPIs.grossMarginTarget}
              />
              <FinancialEvolutionChart data={financialMonths} year={financialEvolution.year} />
            </>) : null}
          </TabsContent>

          {/* ── Receita ──────────────────────────────────────────────────── */}
          <TabsContent value="revenue" className="space-y-6 mt-6">
            {(isFinancialLoading || isRevenueLoading) ? financialLoader : (financialKPIs && financialEvolution && revenueData) ? (<>
              <div className="grid gap-4 grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(financialKPIs.faturado)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">NFs emitidas no período</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Receita Recebida</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(financialKPIs.revenueActual)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Projetada: {formatCurrency(financialKPIs.revenueProjected)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <RevenueComparisonChart data={financialMonths} year={financialEvolution.year} />

              <div className="grid gap-4 grid-cols-2">
                <OverdueTable data={revenueData.overdueNFs} title="NFs Atrasadas para Emitir" emptyLabel="Nenhuma NF em atraso." />
                <OverdueTable data={revenueData.overdueReceipts} title="Receitas Atrasadas para Receber" emptyLabel="Nenhuma receita em atraso." />
              </div>

              <div className="grid gap-4 grid-cols-3">
                <DonutChart
                  data={revenueData.byClient.map(d => ({ label: d.label, value: d.received }))}
                  title="Receita por Cliente"
                />
                <DonutChart
                  data={revenueData.byManager.map(d => ({ label: d.label, value: d.received }))}
                  title="Receita por Gerente"
                />
                <DonutChart
                  data={revenueData.byServiceLine.map(d => ({ label: d.label, value: d.received }))}
                  title="Receita por Linha de Serviço"
                />
              </div>
            </>) : null}
          </TabsContent>

          {/* ── Impostos ─────────────────────────────────────────────────── */}
          <TabsContent value="taxes" className="space-y-6 mt-6">
            {isFinancialLoading ? financialLoader : financialKPIs && financialEvolution ? (<>
              <TaxesOverview
                taxesPercent={financialKPIs.taxesPercent}
                taxesValue={financialKPIs.taxesValue}
                faturado={financialKPIs.faturado}
              />
              <FinancialEvolutionChart data={financialMonths} year={financialEvolution.year} />
            </>) : null}
          </TabsContent>

          {/* ── Custos ───────────────────────────────────────────────────── */}
          <TabsContent value="costs" className="space-y-6 mt-6">
            {(isFinancialLoading || isProjectFinancialsLoading) ? financialLoader : (financialKPIs && financialEvolution && projectFinancials) ? (<>
              <div className="grid gap-4 grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total de Custos</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(financialKPIs.totalCosts)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">Custos realizados no período</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Mão de Obra</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(financialKPIs.laborCost)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">Custo de horas registradas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Fornecedores</CardTitle>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(financialKPIs.supplierCost)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">Custos de fornecedores externos</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Materiais</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(financialKPIs.materialCost)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">Materiais realizados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Comissões</CardTitle>
                    <Percent className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(financialKPIs.commissionCost)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">Comissões pagas no período</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Reembolsos</CardTitle>
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(financialKPIs.reimbursementCost)}</div>
                    <p className="mt-1 text-xs text-muted-foreground">Reembolsos aprovados/pagos</p>
                  </CardContent>
                </Card>
              </div>

              <CostBreakdownChart data={financialMonths} year={financialEvolution.year} />

              {!isYearlyEvolutionLoading && yearlyEvolution && (
                <AllocationChart
                  yearlyMonths={yearlyEvolution.months}
                  financialMonths={financialMonths}
                  year={yearlyEvolution.year}
                />
              )}

              <CostDonutChart
                byProject={projectFinancials.byProject.slice(0, 8).map(d => ({ label: d.projectName, value: d.costs }))}
                byClient={projectFinancials.byClient.map(d => ({ label: d.label, value: d.costs }))}
                byManager={projectFinancials.byManager.map(d => ({ label: d.label, value: d.costs }))}
                byServiceLine={projectFinancials.byServiceLine.map(d => ({ label: d.label, value: d.costs }))}
              />
            </>) : null}
          </TabsContent>

          {/* ── Margem Bruta ─────────────────────────────────────────────── */}
          <TabsContent value="margin" className="space-y-6 mt-6">
            {(isFinancialLoading || isProjectFinancialsLoading) ? financialLoader : (financialKPIs && financialEvolution && projectFinancials) ? (<>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Margem Bruta</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${
                    financialKPIs.grossMarginTarget
                      ? financialKPIs.grossMargin >= financialKPIs.grossMarginTarget
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : financialKPIs.grossMargin >= financialKPIs.grossMarginTarget * 0.5
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-600 dark:text-red-400'
                      : ''
                  }`}>
                    {formatPercent(financialKPIs.grossMargin)}
                  </div>
                  {financialKPIs.grossMarginTarget !== null && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Meta: {formatPercent(financialKPIs.grossMarginTarget)}
                    </p>
                  )}
                </CardContent>
              </Card>

              <FinancialEvolutionChart data={financialMonths} year={financialEvolution.year} />

              <ProjectMarginTable
                data={projectFinancials.byProject.map(p => ({
                  id: p.projectId, label: p.projectName,
                  revenue: p.revenue, costs: p.costs, taxes: p.taxes, grossMargin: p.grossMargin,
                }))}
                title="Margem por Projeto"
                grossMarginTarget={projectFinancials.grossMarginTarget ?? undefined}
              />

              <div className="grid gap-4 grid-cols-3">
                <ProjectMarginTable
                  data={projectFinancials.byClient}
                  title="Margem por Cliente"
                  grossMarginTarget={projectFinancials.grossMarginTarget ?? undefined}
                />
                <ProjectMarginTable
                  data={projectFinancials.byManager}
                  title="Margem por Gerente"
                  grossMarginTarget={projectFinancials.grossMarginTarget ?? undefined}
                />
                <ProjectMarginTable
                  data={projectFinancials.byServiceLine}
                  title="Margem por Linha de Serviço"
                  grossMarginTarget={projectFinancials.grossMarginTarget ?? undefined}
                />
              </div>
            </>) : null}
          </TabsContent>

          {/* ── Despesas Adm ─────────────────────────────────────────────── */}
          <TabsContent value="admin-costs" className="space-y-6 mt-6">
            {isAdminLoading ? financialLoader : adminActivities ? (<>
              <AdminActivitiesChart data={adminActivities} />

              {adminActivities.activityTypes.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Horas e Custos por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted-foreground border-b">
                          <th className="pb-2 pr-4 font-medium">Categoria</th>
                          <th className="pb-2 pr-4 font-medium text-right">Custo Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminActivities.activityTypes.map((type, idx) => {
                          const totalCost = adminActivities.months.reduce(
                            (s, m) => s + ((m[type.id] as number) || 0),
                            0,
                          );
                          if (totalCost === 0) return null;
                          return (
                            <tr key={type.id} className="border-b last:border-0">
                              <td className="py-2 pr-4 font-medium">{type.name}</td>
                              <td className="py-2 text-right">{formatCurrency(totalCost)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </>) : null}
          </TabsContent>

          {/* ── Satisfação ───────────────────────────────────────────────── */}
          <TabsContent value="satisfaction" className="space-y-6 mt-6">
            {isStakeholderLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : stakeholderData ? (<>
              <StakeholderKPIs
                total={stakeholderData.totals.total}
                promoters={stakeholderData.totals.promoters}
                neutrals={stakeholderData.totals.neutrals}
                detractors={stakeholderData.totals.detractors}
              />
              <StakeholderDistributionChart data={stakeholderData.byProject} />
              <DetractorAlertTable data={stakeholderData.highInfluenceDetractors} />
            </>) : null}
          </TabsContent>

        </Tabs>
      </div>
    </AppLayout>
  );
}
