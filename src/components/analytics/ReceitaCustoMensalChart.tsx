import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell, ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/formatters'
import type { FinancialMonthlyPoint } from '@/hooks/useFinancialEvolution'
import { useHideValues } from '@/contexts/HideValuesContext'

interface Props {
  data: (FinancialMonthlyPoint & { isHighlighted?: boolean })[]
}

const RECEITA_COLOR = 'hsl(var(--primary-deep))'
const CUSTO_COLOR   = 'hsl(var(--muted-foreground) / 0.35)'
const MARGIN_COLOR  = 'hsl(38, 85%, 52%)'

function makeChartTooltip(hideValues: boolean) {
  return function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
        <p className="mb-1 font-medium capitalize">{label}</p>
        {payload.map((p: any) => {
          if (p.value === null || p.value === undefined) return null
          const formatted = hideValues
            ? '•••'
            : p.dataKey === 'marginPct'
              ? `${Number(p.value).toFixed(1)}%`
              : formatCurrency(p.value * 1000)
          return (
            <p key={p.dataKey} style={{ color: p.color }}>
              {p.name}: {formatted}
            </p>
          )
        })}
      </div>
    )
  }
}

export function ReceitaCustoMensalChart({ data }: Props) {
  const hideValues = useHideValues()
  const highlighted = data.filter((m) => m.isHighlighted)
  const source = highlighted.length > 0 ? highlighted : data

  const chartData = source.map((m) => ({
    label: m.label,
    receita: m.isPast || m.isCurrent ? m.revenueReal / 1000 : null,
    custo: m.isPast || m.isCurrent ? m.totalCosts / 1000 : null,
    marginPct: m.isPast ? (m.grossMarginPct ?? null) : null,
  }))

  const maxVal = Math.max(
    ...chartData.map((d) => Math.max(d.receita ?? 0, d.custo ?? 0)),
    1,
  )

  // Ticks do eixo de Margem % — base 15 para alinhar com gridlines
  const maxMargin = Math.max(...chartData.map((d) => d.marginPct ?? 0), 1)
  const marginStep = 15
  const marginMax = Math.ceil(maxMargin / marginStep) * marginStep
  const marginTicks = Array.from({ length: Math.floor(marginMax / marginStep) + 1 }, (_, i) => i * marginStep)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-base">Receita × Custo mensal</CardTitle>
        <span className="text-xs text-muted-foreground">em R$ mil</span>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 44, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} horizontal={false} />
              {marginTicks.map((y) => (
                <ReferenceLine key={y} yAxisId="pct" y={y} stroke="hsl(var(--border))" strokeDasharray="3 3" strokeWidth={1} />
              ))}
              <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="val"
                orientation="left"
                tickFormatter={(v) => hideValues ? '•••' : (v >= 1 ? `${v.toFixed(0)}` : String(v))}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
                domain={[0, Math.ceil(maxVal * 1.15)]}
                width={40}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickLine={false}
                axisLine={false}
                ticks={marginTicks}
                domain={[0, marginMax]}
                width={36}
              />
              <Tooltip content={makeChartTooltip(hideValues)} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />

              <Bar
                yAxisId="val"
                dataKey="receita"
                name="Receita"
                fill={RECEITA_COLOR}
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={RECEITA_COLOR} />
                ))}
              </Bar>

              <Bar
                yAxisId="val"
                dataKey="custo"
                name="Custo realizado"
                fill={CUSTO_COLOR}
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CUSTO_COLOR} />
                ))}
              </Bar>

              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="marginPct"
                name="Margem %"
                stroke={MARGIN_COLOR}
                strokeWidth={2}
                dot={{ r: 3, fill: MARGIN_COLOR }}
                activeDot={{ r: 5 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
