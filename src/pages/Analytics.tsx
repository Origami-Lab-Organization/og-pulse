import { useState, useMemo } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
} from 'date-fns'
import {
  Loader2,
  FileText,
  DollarSign,
  Target,
  Users,
  Building2,
  Package,
  Percent,
  Receipt,
} from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  AnalyticsFilters,
  Granularity,
} from '@/components/analytics/AnalyticsFilters'
import { AnalyticsKPIs } from '@/components/analytics/AnalyticsKPIs'
import { RevenueComparisonChart } from '@/components/analytics/RevenueComparisonChart'
import { FinancialEvolutionChart } from '@/components/analytics/FinancialEvolutionChart'
import { OverviewKPIs } from '@/components/analytics/OverviewKPIs'
import { OverviewEvolutionChart } from '@/components/analytics/OverviewEvolutionChart'
import { ExecutiveSummaryCard } from '@/components/analytics/ExecutiveSummaryCard'
import { ProjectContributionChart } from '@/components/analytics/ProjectContributionChart'
import { ConsolidatedMixChart } from '@/components/analytics/ConsolidatedMixChart'
import { OverviewAlertsCard } from '@/components/analytics/OverviewAlertsCard'
import { OverviewExecutiveInsights } from '@/components/analytics/OverviewExecutiveInsights'
import { OverviewPerformanceTable } from '@/components/analytics/OverviewPerformanceTable'
import { CostBreakdownChart } from '@/components/analytics/CostBreakdownChart'
import { RevenueInstallmentsTable } from '@/components/analytics/RevenueInstallmentsTable'
import { DonutChart } from '@/components/analytics/DonutChart'
import { RevenueKPIs } from '@/components/analytics/RevenueKPIs'
import { RevenueConversionInsightCard } from '@/components/analytics/RevenueConversionInsightCard'
import { RevenueRankingChart } from '@/components/analytics/RevenueRankingChart'
import { RevenueMixDonut } from '@/components/analytics/RevenueMixDonut'
import { ReceivablesStatusCard } from '@/components/analytics/ReceivablesStatusCard'
import { RevenueExecutiveInsights } from '@/components/analytics/RevenueExecutiveInsights'
import { CostKPIs } from '@/components/analytics/CostKPIs'
import { BudgetAdherenceInsightCard } from '@/components/analytics/BudgetAdherenceInsightCard'
import { CostRankingChart } from '@/components/analytics/CostRankingChart'
import { CostMixDonut } from '@/components/analytics/CostMixDonut'
import { CostPressureCard } from '@/components/analytics/CostPressureCard'
import { CostExecutiveInsights } from '@/components/analytics/CostExecutiveInsights'
import { CostDetailTable } from '@/components/analytics/CostDetailTable'
import { CostDonutChart } from '@/components/analytics/CostDonutChart'
import { AllocationChart } from '@/components/analytics/AllocationChart'
import { ProjectMarginTable } from '@/components/analytics/ProjectMarginTable'
import { GrossMarginKPIs } from '@/components/analytics/GrossMarginKPIs'
import { GrossMarginInsightCard } from '@/components/analytics/GrossMarginInsightCard'
import { MarginRankingChart } from '@/components/analytics/MarginRankingChart'
import { RevenueCompositionDonut } from '@/components/analytics/RevenueCompositionDonut'
import { MarginDetailTable } from '@/components/analytics/MarginDetailTable'
import { StakeholderKPIs } from '@/components/analytics/StakeholderKPIs'
import { StakeholderDistributionChart } from '@/components/analytics/StakeholderDistributionChart'
import { DetractorAlertTable } from '@/components/analytics/DetractorAlertTable'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAnalyticsFilterOptions } from '@/hooks/useAnalyticsData'
import { useFinancialEvolution } from '@/hooks/useFinancialEvolution'
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics'
import { useProjectFinancials } from '@/hooks/useProjectFinancials'
import { useStakeholderAnalytics } from '@/hooks/useStakeholderAnalytics'
import { useYearlyEvolution } from '@/hooks/useYearlyEvolution'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatPercent } from '@/lib/formatters'
import { cn } from '@/lib/utils'

const FINANCIAL_TABS = [
  'overview',
  'revenue',
  'costs',
  'margin',
]

