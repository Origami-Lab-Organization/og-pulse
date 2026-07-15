import { useMemo, useState } from 'react';
import { CalendarDays, FileDown, Loader2, X } from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, getQuarter, isSameMonth,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useFinancialReport } from '@/hooks/useFinancialReport';
import { useAnalyticsFilterOptions } from '@/hooks/useAnalyticsData';
import { generateAnalyticsPdf } from '@/components/analytics/AnalyticsPdfGenerator';
import { FinanceKpiCards } from '@/components/analytics/financeiro/FinanceKpiCards';
import { FinanceEvolutionChart } from '@/components/analytics/financeiro/FinanceEvolutionChart';
import { OverdueSection } from '@/components/analytics/financeiro/OverdueSection';
import { BillableSplitCard } from '@/components/analytics/financeiro/BillableSplitCard';
import { ClientBreakdownCard } from '@/components/analytics/financeiro/ClientBreakdownCard';

type PeriodPreset = 'currentMonth' | 'previousMonth' | 'currentQuarter' | 'year' | 'custom';

const ALL = 'all';

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function Analytics() {
  const today = useMemo(() => new Date(), []);

  const periodOptions = useMemo<{ value: PeriodPreset; label: string }[]>(
    () => [
      { value: 'currentMonth', label: 'Mês atual' },
      { value: 'previousMonth', label: 'Mês anterior' },
      { value: 'currentQuarter', label: 'Trimestre atual' },
      { value: 'year', label: String(today.getFullYear()) },
      { value: 'custom', label: 'Personalizado' },
    ],
    [today],
  );

  const [period, setPeriod] = useState<PeriodPreset>('currentMonth');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [managerId, setManagerId] = useState(ALL);
  const [clientId, setClientId] = useState(ALL);
  const [projectId, setProjectId] = useState(ALL);
  const [isRequestingPdf, setIsRequestingPdf] = useState(false);

  const range = useMemo(() => {
    switch (period) {
      case 'currentMonth': return { startDate: startOfMonth(today), endDate: endOfMonth(today) };
      case 'previousMonth': {
        const d = subMonths(today, 1);
        return { startDate: startOfMonth(d), endDate: endOfMonth(d) };
      }
      case 'currentQuarter': return { startDate: startOfQuarter(today), endDate: endOfQuarter(today) };
      case 'year': return { startDate: startOfYear(today), endDate: endOfYear(today) };
      case 'custom': return { startDate: customStart ?? startOfMonth(today), endDate: customEnd ?? endOfMonth(today) };
    }
  }, [period, today, customStart, customEnd]);

  const filters = useMemo(
    () => ({
      startDate: range.startDate,
      endDate: range.endDate,
      clientId: clientId === ALL ? undefined : clientId,
      managerId: managerId === ALL ? undefined : managerId,
      projectId: projectId === ALL ? undefined : projectId,
    }),
    [range, clientId, managerId, projectId],
  );

  const { data, isLoading } = useFinancialReport(filters);
  const { data: options } = useAnalyticsFilterOptions();

  const periodLabelFull = useMemo(() => {
    const shortMonth = (d: Date) => capitalize(format(d, 'MMM', { locale: ptBR }).replace('.', ''));
    switch (period) {
      case 'currentMonth': return `${capitalize(format(today, 'MMMM yyyy', { locale: ptBR }))} · em curso`;
      case 'previousMonth': return `${capitalize(format(subMonths(today, 1), 'MMMM yyyy', { locale: ptBR }))} · mês fechado`;
      case 'currentQuarter': return `${getQuarter(today)}T${format(today, 'yy')} · ${shortMonth(startOfQuarter(today))}–${shortMonth(endOfQuarter(today))}`;
      case 'year': return `Jan–Dez ${today.getFullYear()}`;
      case 'custom': return `${format(range.startDate, 'dd/MM/yy')} – ${format(range.endDate, 'dd/MM/yy')}`;
    }
  }, [period, today, range]);

  const activeFilters = [managerId, clientId, projectId].filter((v) => v !== ALL).length;
  const clearFilters = () => { setManagerId(ALL); setClientId(ALL); setProjectId(ALL); };

  function handleChartMonthClick(monthIndex: number) {
    const clicked = new Date(range.startDate.getFullYear(), monthIndex, 1);
    if (isSameMonth(clicked, today)) {
      setPeriod('currentMonth');
    } else if (isSameMonth(clicked, subMonths(today, 1))) {
      setPeriod('previousMonth');
    } else {
      setCustomStart(startOfMonth(clicked));
      setCustomEnd(endOfMonth(clicked));
      setPeriod('custom');
    }
  }

  function handleExportPdf() {
    if (!data) return;
    setIsRequestingPdf(true);
    try {
      const catVal = (k: string) => data.categories.find((c) => c.key === k)?.value ?? 0;
      generateAnalyticsPdf({
        periodLabel: periodLabelFull,
        year: range.startDate.getFullYear(),
        financialKPIs: {
          faturado: data.faturamento, revenueActual: data.receita, revenueProjected: 0,
          totalCosts: data.custos, laborCost: catVal('labor'), supplierCost: catVal('supplier'),
          materialCost: catVal('material'), commissionCost: catVal('commission'),
          grossMargin: data.margemPct ?? 0, grossMarginTarget: data.metaPct,
        },
        financialMonths: data.evolutionMonths,
        projectFinancials: { byProject: [], byManager: [], byServiceLine: [], byClient: [], grossMarginTarget: data.metaPct },
        revenueData: data.revenue,
        stakeholderData: { totals: { total: 0, promoters: 0, neutrals: 0, detractors: 0 }, byProject: [], highInfluenceDetractors: [] },
      });
    } catch (err) {
      console.error('Falha ao gerar PDF do relatório financeiro', err);
    } finally {
      setIsRequestingPdf(false);
    }
  }

  const filterSelectClass = 'h-8 w-[150px] text-xs';

  return (
    <AppLayout title="Relatório Financeiro" hideHeader>
      <div className="-mx-4 -mt-4 mb-4 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 sm:-mx-6 sm:-mt-6 sm:mb-6">
        {/* Row A — título + período + PDF */}
        <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1.5 border-b px-4 py-2.5 sm:px-6">
          <h1 className="text-lg font-bold tracking-tight text-foreground">Relatório Financeiro</h1>
          <span className="hidden border-l pl-3 text-xs text-muted-foreground md:inline">Faturado, recebido, custos e resultado</span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodPreset)}>
              <SelectTrigger className="h-9 w-auto gap-2 px-3">
                <CalendarDays className="h-4 w-4 text-primary" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {periodOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>

            {period === 'custom' && (
              <div className="flex items-center gap-1">
                {([['Início', customStart, (d: Date) => setCustomStart(d)], ['Fim', customEnd, (d: Date) => setCustomEnd(d)]] as const).map(([lbl, val, set]) => (
                  <Popover key={lbl}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn('h-9 w-[116px] justify-start gap-2 text-xs font-normal', !val && 'text-muted-foreground')}>
                        <CalendarDays className="h-3.5 w-3.5" />
                        {val ? format(val, 'dd/MM/yy') : lbl}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar mode="single" selected={val} onSelect={(d) => d && set(d)} initialFocus className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                ))}
              </div>
            )}

            {period !== 'custom' && (
              <span className="hidden font-mono text-[11px] tabular-nums text-muted-foreground lg:inline">{periodLabelFull}</span>
            )}

            <Button type="button" variant="outline" size="sm" className="h-9 gap-2" disabled={isRequestingPdf || !data} onClick={handleExportPdf}>
              {isRequestingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              PDF
            </Button>
          </div>
        </div>

        {/* Row B — filtros */}
        <div className="flex min-h-[52px] flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
          <span className="ol-label shrink-0 text-muted-foreground">Filtros</span>
          <Select value={managerId} onValueChange={setManagerId}>
            <SelectTrigger className={filterSelectClass}><SelectValue placeholder="Gerente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os gerentes</SelectItem>
              {(options?.managers ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger className={filterSelectClass}><SelectValue placeholder="Cliente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os clientes</SelectItem>
              {(options?.clients ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className={cn(filterSelectClass, 'w-[180px]')}><SelectValue placeholder="Projeto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos os projetos</SelectItem>
              {(options?.projects ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {activeFilters > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters} className="h-7 gap-1 px-2 text-xs text-muted-foreground">
              <X className="h-3.5 w-3.5" /> Limpar
            </Button>
          )}
          {activeFilters > 0 && (
            <span className="ml-auto text-[11px] text-muted-foreground">
              Filtro por projeto/gerente/cliente não inclui custo interno (não é de projeto).
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !data ? (
        <div className="rounded-lg border border-dashed bg-card px-6 py-12 text-center">
          <p className="font-semibold text-foreground">Sem dados financeiros no período</p>
          <p className="mt-1 text-sm text-muted-foreground">Ajuste o período ou os filtros.</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          <FinanceKpiCards data={data} />
          <FinanceEvolutionChart months={data.evolutionMonths} onMonthClick={handleChartMonthClick} />
          <ClientBreakdownCard rows={data.clientBreakdown} metaPct={data.metaPct} />
          <OverdueSection overdueNFs={data.revenue.overdueNFs} overdueReceipts={data.revenue.overdueReceipts} />
          <BillableSplitCard data={data} />
        </div>
      )}
    </AppLayout>
  );
}
