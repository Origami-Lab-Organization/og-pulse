import { Link } from 'react-router-dom'
import { CheckCircle2, AlertTriangle, XCircle, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ProjectFinancialRow, DimensionFinancialRow } from '@/hooks/useProjectFinancials'

// ── tipos ─────────────────────────────────────────────────────────────────
type ProjetoStatus = 'saudavel' | 'atencao' | 'critico'

interface RankingPorMargemProps {
  byProject: ProjectFinancialRow[]
  grossMarginTarget: number | null
}

// ── helpers ───────────────────────────────────────────────────────────────
function getStatus(margin: number | null, target: number): ProjetoStatus {
  if (margin === null) return 'atencao'
  if (margin >= target + 5) return 'saudavel'
  if (margin >= target - 5) return 'atencao'
  return 'critico'
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1000) return `R$ ${Math.round(value / 1000)}k`
  return `R$ ${Math.round(value)}`
}

// ── badge ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  ProjetoStatus,
  { label: string; icon: typeof CheckCircle2; classes: string }
> = {
  saudavel: {
    label: 'SAUDÁVEL',
    icon: CheckCircle2,
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
  },
  atencao: {
    label: 'ATENÇÃO',
    icon: AlertTriangle,
    classes: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  },
  critico: {
    label: 'CRÍTICO',
    icon: XCircle,
    classes: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
  },
}

const BAR_COLOR: Record<ProjetoStatus, string> = {
  saudavel: 'bg-emerald-500',
  atencao: 'bg-amber-500',
  critico: 'bg-red-500',
}

const MARGIN_TEXT: Record<ProjetoStatus, string> = {
  saudavel: 'text-emerald-600 dark:text-emerald-400',
  atencao: 'text-amber-600 dark:text-amber-400',
  critico: 'text-red-600 dark:text-red-400',
}

// ── componente ────────────────────────────────────────────────────────────
export function RankingPorMargem({ byProject, grossMarginTarget }: RankingPorMargemProps) {
  const target = grossMarginTarget ?? 25

  const sorted = [...byProject]
    .filter((p) => p.revenue > 0)
    .sort((a, b) => (b.grossMargin ?? -Infinity) - (a.grossMargin ?? -Infinity))

  const maxMargin = Math.max(...sorted.map((p) => p.grossMargin ?? 0), 1)

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base">Ranking por margem</CardTitle>
        <Link
          to="/portfolio"
          className="text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
        >
          Ver carteira <ChevronRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground px-6 py-8 text-center">
            Nenhum projeto com receita no período selecionado.
          </p>
        ) : (
          <div className="divide-y">
            {sorted.map((project) => {
              const status = getStatus(project.grossMargin, target)
              const cfg = STATUS_CONFIG[status]
              const Icon = cfg.icon
              const barPct =
                project.grossMargin !== null
                  ? Math.min((project.grossMargin / maxMargin) * 100, 100)
                  : 0

              return (
                <div
                  key={project.projectId}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30 transition-colors"
                >
                  {/* Badge */}
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold shrink-0',
                      cfg.classes,
                    )}
                  >
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                  </span>

                  {/* Projeto + cliente */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{project.projectName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {project.clientName}
                      {project.serviceLineLabel ? ` · ${project.serviceLineLabel}` : ''}
                    </p>
                  </div>

                  {/* Receita */}
                  <span className="text-sm font-mono text-muted-foreground shrink-0 hidden sm:block">
                    {formatCompact(project.revenue)}
                  </span>

                  {/* Margem % + meta + barra */}
                  <div className="flex flex-col items-end gap-1 shrink-0 w-28">
                    <div className="flex items-baseline gap-1">
                      <span className={cn('text-sm font-bold tabular-nums', MARGIN_TEXT[status])}>
                        {project.grossMargin !== null
                          ? `${project.grossMargin.toFixed(1)}%`
                          : '—'}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', BAR_COLOR[status])}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Seta */}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
