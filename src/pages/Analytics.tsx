import { useState, useMemo } from 'react';
import { startOfMonth, endOfMonth } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { AnalyticsKPIs } from '@/components/analytics/AnalyticsKPIs';
import { CostCompositionChart } from '@/components/analytics/CostCompositionChart';
import { CostByProjectTable } from '@/components/analytics/CostByProjectTable';
import { EmployeeUtilizationTable } from '@/components/analytics/EmployeeUtilizationTable';
import { useAnalyticsData, useAnalyticsFilterOptions } from '@/hooks/useAnalyticsData';
import { useAuth } from '@/contexts/AuthContext';

export default function Analytics() {
  const { employee } = useAuth();
  const isAdmin = employee?.isAdmin ?? false;

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>();
  const [selectedManagerId, setSelectedManagerId] = useState<string | undefined>();

  const filters = useMemo(() => ({
    startDate: startOfMonth(currentMonth),
    endDate: endOfMonth(currentMonth),
    clientId: selectedClientId,
    managerId: selectedManagerId,
  }), [currentMonth, selectedClientId, selectedManagerId]);

  const { data: analyticsData, isLoading } = useAnalyticsData(filters);
  const { data: filterOptions } = useAnalyticsFilterOptions();

  const clientOptions = useMemo(
    () => (filterOptions?.clients || []).map(c => ({ id: c.id, label: c.company_name })),
    [filterOptions]
  );

  const managerOptions = useMemo(
    () => (filterOptions?.managers || []).map(m => ({ id: m.id, label: m.nome })),
    [filterOptions]
  );

  return (
    <AppLayout
      title="Analytics"
      description="Performance financeira e utilização da equipe"
      breadcrumbs={[{ label: 'Analytics' }]}
    >
      <div className="space-y-6">
        {/* Filters */}
        <AnalyticsFilters
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          clients={clientOptions}
          managers={managerOptions}
          selectedClientId={selectedClientId}
          onClientChange={setSelectedClientId}
          selectedManagerId={selectedManagerId}
          onManagerChange={setSelectedManagerId}
          showManagerFilter={isAdmin}
        />

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : analyticsData ? (
          <>
            {/* KPIs */}
            <AnalyticsKPIs
              revenue={analyticsData.revenue}
              totalCosts={analyticsData.totalCosts}
              grossMargin={analyticsData.grossMargin}
              grossMarginTarget={analyticsData.grossMarginTarget}
            />

            {/* Analytical Sections */}
            <Tabs defaultValue="costs" className="space-y-4">
              <TabsList>
                <TabsTrigger value="costs">Composição de Custos</TabsTrigger>
                <TabsTrigger value="utilization">Utilização da Equipe</TabsTrigger>
              </TabsList>

              <TabsContent value="costs" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-2">
                  <CostCompositionChart
                    laborCost={analyticsData.laborCost}
                    supplierCost={analyticsData.supplierCost}
                    materialCost={analyticsData.materialCost}
                  />
                  <div className="lg:col-span-1" />
                </div>
                <CostByProjectTable data={analyticsData.costsByProject} />
              </TabsContent>

              <TabsContent value="utilization">
                <EmployeeUtilizationTable data={analyticsData.employeeUtilization} />
              </TabsContent>
            </Tabs>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
