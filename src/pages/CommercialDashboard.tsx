import { useState, useMemo } from 'react';
import { Loader2, CalendarIcon, FileDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateCommercialPdf } from '@/components/commercial/CommercialPdfGenerator';
import { AppLayout } from '@/components/layout/AppLayout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useCommercialDashboard } from '@/hooks/useCommercialDashboard';
import { CommercialKPIs } from '@/components/commercial/CommercialKPIs';
import { ConversionFunnel } from '@/components/commercial/ConversionFunnel';
import { RevenueAccumulatedChart } from '@/components/commercial/RevenueAccumulatedChart';
import { PipelineDonutChart } from '@/components/commercial/PipelineDonutChart';
import { TopClientsChart } from '@/components/commercial/TopClientsChart';
import { LossReasonsChart } from '@/components/commercial/LossReasonsChart';
import { RecentLeadsTable } from '@/components/commercial/RecentLeadsTable';
import { SERVICE_LINE_OPTIONS } from '@/types/lead';

type PeriodType = 'this_month' | 'last_3_months' | 'this_year' | 'last_year' | 'custom';

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_3_months', label: 'Últimos 3 meses' },
  { value: 'this_year', label: 'Este ano' },
  { value: 'last_year', label: 'Ano anterior' },
  { value: 'custom', label: 'Personalizado' },
];

export default function CommercialDashboard() {
  const [periodType, setPeriodType] = useState<PeriodType>('this_year');
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [selectedServiceLine, setSelectedServiceLine] = useState('all');
  const [selectedResponsible, setSelectedResponsible] = useState('all');

  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    switch (periodType) {
      case 'this_month':
        return { dateFrom: startOfMonth(now), dateTo: endOfMonth(now) };
      case 'last_3_months': {
        const threeMonthsAgo = subMonths(now, 2);
        return { dateFrom: startOfMonth(threeMonthsAgo), dateTo: endOfMonth(now) };
      }
      case 'this_year':
        return { dateFrom: startOfYear(now), dateTo: endOfYear(now) };
      case 'last_year': {
        const lastYear = new Date(now.getFullYear() - 1, 0, 1);
        return { dateFrom: startOfYear(lastYear), dateTo: endOfYear(lastYear) };
      }
      case 'custom':
        return {
          dateFrom: customStart || startOfYear(now),
          dateTo: customEnd || endOfYear(now),
        };
      default:
        return { dateFrom: startOfYear(now), dateTo: endOfYear(now) };
    }
  }, [periodType, customStart, customEnd]);

  const { data, isLoading } = useCommercialDashboard(dateFrom, dateTo, selectedServiceLine, selectedResponsible);

  const periodLabel = useMemo(() => {
    const start = format(dateFrom, "dd/MM/yyyy", { locale: ptBR });
    const end = format(dateTo, "dd/MM/yyyy", { locale: ptBR });
    const opt = PERIOD_OPTIONS.find(o => o.value === periodType);
    return opt?.value === 'custom' ? `${start} – ${end}` : (opt?.label ?? `${start} – ${end}`);
  }, [dateFrom, dateTo, periodType]);

  const handleExportPdf = () => {
    if (!data) return;
    generateCommercialPdf({
      periodLabel,
      kpis: {
        conversionRate: data.conversionRate,
        avgTicket: data.avgTicket,
        avgSalesCycleDays: data.avgSalesCycleDays,
        activePipeline: data.activePipeline,
        forecast: data.forecast,
        forecastLeadsCount: data.forecastLeadsCount,
        newLeadsThisYear: data.newLeadsThisYear,
        prevConversionRate: data.prevConversionRate,
        prevAvgTicket: data.prevAvgTicket,
        prevActivePipeline: data.prevActivePipeline,
        prevForecast: data.prevForecast,
        prevNewLeadsThisYear: data.prevNewLeadsThisYear,
      },
      funnelData: data.funnelData,
      revenueByMonth: data.revenueByMonth,
      pipelineByStage: data.pipelineByStage,
      totalPipeline: data.totalPipeline,
      topClients: data.topClients,
      lossReasons: data.lossReasons,
      activeLeads: data.activeLeadsPeriod,
    });
  };

  return (
    <AppLayout
      title="Dashboard Comercial"
      description="Inteligência comercial consolidada"
      breadcrumbs={[{ label: 'Comercial' }, { label: 'Dashboard' }]}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          disabled={isLoading || !data}
        >
          <FileDown className="mr-2 h-4 w-4" />
          Exportar PDF
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={periodType} onValueChange={(v) => setPeriodType(v as PeriodType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {periodType === 'custom' && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[150px] justify-start text-left font-normal',
                      !customStart && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStart ? format(customStart, 'dd/MM/yyyy') : 'Início'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStart}
                    onSelect={setCustomStart}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[150px] justify-start text-left font-normal',
                      !customEnd && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customEnd ? format(customEnd, 'dd/MM/yyyy') : 'Fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customEnd}
                    onSelect={setCustomEnd}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </>
          )}

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

          <Select value={selectedResponsible} onValueChange={setSelectedResponsible}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(data?.responsibleOptions || []).map(opt => (
                <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
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
              forecast={data.forecast}
              forecastLeadsCount={data.forecastLeadsCount}
              newLeadsThisYear={data.newLeadsThisYear}
              prevConversionRate={data.prevConversionRate}
              prevAvgTicket={data.prevAvgTicket}
              prevAvgSalesCycleDays={data.prevAvgSalesCycleDays}
              prevActivePipeline={data.prevActivePipeline}
              prevForecast={data.prevForecast}
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
