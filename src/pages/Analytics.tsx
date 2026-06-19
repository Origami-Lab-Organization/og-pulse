import { useState, useMemo } from 'react'
import { CalendarIcon, FileDown, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProjectMetricsBar } from '@/components/analytics/ProjectMetricsBar'
import { ReceitaCustoMensalChart } from '@/components/analytics/ReceitaCustoMensalChart'
import { CostMixDonut } from '@/components/analytics/CostMixDonut'
import { RankingPorMargem } from '@/components/analytics/RankingPorMargem'
import { PerformancePorLinhaServico } from '@/components/analytics/PerformancePorLinhaServico'
import { NpsPortfolioSection } from '@/components/analytics/NpsPortfolioSection'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAnalyticsFilterOptions } from '@/hooks/useAnalyticsData'
import { useFinancialEvolution } from '@/hooks/useFinancialEvolution'
import { useProjectFinancials } from '@/hooks/useProjectFinancials'
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics'
import { useStakeholderAnalytics } from '@/hooks/useStakeholderAnalytics'
import { useAnalyticsFilters, type AnalyticsPreset } from '@/hooks/useAnalyticsFilters'
import { useNpsAvailability } from '@/hooks/useNpsAvailability'
import { generateAnalyticsPdf } from '@/components/analytics/AnalyticsPdfGenerator'
import { startOfMonth, endOfMonth } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ProjectMetricCardProps } from '@/components/analytics/ProjectMetricCard'
import {
  MOCK_FINANCIAL_EVOLUTION,
  MOCK_FILTER_OPTIONS,
  MOCK_STAKEHOLDER_DATA,
  filterMockByManager,
} from '@/components/analytics/_devMockData'

// Substitua por `false` para usar dados reais do Supabase
const DEV_MOCK = true

// ── presets ──────────────────────────────────────────────────────────────
const PRESET_OPTIONS: { value: AnalyticsPreset; label: string }[] = [
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_3_months', label: '3 meses' },
  { value: 'last_6_months', label: '6 meses' },
  { value: 'this_year', label: 'Este ano' },
  { value: 'custom', label: 'Personalizado' },
]

// ── helpers ───────────────────────────────────────────────────────────────
function fmtFull(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}


function calcMargemPonderada(
  projetos: Array<{ revenue: number; grossMargin: number | null }>,
): number | null {
  const total = projetos.reduce((s, p) => s + p.revenue, 0)
  if (total === 0) return null
  return projetos.reduce((s, p) => s + (p.grossMargin ?? 0) * p.revenue, 0) / total
}

function calcPctEmRisco(emRisco: number, ativos: number): number | null {
  if (ativos === 0) return null
  return Math.round((emRisco / ativos) * 100)
}

