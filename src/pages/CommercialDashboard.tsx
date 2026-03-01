import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCommercialDashboard } from '@/hooks/useCommercialDashboard';
import { CommercialKPIs } from '@/components/commercial/CommercialKPIs';
import { ConversionFunnel } from '@/components/commercial/ConversionFunnel';
import { RevenueAccumulatedChart } from '@/components/commercial/RevenueAccumulatedChart';
import { PipelineDonutChart } from '@/components/commercial/PipelineDonutChart';
import { TopClientsChart } from '@/components/commercial/TopClientsChart';
import { LossReasonsChart } from '@/components/commercial/LossReasonsChart';
import { RecentLeadsTable } from '@/components/commercial/RecentLeadsTable';
import { SERVICE_LINE_OPTIONS } from '@/types/lead';

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function CommercialDashboard() {
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedServiceLine, setSelectedServiceLine] = useState('all');

  const { data, isLoading } = useCommercialDashboard(selectedYear, selectedServiceLine);

  return (
    <AppLayout
      title="Dashboard Comercial"
      description="Inteligência comercial consolidada"
      breadcrumbs={[{ label: 'Comercial' }, { label: 'Dashboard' }]}
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedServiceLine} onValueChange={setSelectedServiceLine}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Linhas</SelectItem>
              {SERVICE_LINE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : data ? (
          <>
            <CommercialKPIs
              conversionRate={data.conversionRate}
              avgTicket={data.avgTicket}
              avgSalesCycleDays={data.avgSalesCycleDays}
              activePipeline={data.activePipeline}
              pipelineLeadsWithBudgetCount={data.pipelineLeadsWithBudgetCount}
              pipelineHasNoProposals={data.pipelineHasNoProposals}
              newLeadsThisYear={data.newLeadsThisYear}
              prevConversionRate={data.prevConversionRate}
              prevAvgTicket={data.prevAvgTicket}
              prevAvgSalesCycleDays={data.prevAvgSalesCycleDays}
              prevActivePipeline={data.prevActivePipeline}
              prevNewLeadsThisYear={data.prevNewLeadsThisYear}
            />

            <ConversionFunnel data={data.funnelData} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RevenueAccumulatedChart data={data.revenueByMonth} />
              <PipelineDonutChart data={data.pipelineByStage} totalPipeline={data.totalPipeline} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TopClientsChart data={data.topClients} />
              <LossReasonsChart data={data.lossReasons} />
            </div>

            <RecentLeadsTable leads={data.recentLeads} />
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
