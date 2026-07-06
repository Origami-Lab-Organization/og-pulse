import { useRef, useCallback } from 'react'
import { useHideValues } from '@/contexts/HideValuesContext'
import html2canvas from 'html2canvas'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { Download } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { DimensionFinancialRow } from '@/hooks/useProjectFinancials'

interface Props {
  rows: DimensionFinancialRow[]
  grossMarginTarget?: number | null
  title?: string
  exportSlug?: string
}

function fmtCurrency(value: number): string {
  if (value >= 1_000_000) return `R$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$${(value / 1_000).toFixed(0)}k`
  return `R$${value}`
}

function fmtPct(value: number | null): string {
  return value !== null ? `${value.toFixed(1)}%` : '—'
}

const COLOR_RECEITA = 'hsl(var(--primary-deep))'
const COLOR_CUSTOS  = 'hsl(var(--muted-foreground) / 0.35)'
const COLOR_MARGEM  = 'hsl(38, 85%, 52%)'

interface TooltipPayload {
  name: string
  value: number | null
  color: string
}

function makeCustomTooltip(hideValues: boolean) {
  return function CustomTooltip({ active, payload, label }: {
    active?: boolean
    payload?: TooltipPayload[]
    label?: string
  }) {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md space-y-1">
        <p className="font-semibold text-popover-foreground mb-1.5">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="font-medium tabular-nums text-popover-foreground">
              {p.name === 'Margem %'
                ? fmtPct(p.value)
                : hideValues ? '•••' : fmtCurrency(p.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    )
  }
}

export function PerformancePorLinhaServico({
  rows,
  grossMarginTarget,
  title = 'Performance por linha de serviço',
  exportSlug = 'linhas-servico',
}: Props) {
  const hideValues = useHideValues()
  const target = grossMarginTarget ?? 25
  const chartRef = useRef<HTMLDivElement>(null)

  const handleExportPng = useCallback(async () => {
    if (!chartRef.current) return
    const now = new Date()
    const mes = String(now.getMonth() + 1).padStart(2, '0')
    const ano = now.getFullYear()
    const canvas = await html2canvas(chartRef.current, { scale: 2 })
    const link = document.createElement('a')
    link.href = canvas.toDataURL('image/png')
    link.download = `${exportSlug}-${mes}${ano}.png`
    link.click()
  }, [exportSlug])

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum dado disponível.
          </p>
        </CardContent>
      </Card>
    )
  }

  const data = [...rows]
    .sort((a, b) => b.revenue - a.revenue)
    .map((row) => ({
      name: row.label,
      Receita: row.revenue,
      Custos: row.costs,
      'Margem %': row.grossMargin,
      numProjetos: row.numProjetos,
    }))

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button variant="outline" size="sm" onClick={handleExportPng} className="h-7 gap-1.5 text-xs">
          <Download className="h-3.5 w-3.5" />
          Exportar PNG
        </Button>
      </CardHeader>
      <CardContent>
        <div ref={chartRef}>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="currency"
                orientation="left"
                tickFormatter={(v) => hideValues ? '•••' : fmtCurrency(v)}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={60}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
                domain={[0, 'auto']}
                width={42}
              />
              <Tooltip content={makeCustomTooltip(hideValues)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine
                yAxisId="pct"
                y={target}
                stroke={COLOR_MARGEM}
                strokeDasharray="4 3"
                strokeOpacity={0.5}
                label={{ value: `Meta ${target}%`, position: 'insideTopRight', fontSize: 10, fill: COLOR_MARGEM }}
              />
              <Bar yAxisId="currency" dataKey="Receita" fill={COLOR_RECEITA} radius={[4, 4, 0, 0]} maxBarSize={48} />
              <Bar yAxisId="currency" dataKey="Custos"  fill={COLOR_CUSTOS}  radius={[4, 4, 0, 0]} maxBarSize={48} />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="Margem %"
                stroke={COLOR_MARGEM}
                strokeWidth={2}
                dot={{ r: 4, fill: COLOR_MARGEM, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