export default function Analytics() {
  const { employee } = useAuth()
  const isAdmin = employee?.isAdmin ?? false

  const [granularity, setGranularity] = useState<Granularity>('year')
  const [currentPeriodDate, setCurrentPeriodDate] = useState(() =>
    startOfYear(new Date()),
  )
  const [customStart, setCustomStart] = useState<Date | undefined>()
  const [customEnd, setCustomEnd] = useState<Date | undefined>()
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>()
  const [selectedManagerId, setSelectedManagerId] = useState<string | undefined>()
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState('overview')
  const [donutDimension, setDonutDimension] = useState<'client' | 'manager' | 'serviceLine'>('client')

  const filters = useMemo(() => {
    let startDate: Date
    let endDate: Date
    switch (granularity) {
      case 'quarter':
        startDate = startOfQuarter(currentPeriodDate)
        endDate = endOfQuarter(currentPeriodDate)
        break
      case 'year':
        startDate = startOfYear(currentPeriodDate)
        endDate = endOfYear(currentPeriodDate)
        break
      case 'custom':
        startDate = customStart || startOfMonth(new Date())
        endDate = customEnd || endOfMonth(new Date())
        break
      default:
        startDate = startOfMonth(currentPeriodDate)
        endDate = endOfMonth(currentPeriodDate)
    }
    return {
      startDate,
      endDate,
      clientId: selectedClientId,
      managerId: selectedManagerId,
      projectId: selectedProjectId,
    }
  }, [
    granularity,
    currentPeriodDate,
    customStart,
    customEnd,
    selectedClientId,
    selectedManagerId,
    selectedProjectId,
  ])

  const isFinancialTab = FINANCIAL_TABS.includes(activeTab)

  const { data: financialEvolution, isLoading: isFinancialLoading } =
    useFinancialEvolution(filters, { enabled: isFinancialTab })
  const { data: revenueData, isLoading: isRevenueLoading } =
    useRevenueAnalytics(filters, { enabled: activeTab === 'revenue' })
  const { data: projectFinancials, isLoading: isProjectFinancialsLoading } =
    useProjectFinancials(filters, {
      enabled: activeTab === 'costs' || activeTab === 'margin' || activeTab === 'overview',
    })
  const { data: stakeholderData, isLoading: isStakeholderLoading } =
    useStakeholderAnalytics(filters, { enabled: activeTab === 'satisfaction' })
const { data: yearlyEvolution, isLoading: isYearlyEvolutionLoading } =
    useYearlyEvolution(filters, { enabled: activeTab === 'costs' })
  const { data: filterOptions } = useAnalyticsFilterOptions()

  const financialMonths = useMemo(() => {
    if (!financialEvolution) return []
    return financialEvolution.months.map((m) => {
      const monthStart = startOfMonth(
        new Date(financialEvolution.year, m.monthIndex, 1),
      )
      const monthEnd = endOfMonth(monthStart)
      return {
        ...m,
        isHighlighted:
          monthStart <= filters.endDate && monthEnd >= filters.startDate,
      }
    })
  }, [financialEvolution, filters])

  const financialKPIs = useMemo(() => {
    if (!financialMonths.length || !financialEvolution) return null
    const highlighted = financialMonths.filter((m) => m.isHighlighted)
    const faturado = highlighted.reduce((s, m) => s + m.faturado, 0)
    const revenueActual = highlighted.reduce((s, m) => s + m.revenueReal, 0)
    const revenueProjected = highlighted.reduce((s, m) => s + m.revenuePlanned, 0)
    const totalCosts = highlighted.reduce((s, m) => s + m.totalCosts, 0)
    const laborCost = highlighted.reduce((s, m) => s + m.laborCost, 0)
    const supplierCost = highlighted.reduce((s, m) => s + m.supplierCost, 0)
    const materialCost = highlighted.reduce((s, m) => s + m.materialCost, 0)
    const commissionCost = highlighted.reduce((s, m) => s + m.commissionCost, 0)
    const reimbursementCost = highlighted.reduce((s, m) => s + m.reimbursementCost, 0)
    const grossMargin =
      revenueActual > 0
        ? ((revenueActual - totalCosts) / revenueActual) * 100
        : 0

    return {
      faturado,
      revenueActual,
      revenueProjected,
      revenueDiff: revenueActual - revenueProjected,
      totalCosts,
      laborCost,
      supplierCost,
      materialCost,
      commissionCost,
      reimbursementCost,
      grossMargin,
      grossMarginTarget: financialEvolution.grossMarginTarget,
    }
  }, [financialMonths, financialEvolution])

  const clientOptions = useMemo(
    () => (filterOptions?.clients || []).map((c) => ({ id: c.id, label: c.company_name })),
    [filterOptions],
  )
  const managerOptions = useMemo(
    () => (filterOptions?.managers || []).map((m) => ({ id: m.id, label: m.nome })),
    [filterOptions],
  )
  const projectOptions = useMemo(
    () => (filterOptions?.projects || []).map((p) => ({ id: p.id, label: p.name })),
    [filterOptions],
  )

  const financialLoader = (
    <div className='flex items-center justify-center h-40'>
      <Loader2 className='h-6 w-6 animate-spin text-primary' />
    </div>
  )

  return (
    <AppLayout
      title='Analytics de Projetos'
      description='Performance, saúde e impacto dos projetos'
      breadcrumbs={[{ label: 'Analytics de Projetos' }]}
    >
      <div className='space-y-6'>
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

        <Tabs defaultValue='overview' onValueChange={setActiveTab}>
          <TabsList className='flex-wrap h-auto gap-1'>
            <TabsTrigger value='overview'>Visão Geral</TabsTrigger>
            <TabsTrigger value='revenue'>Receita</TabsTrigger>
            <TabsTrigger value='costs'>Custos</TabsTrigger>
            <TabsTrigger value='margin'>Margem Bruta</TabsTrigger>
            <TabsTrigger value='satisfaction'>Satisfação</TabsTrigger>
          </TabsList>

          {/* ── Visão Geral ──────────────────────────────────────────────── */}
          <TabsContent value='overview' className='space-y-6 mt-6'>
            {isFinancialLoading ? (
              financialLoader
            ) : financialKPIs && financialEvolution ? (
              <>
                <AnalyticsKPIs
                  faturado={financialKPIs.faturado}
                  revenueActual={financialKPIs.revenueActual}
                  revenueProjected={financialKPIs.revenueProjected}
                  revenueDiff={financialKPIs.revenueDiff}
                  totalCosts={financialKPIs.totalCosts}
                  grossMargin={financialKPIs.grossMargin}
                  grossMarginTarget={financialKPIs.grossMarginTarget}
                />
                <FinancialEvolutionChart
                  data={financialMonths}
                  year={financialEvolution.year}
                />
              </>
            ) : null}
          </TabsContent>

          {/* ── Receita ──────────────────────────────────────────────────── */}
          <TabsContent value='revenue' className='space-y-6 mt-6'>
            {isFinancialLoading || isRevenueLoading ? (
              financialLoader
            ) : financialKPIs && financialEvolution && revenueData ? (
              (() => {
                const nfCount = revenueData.periodNFs.length;
                const overdueAmount = revenueData.overdueReceipts.reduce((s, o) => s + o.value, 0);
                const pendingOnTime = revenueData.periodReceivables.reduce((s, r) => s + r.value, 0);
                const monthlyRevenues = financialMonths
                  .filter((m) => m.isPast)
                  .map((m) => ({ label: m.label, revenue: m.revenueReal }));

                return (
                  <>
                    {/* KPIs */}
                    <RevenueKPIs
                      faturado={financialKPIs.faturado}
                      revenueActual={financialKPIs.revenueActual}
                      revenueProjected={financialKPIs.revenueProjected}
                      nfCount={nfCount}
                    />

                    {/* Chart + Conversion Insight */}
                    <div className='grid gap-4 grid-cols-1 lg:grid-cols-4'>
                      <div className='lg:col-span-3'>
                        <RevenueComparisonChart
                          data={financialMonths}
                          year={financialEvolution.year}
                        />
                      </div>
                      <div className='lg:col-span-1'>
                        <RevenueConversionInsightCard
                          revenueActual={financialKPIs.revenueActual}
                          faturado={financialKPIs.faturado}
                          revenueProjected={financialKPIs.revenueProjected}
                          nfCount={nfCount}
                          overdueAmount={overdueAmount}
                          monthlyRevenues={monthlyRevenues}
                        />
                      </div>
                    </div>

                    {/* Ranking + Mix */}
                    <div className='grid gap-4 grid-cols-1 lg:grid-cols-2'>
                      <RevenueRankingChart
                        byClient={revenueData.byClient}
                        byManager={revenueData.byManager}
                        byServiceLine={revenueData.byServiceLine}
                      />
                      <RevenueMixDonut
                        byClient={revenueData.byClient}
                        byManager={revenueData.byManager}
                        byServiceLine={revenueData.byServiceLine}
                      />
                    </div>

                    {/* Status + Executive Insights */}
                    <div className='grid gap-4 grid-cols-1 lg:grid-cols-2'>
                      <ReceivablesStatusCard
                        received={financialKPIs.revenueActual}
                        pendingOnTime={pendingOnTime}
                        overdue={overdueAmount}
                      />
                      <RevenueExecutiveInsights
                        revenueActual={financialKPIs.revenueActual}
                        faturado={financialKPIs.faturado}
                        overdueAmount={overdueAmount}
                        byClient={revenueData.byClient}
                      />
                    </div>

                    {/* Pipeline table */}
                    <RevenueInstallmentsTable
                      periodNFs={revenueData.periodNFs}
                      periodReceivables={revenueData.periodReceivables}
                      overdueNFs={revenueData.overdueNFs}
                      overdueReceipts={revenueData.overdueReceipts}
                    />
                  </>
                );
              })()
            ) : null}
          </TabsContent>

          {/* ── Custos ───────────────────────────────────────────────────── */}
          <TabsContent value='costs' className='space-y-6 mt-6'>
            {isFinancialLoading || isProjectFinancialsLoading ? (
              financialLoader
            ) : financialKPIs && financialEvolution && projectFinancials ? (
              (() => {
                const plannedCosts = financialMonths
                  .filter(m => m.isHighlighted)
                  .reduce((s, m) => s + m.plannedTotalCosts, 0);
                const monthlyCosts = financialMonths
                  .filter(m => m.isPast)
                  .map(m => ({ label: m.label, cost: m.totalCosts }));

                return (
                  <>
                    {/* KPIs */}
                    <CostKPIs
                      totalCosts={financialKPIs.totalCosts}
                      plannedCosts={plannedCosts}
                      laborCost={financialKPIs.laborCost}
                      supplierCost={financialKPIs.supplierCost}
                      materialCost={financialKPIs.materialCost}
                      commissionCost={financialKPIs.commissionCost}
                      reimbursementCost={financialKPIs.reimbursementCost}
                    />

                    {/* Chart + Adherence Insight */}
                    <div className='grid gap-4 grid-cols-1 lg:grid-cols-4'>
                      <div className='lg:col-span-3'>
                        <CostBreakdownChart
                          data={financialMonths}
                          year={financialEvolution.year}
                        />
                      </div>
                      <div className='lg:col-span-1'>
                        <BudgetAdherenceInsightCard
                          totalCosts={financialKPIs.totalCosts}
                          plannedCosts={plannedCosts}
                          laborCost={financialKPIs.laborCost}
                          supplierCost={financialKPIs.supplierCost}
                          monthlyCosts={monthlyCosts}
                        />
                      </div>
                    </div>

                    {/* Ranking + Mix */}
                    <div className='grid gap-4 grid-cols-1 lg:grid-cols-2'>
                      <CostRankingChart
                        byProject={projectFinancials.byProject}
                        byClient={projectFinancials.byClient}
                        byManager={projectFinancials.byManager}
                        byServiceLine={projectFinancials.byServiceLine}
                      />
                      <CostMixDonut
                        laborCost={financialKPIs.laborCost}
                        supplierCost={financialKPIs.supplierCost}
                        materialCost={financialKPIs.materialCost}
                        commissionCost={financialKPIs.commissionCost}
                        reimbursementCost={financialKPIs.reimbursementCost}
                      />
                    </div>

                    {/* Pressure + Executive Insights */}
                    <div className='grid gap-4 grid-cols-1 lg:grid-cols-2'>
                      <CostPressureCard
                        laborCost={financialKPIs.laborCost}
                        supplierCost={financialKPIs.supplierCost}
                        materialCost={financialKPIs.materialCost}
                        commissionCost={financialKPIs.commissionCost}
                        reimbursementCost={financialKPIs.reimbursementCost}
                      />
                      <CostExecutiveInsights
                        totalCosts={financialKPIs.totalCosts}
                        plannedCosts={plannedCosts}
                        laborCost={financialKPIs.laborCost}
                        monthlyCosts={monthlyCosts}
                      />
                    </div>

                    {/* Detail table */}
                    <CostDetailTable
                      byProject={projectFinancials.byProject}
                      byClient={projectFinancials.byClient}
                      byManager={projectFinancials.byManager}
                      byServiceLine={projectFinancials.byServiceLine}
                      plannedCosts={plannedCosts}
                    />
                  </>
                );
              })()
            ) : null}
          </TabsContent>

          {/* ── Margem Bruta ─────────────────────────────────────────────── */}
          <TabsContent value='margin' className='space-y-6 mt-6'>
            {isFinancialLoading || isProjectFinancialsLoading ? (
              financialLoader
            ) : financialKPIs && financialEvolution && projectFinancials ? (
              (() => {
                const projectRows = projectFinancials.byProject.map((p) => ({
                  id: p.projectId,
                  label: p.projectName,
                  revenue: p.revenue,
                  costs: p.costs,
                  grossMargin: p.grossMargin,
                }));
                const projectsAboveTarget = projectRows.filter(
                  (p) => p.grossMargin !== null && p.grossMargin >= (projectFinancials.grossMarginTarget ?? 30),
                ).length;
                const monthlyMargins = financialMonths
                  .filter((m) => m.isPast)
                  .map((m) => ({ label: m.label, margin: m.grossMarginPct ?? 0 }));

                return (
                  <>
                    {/* KPIs */}
                    <GrossMarginKPIs
                      grossMargin={financialKPIs.grossMargin}
                      grossMarginTarget={financialKPIs.grossMarginTarget}
                      revenueActual={financialKPIs.revenueActual}
                      totalCosts={financialKPIs.totalCosts}
                      projectsAboveTarget={projectsAboveTarget}
                      totalProjects={projectRows.length}
                    />

                    {/* Chart + Insight Card */}
                    <div className='grid gap-4 grid-cols-1 lg:grid-cols-4'>
                      <div className='lg:col-span-3'>
                        <FinancialEvolutionChart
                          data={financialMonths}
                          year={financialEvolution.year}
                          title='Evolução Financeira + Margem'
                          hideFaturado
                        />
                      </div>
                      <div className='lg:col-span-1'>
                        <GrossMarginInsightCard
                          grossMargin={financialKPIs.grossMargin}
                          grossMarginTarget={financialKPIs.grossMarginTarget}
                          monthlyMargins={monthlyMargins}
                        />
                      </div>
                    </div>

                    {/* Ranking + Donut */}
                    <div className='grid gap-4 grid-cols-1 lg:grid-cols-2'>
                      <MarginRankingChart
                        byProject={projectRows}
                        byClient={projectFinancials.byClient}
                        byManager={projectFinancials.byManager}
                        byServiceLine={projectFinancials.byServiceLine}
                        grossMarginTarget={projectFinancials.grossMarginTarget}
                      />
                      <RevenueCompositionDonut
                        byClient={projectFinancials.byClient}
                        byManager={projectFinancials.byManager}
                        byServiceLine={projectFinancials.byServiceLine}
                      />
                    </div>

                    {/* Detail table */}
                    <MarginDetailTable
                      byProject={projectRows}
                      byClient={projectFinancials.byClient}
                      byManager={projectFinancials.byManager}
                      byServiceLine={projectFinancials.byServiceLine}
                      grossMarginTarget={projectFinancials.grossMarginTarget}
                    />
                  </>
                );
              })()
            ) : null}
          </TabsContent>

          {/* ── Satisfação ───────────────────────────────────────────────── */}
          <TabsContent value='satisfaction' className='space-y-6 mt-6'>
            {isStakeholderLoading ? (
              <div className='flex items-center justify-center h-40'>
                <Loader2 className='h-6 w-6 animate-spin text-primary' />
              </div>
            ) : stakeholderData ? (
              <>
                <StakeholderKPIs
                  total={stakeholderData.totals.total}
                  promoters={stakeholderData.totals.promoters}
                  neutrals={stakeholderData.totals.neutrals}
                  detractors={stakeholderData.totals.detractors}
                />
                <StakeholderDistributionChart
                  data={stakeholderData.byProject}
                />
                <DetractorAlertTable
                  data={stakeholderData.highInfluenceDetractors}
                />
              </>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}