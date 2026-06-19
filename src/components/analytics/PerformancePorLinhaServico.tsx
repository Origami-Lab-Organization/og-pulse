import { useRef, useCallback } from 'react'
import html2canvas from 'html2canvas'
import { Download, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DimensionFinancialRow } from '@/hooks/useProjectFinancials'
import { useServiceLineSort } from '@/hooks/useServiceLineSort'
import type { ServiceLineSortKey } from '@/hooks/useServiceLineSort'

interface Props {
  byServiceLine: DimensionFinancialRow[]
  grossMarginTarget?: number | null
}

function fmtFull(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(value)
}

function getStatus(margin: number | null, target: number): 'saudavel' | 'atencao' | 'critico' {
  if (margin === null) return 'atencao'
  if (margin >= target + 5) return 'saudavel'
  if (margin >= target - 5) return 'atencao'
  return 'critico'
}

const STATUS_CONFIG = {
  saudavel: { label: 'SAUDÁVEL', icon: CheckCircle2, classes: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' },
  atencao:  { label: 'ATENÇÃO',  icon: AlertTriangle, classes: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
  critico:  { label: 'CRÍTICO',  icon: XCircle,       classes: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800' },
}

const MARGIN_TEXT: Record<string, string> = {
  saudavel: 'text-emerald-600 dark:text-emerald-400',
  atencao:  'text-amber-600 dark:text-amber-400',
  critico:  'text-red-600 dark:text-red-400',
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/50 inline-block" />
  return dir === 'asc'
    ? <ArrowUp   className="ml-1 h-3.5 w-3.5 inline-block" />
    : <ArrowDown className="ml-1 h-3.5 w-3.5 inline-block" />
}

export function PerformancePorLinhaServico({ byServiceLine, grossMarginTarget }: Props) {
  const target = grossMarginTarget ?? 25
  const tableRef = useRef<HTMLDivElement>(null)
  const { sort, toggleSort, sorted } = useServiceLineSort(byServiceLine)

  const handleExportPng = useCallback(async () => {
    if (!tableRef.current) return
    const now = new Date()
    const mes = String(now.getMonth() + 1).padStart(2, '0')
    const ano = now.getFullYear()
    const canvas = await html2canvas(tableRef.current, { scale: 2 })
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `linhas-servico-${mes}${ano}.png`
    link.click()
  }, [])

  if (byServiceLine.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Performance por linha de serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma linha de serviço cadastrada.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-base">Performance por linha de serviço</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExportPng} className="h-7 gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          Exportar PNG
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={tableRef} className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-6 py-3 text-left font-medium text-muted-foreground">
                  <button
                    onClick={() => toggleSort('nome' as ServiceLineSortKey)}
                    className="flex items-center hover:text-foreground transition-colors"
                  >
                    Linha de serviço
                    <SortIcon active={sort.key === 'nome'} dir={sort.direction} />
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground whitespace-nowrap">
                  Nº de projetos
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  <button
                    onClick={() => toggleSort('receita' as ServiceLineSortKey)}
                    className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                  >
                    Receita
                    <SortIcon active={sort.key === 'receita'} dir={sort.direction} />
                  </button>
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">
                  Custos
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  <button
                    onClick={() => toggleSort('margemPct' as ServiceLineSortKey)}
                    className="flex items-center justify-end w-full hover:text-foreground transition-colors"
                  >
                    Margem %
                    <SortIcon active={sort.key === 'margemPct'} dir={sort.direction} />
                  </button>
                </th>
                <th className="px-6 py-3 text-center font-medium text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((row) => {
                const status = getStatus(row.grossMargin, target)
                const cfg    = STATUS_CONFIG[status]
                const Icon   = cfg.icon
                return (
                  <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {row.numProjetos > 0 ? row.numProjetos : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {row.revenue > 0 ? fmtFull(row.revenue) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                      {row.costs > 0 ? fmtFull(row.costs) : '—'}
                    </td>
                    <td className={cn('px-4 py-3 text-right tabular-nums font-bold', MARGIN_TEXT[status])}>
                      {row.grossMargin !== null ? `${row.grossMargin.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex justify-center">
                        <span className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                          cfg.classes,
                        )}>
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
