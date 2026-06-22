import { Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useNpsAvailability } from '@/hooks/useNpsAvailability'
import { cn } from '@/lib/utils'
import type { StakeholderAnalyticsData } from '@/hooks/useStakeholderAnalytics'

interface Props {
  stakeholderData: StakeholderAnalyticsData
  isLoading?: boolean
  availabilityOverride?: boolean
}

const LOW_SAMPLE = 5

function calcNps(promoters: number, detractors: number, total: number): number | null {
  if (total === 0) return null
  return Math.round(((promoters - detractors) / total) * 100)
}

function npsColor(score: number | null): string {
  if (score === null) return 'text-muted-foreground'
  if (score >= 50) return 'text-emerald-600 dark:text-emerald-400'
  if (score >= 0)  return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

// ── Barra de distribuição ────────────────────────────────────────────────────
function DistBar({ label, count, pct, colorClass }: { label: string; count: number; pct: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', colorClass)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums w-16 text-right shrink-0">
        {count} ({pct}%)
      </span>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export function NpsPortfolioSection({ stakeholderData, isLoading, availabilityOverride }: Props) {
  const { isAvailable: npsAvailable, isLoading: npsLoading } = useNpsAvailability()
  const isAvailable = availabilityOverride ?? npsAvailable

  if (!availabilityOverride && npsLoading) return null

  // ── Placeholder: J10 não implementado ───────────────────────────────────
  if (!isAvailable) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">NPS do Portfólio</CardTitle>
          <CardDescription>Net Promoter Score consolidado dos projetos no período</CardDescription>
        </CardHeader>
        <CardContent>
          <div role="status" aria-label="NPS indisponível" className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">NPS do portfólio estará disponível após a implementação do módulo de Stakeholders e NPS (J10)</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Quando o módulo de pesquisas NPS for ativado, esta seção exibirá o score consolidado,
              a distribuição de promotores/neutros/detratores e o detalhamento por projeto.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">NPS do Portfólio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-20" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    )
  }

  // ── Dados disponíveis ────────────────────────────────────────────────────
  const { totals } = stakeholderData
  const score        = calcNps(totals.promoters, totals.detractors, totals.total)
  const lowSample    = totals.total > 0 && totals.total < LOW_SAMPLE
  const promoterPct  = totals.total > 0 ? Math.round((totals.promoters  / totals.total) * 100) : 0
  const neutralPct   = totals.total > 0 ? Math.round((totals.neutrals   / totals.total) * 100) : 0
  const detractorPct = totals.total > 0 ? Math.round((totals.detractors / totals.total) * 100) : 0

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">NPS do Portfólio</CardTitle>
          <CardDescription>
            {totals.total} resposta{totals.total !== 1 ? 's' : ''} no período
          </CardDescription>
        </div>
        {lowSample && (
          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-full px-2 py-0.5 shrink-0">
            Amostra baixa
          </span>
        )}
      </CardHeader>

      <CardContent>
        {totals.total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma resposta no período.
          </p>
        ) : (
          <div className="space-y-6">
            {/* Score + distribuição */}
            <div className="flex items-center gap-8">
              <div className="text-center shrink-0">
                <div className={cn('text-5xl font-bold tabular-nums leading-none', npsColor(score))}>
                  {score !== null ? score : '—'}
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">NPS Score</div>
                {lowSample && (
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                    representatividade baixa
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2.5">
                <DistBar label="Promotores"  count={totals.promoters}  pct={promoterPct}  colorClass="bg-emerald-500" />
                <DistBar label="Neutros"     count={totals.neutrals}   pct={neutralPct}   colorClass="bg-amber-400" />
                <DistBar label="Detratores"  count={totals.detractors} pct={detractorPct} colorClass="bg-red-500" />
              </div>
            </div>

            {/* Por projeto */}
            {stakeholderData.byProject.length > 0 && (
              <div className="border-t pt-2 divide-y">
                {stakeholderData.byProject.map((p) => {
                  const pScore   = calcNps(p.promoters, p.detractors, p.total)
                  const pLow     = p.total < LOW_SAMPLE
                  return (
                    <div key={p.projectId} className="flex items-center justify-between py-2.5 px-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.projectName}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.total} resposta{p.total !== 1 ? 's' : ''}
                          {pLow && <span className="ml-2 text-amber-600 dark:text-amber-400">· amostra baixa</span>}
                        </p>
                      </div>
                      <span className={cn('text-sm font-bold tabular-nums ml-4', npsColor(pScore))}>
                        {pScore !== null ? pScore : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
