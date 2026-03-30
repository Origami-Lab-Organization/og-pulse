import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter,
  startOfYear, endOfYear,
} from 'date-fns';
import { Loader2, Wallet, Truck, Package } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { AnalyticsFilters, Granularity } from '@/components/analytics/AnalyticsFilters';
import { AnalyticsKPIs } from '@/components/analytics/AnalyticsKPIs';
import { YearlyRevenueChart } from '@/components/analytics/YearlyRevenueChart';
import { YearlyCostsChart } from '@/components/analytics/YearlyCostsChart';
import { AllocationKPIs } from '@/components/analytics/AllocationKPIs';
import { AllocationByEmployeeTable } from '@/components/analytics/AllocationByEmployeeTable';
import { AllocationComparisonChart } from '@/components/analytics/AllocationComparisonChart';
import { AllocationMonthlyChart } from '@/components/analytics/AllocationMonthlyChart';
import { StakeholderKPIs } from '@/components/analytics/StakeholderKPIs';
import { StakeholderDistributionChart } from '@/components/analytics/StakeholderDistributionChart';
import { DetractorAlertTable } from '@/components/analytics/DetractorAlertTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAnalyticsData, useAnalyticsFilterOptions } from '@/hooks/useAnalyticsData';
import { useYearlyEvolution } from '@/hooks/useYearlyEvolution';
import { useAllocationAnalytics } from '@/hooks/useAllocationAnalytics';
import { useStakeholderAnalytics } from '@/hooks/useStakeholderAnalytics';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';

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
  const [activeTab, setActiveTab] = useState('financial');

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

  const { data: analyticsData, isLoading } = useAnalyticsData(filters);
  const { data: yearlyData } = useYearlyEvolution(filters, {
    enabled: activeTab === 'financial' || activeTab === 'allocation',
  });
  const { data: allocationData, isLoading: isAllocationLoading } = useAllocationAnalytics(filters, {
    enabled: activeTab === 'allocation',
  });
  const { data: stakeholderData, isLoading: isStakeholderLoading } = useStakeholderAnalytics(filters, {
    enabled: activeTab === 'satisfaction',
  });
  const { data: filterOptions } = useAnalyticsFilterOptions();

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

  return (
    <AppLayout
      title="Analytics de Projetos"
      description="Performance financeira e alocação de equipe"
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

        <Tabs defaultValue="financial" onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="allocation">Alocação de Equipe</TabsTrigger>
            <TabsTrigger value="satisfaction">Satisfação</TabsTrigger>
          </TabsList>

          {/* ── Financeiro ───────────────────────────────────────────────── */}
          <TabsContent value="financial" className="space-y-6 mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : analyticsData ? (
              <>
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

                {/* Cost breakdown by type */}
                <div className="grid gap-4 grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Mão de Obra
                      </CardTitle>
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(analyticsData.laborCost)}</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {analyticsData.totalCosts > 0
                          ? `${((analyticsData.laborCost / analyticsData.totalCosts) * 100).toFixed(0)}% dos custos`
                          : 'no período'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Fornecedores
                      </CardTitle>
                      <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(analyticsData.supplierCost)}</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {analyticsData.totalCosts > 0
                          ? `${((analyticsData.supplierCost / analyticsData.totalCosts) * 100).toFixed(0)}% dos custos`
                          : 'no período'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Materiais
                      </CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(analyticsData.materialCost)}</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {analyticsData.totalCosts > 0
                          ? `${((analyticsData.materialCost / analyticsData.totalCosts) * 100).toFixed(0)}% dos custos`
                          : 'no período'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Yearly evolution charts */}
                {yearlyData && (
                  <div className="grid gap-4 grid-cols-2">
                    <YearlyRevenueChart data={yearlyData.months} year={yearlyData.year} />
                    <YearlyCostsChart data={yearlyData.months} year={yearlyData.year} />
                  </div>
                )}
              </>
            ) : null}
          </TabsContent>

          {/* ── Alocação de Equipe ────────────────────────────────────────── */}
          <TabsContent value="allocation" className="space-y-6 mt-6">
            {isAllocationLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : allocationData ? (
              <>
                <AllocationKPIs summary={allocationData.summary} />

                {yearlyData && (
                  <AllocationMonthlyChart data={yearlyData.months} year={yearlyData.year} />
                )}

                <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                  <AllocationByEmployeeTable employees={allocationData.employees} />
                  <AllocationComparisonChart employees={allocationData.employees} />
                </div>
              </>
            ) : null}
          </TabsContent>

          {/* ── Satisfação ───────────────────────────────────────────────── */}
          <TabsContent value="satisfaction" className="space-y-6 mt-6">
            {isStakeholderLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : stakeholderData ? (
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
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