// ── página ────────────────────────────────────────────────────────────────
export default function Analytics() {
  const {
    filters: carteiraFilters,
    setPreset,
    setCustomRange,
    setGpFilter,
    customStart,
    customEnd,
    isAdmin,
  } = useAnalyticsFilters()

  const [isRequestingPdf, setIsRequestingPdf] = useState(false)
  const [devGpFilter, setDevGpFilter] = useState<string | null>(null)

  // No modo DEV_MOCK o usuário pode não ser admin — forçamos visibilidade e filtro local
  const effectiveIsAdmin  = DEV_MOCK ? true : isAdmin
  const effectiveGpFilter = DEV_MOCK ? devGpFilter : carteiraFilters.gpFilter

  // data filters para os hooks existentes
  const filters = useMemo(
    () => ({
      startDate: carteiraFilters.startDate,
      endDate: carteiraFilters.endDate,
      clientId: undefined as string | undefined,
      managerId: effectiveGpFilter ?? undefined,
      projectId: undefined as string | undefined,
    }),
    [carteiraFilters, effectiveGpFilter],
  )

  const { data: _finEvo, isLoading: _isFinLoading } = useFinancialEvolution(filters)
  const { data: _projFin, isLoading: _isProjFinLoading } = useProjectFinancials(filters)
  const { data: _filterOpts } = useAnalyticsFilterOptions()

  const { data: _revenueData }     = useRevenueAnalytics(filters)
  const { data: _stakeholderData } = useStakeholderAnalytics(filters)

  const financialEvolution         = DEV_MOCK ? MOCK_FINANCIAL_EVOLUTION               : _finEvo
  const isFinancialLoading         = DEV_MOCK ? false                                  : _isFinLoading
  const projectFinancials          = DEV_MOCK ? filterMockByManager(effectiveGpFilter) : _projFin
  const isProjectFinancialsLoading = DEV_MOCK ? false                                  : _isProjFinLoading
  const filterOptions              = DEV_MOCK ? MOCK_FILTER_OPTIONS                    : _filterOpts
  const revenueData                = _revenueData ?? { overdueNFs: [], overdueReceipts: [], periodNFs: [], periodReceivables: [], byClient: [], byManager: [], byServiceLine: [] }
  const stakeholderData            = DEV_MOCK ? MOCK_STAKEHOLDER_DATA : (_stakeholderData ?? { totals: { total: 0, promoters: 0, neutrals: 0, detractors: 0 }, byProject: [], highInfluenceDetractors: [] })
  const { isAvailable: npsAvailable, isLoading: npsLoading } = useNpsAvailability()

  // financial months (meses dentro do range selecionado)
  const financialMonths = useMemo(() => {
    if (!financialEvolution) return []
    return financialEvolution.months.map((m) => {
      const monthStart = startOfMonth(new Date(financialEvolution.year, m.monthIndex, 1))
      const monthEnd = endOfMonth(monthStart)
      return {
        ...m,
        isHighlighted: monthStart <= filters.endDate && monthEnd >= filters.startDate,
      }
    })
  }, [financialEvolution, filters])

  const financialKPIs = useMemo(() => {
    if (!financialMonths.length || !financialEvolution) return null
    const highlighted = financialMonths.filter((m) => m.isHighlighted)
    const faturado         = highlighted.reduce((s, m) => s + m.faturado, 0)
    const revenueActual    = highlighted.reduce((s, m) => s + m.revenueReal, 0)
    const revenueProjected = highlighted.reduce((s, m) => s + m.revenuePlanned, 0)
    const totalCosts       = highlighted.reduce((s, m) => s + m.totalCosts, 0)
    const laborCost        = highlighted.reduce((s, m) => s + m.laborCost, 0)
    const supplierCost     = highlighted.reduce((s, m) => s + m.supplierCost, 0)
    const materialCost     = highlighted.reduce((s, m) => s + m.materialCost, 0)
    const commissionCost   = highlighted.reduce((s, m) => s + m.commissionCost, 0)
    const reimbursementCost = highlighted.reduce((s, m) => s + m.reimbursementCost, 0)
    const grossMargin      = revenueActual > 0 ? ((revenueActual - totalCosts) / revenueActual) * 100 : 0
    return {
      faturado,
      revenueActual,
      revenueProjected,
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

  // 6 KPIs da carteira
  const carteiraKpiCards = useMemo((): ProjectMetricCardProps[] => {
    const isLoading = isFinancialLoading || isProjectFinancialsLoading
    const byProject = projectFinancials?.byProject ?? []
    const target = projectFinancials?.grossMarginTarget ?? 25
    const receitaRealizada = financialKPIs?.revenueActual ?? 0
    const receitaProjetada = financialKPIs?.revenueProjected ?? 0
    const projetadoPct =
      receitaProjetada > 0 ? Math.round((receitaRealizada / receitaProjetada) * 100) : null
    const margemMedia = calcMargemPonderada(byProject)
    const projetosAtivos = byProject.length
    const projetosEmRisco = byProject.filter(
      (p) => p.grossMargin !== null && p.grossMargin < target,
    ).length
    const pctEmRisco = calcPctEmRisco(projetosEmRisco, projetosAtivos)

    return [
      {
        label: 'Receita realizada',
        value: receitaRealizada > 0 ? fmtFull(receitaRealizada) : '—',
        subtitle: receitaProjetada > 0
          ? `${fmtFull(receitaProjetada)} projetado`
          : undefined,
        delta: DEV_MOCK ? '↑ 8.4% vs 3m atrás' : undefined,
        deltaPositive: DEV_MOCK ? true : undefined,
        isLoading,
      },
      {
        label: 'Projetado vs realizado',
        value: projetadoPct !== null ? `${projetadoPct}%` : '—',
        subtitle: receitaProjetada > 0
          ? `${fmtFull(receitaProjetada)} contratados`
          : undefined,
        statusColor: projetadoPct !== null && projetadoPct < 80 ? 'amber' : 'default',
        isLoading,
      },
      {
        label: 'Margem média',
        value: margemMedia !== null ? `${margemMedia.toFixed(1)}%` : '—',
        subtitle: `meta ${target}%`,
        statusColor:
          margemMedia !== null && margemMedia < target ? 'red' : 'default',
        tooltip:
          'Média ponderada por receita. Alerta vermelho quando abaixo da meta configurada.',
        isLoading,
      },
      {
        label: 'Em risco',
        value: projetosEmRisco > 0 ? String(projetosEmRisco) : '—',
        subtitle:
          pctEmRisco !== null
            ? `${projetosAtivos} ativos`
            : projetosAtivos > 0
              ? `${projetosAtivos} ativos`
              : undefined,
        statusColor: projetosEmRisco > 0 ? 'red' : 'default',
        isLoading,
      },
      {
        label: 'NPS Portfólio',
        value: '—',
        tooltip: npsAvailable
          ? 'NPS agregado dos projetos no período.'
          : 'NPS disponível após o módulo de Stakeholders e NPS (J10).',
        isLoading: isLoading || npsLoading,
      },
    ]
  }, [
    isFinancialLoading,
    isProjectFinancialsLoading,
    npsLoading,
    npsAvailable,
    projectFinancials,
    financialKPIs,
  ])

  const managerOptions = useMemo(
    () => (filterOptions?.managers || []).map((m) => ({ id: m.id, label: m.nome })),
    [filterOptions],
  )

  const periodLabel = useMemo(() => {
    const map: Record<AnalyticsPreset, string> = {
      this_month:     'Este mês',
      last_3_months:  'Últimos 3 meses',
      last_6_months:  'Últimos 6 meses',
      this_year:      'Este ano',
      custom: `${format(carteiraFilters.startDate, 'dd/MM/yyyy')} – ${format(carteiraFilters.endDate, 'dd/MM/yyyy')}`,
    }
    return map[carteiraFilters.preset]
  }, [carteiraFilters])

  async function handleExportPdf() {
    if (!financialKPIs || !projectFinancials || !financialEvolution) return
    setIsRequestingPdf(true)
    try {
      generateAnalyticsPdf({
        periodLabel,
        year: financialEvolution.year,
        financialKPIs,
        financialMonths,
        projectFinancials,
        revenueData,
        stakeholderData,
      })
    } finally {
      setIsRequestingPdf(false)
    }
  }

  const isLoading = isFinancialLoading || isProjectFinancialsLoading

  return (
    <AppLayout
      title="Analytics de Projetos"
      description="Qual projeto tem a pior margem? Qual linha é mais rentável? Responda em menos de 5 minutos."
      breadcrumbs={[{ label: 'Analytics de Projetos' }]}
      actions={
        <Button variant="outline" size="sm" disabled={isRequestingPdf} onClick={handleExportPdf}>
          {isRequestingPdf
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <FileDown className="mr-2 h-4 w-4" />}
          Exportar PDF
        </Button>
      }
    >
      <div className="space-y-6">
        {/* ── Filtros ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* GP filter — admin only */}
          <div>
            {effectiveIsAdmin && (
              <Select
                value={effectiveGpFilter ?? 'all'}
                onValueChange={(v) => {
                  const id = v === 'all' ? null : v
                  DEV_MOCK ? setDevGpFilter(id) : setGpFilter(id)
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="GP Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os GPs</SelectItem>
                  {managerOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Indicador + presets */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
              <span className="text-primary">•</span>
              atualizado há menos de 1 dia
            </span>

            <div className="inline-flex rounded-lg border bg-card p-0.5 gap-0.5">
              {PRESET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPreset(opt.value)}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    carteiraFilters.preset === opt.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom pickers */}
            {carteiraFilters.preset === 'custom' && (
              <div className="flex items-center gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-[130px] justify-start text-left font-normal text-sm',
                        !customStart && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStart ? format(customStart, 'dd/MM/yy') : 'Início'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={customStart}
                      onSelect={(d) => d && setCustomRange(d, customEnd ?? d)}
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
                        'w-[130px] justify-start text-left font-normal text-sm',
                        !customEnd && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEnd ? format(customEnd, 'dd/MM/yy') : 'Fim'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={customEnd}
                      onSelect={(d) => d && setCustomRange(customStart ?? d, d)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>

        {/* ── 5 KPIs ───────────────────────────────────────────────────── */}
        <ProjectMetricsBar cards={carteiraKpiCards} />

        {/* ── Loading ──────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* ── Receita × Custo + Custo por categoria ─────────────────── */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-4">
              <div className="lg:col-span-3">
                <ReceitaCustoMensalChart data={financialMonths} />
              </div>
              <div className="lg:col-span-1">
                {financialKPIs ? (
                  <CostMixDonut
                    laborCost={financialKPIs.laborCost}
                    supplierCost={financialKPIs.supplierCost}
                    materialCost={financialKPIs.materialCost}
                    commissionCost={financialKPIs.commissionCost}
                    reimbursementCost={financialKPIs.reimbursementCost}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
            </div>

            {/* ── Ranking por margem ────────────────────────────────────── */}
            {projectFinancials && (
              <RankingPorMargem
                byProject={projectFinancials.byProject}
                grossMarginTarget={projectFinancials.grossMarginTarget}
              />
            )}

            {/* ── Performance por linha de serviço ─────────────────────── */}
            {projectFinancials && (
              <PerformancePorLinhaServico
                byServiceLine={projectFinancials.byServiceLine}
                grossMarginTarget={projectFinancials.grossMarginTarget}
              />
            )}

            {/* ── NPS do Portfólio ──────────────────────────────────────── */}
            <NpsPortfolioSection
              stakeholderData={stakeholderData}
              isLoading={isLoading}
              availabilityOverride={DEV_MOCK ? true : undefined}
            />
          </>
        )}
      </div>
    </AppLayout>
  )
}
