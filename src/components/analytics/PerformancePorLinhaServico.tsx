import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatPercent } from '@/lib/formatters'
import type { DimensionFinancialRow } from '@/hooks/useProjectFinancials'

interface Props {
  byServiceLine: DimensionFinancialRow[]
  grossMarginTarget?: number | null
}

const BAR_COLOR = 'hsl(152, 55%, 28%)'
const LINE_COLOR = 'hsl(38, 85%, 52%)'

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {payload.map((p: any) => {
        if (p.value === null || p.value === undefined) return null
        const formatted =
          p.dataKey === 'margin'
            ? `${Number(p.value).toFixed(1)}%`
            : formatCurrency(p.value)
        return (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {formatted}
          </p>
        )
      })}
    </div>
  )
}

export function PerformancePorLinhaServico({ byServiceLine, grossMarginTarget }: Props) {
  const data = byServiceLine
    .filter((s) => s.revenue > 0)
    .map((s) => ({
      label: s.label,
      receita: s.revenue,
      margin: s.grossMargin,
    }))

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Performance por linha de serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-6 text-center">
            Sem dados no período selecionado.
          </p>
        </CardContent>
      </Card>
    )
  }

  const maxReceita = Math.max(...data.map((d) => d.receita), 1)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Performance por linha de serviço</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 44, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                yAxisId="val"
                orientation="left"
                tickFormatter={(v) =>
                  v >= 1_000_000
                    ? `${(v / 1_000_000).toFixed(1)}M`
                    : v >= 1000
                      ? `${Math.round(v / 1000)}k`
                      : String(v)
                }
                tick={{ fontSize: 11 }}
                domain={[0, Math.ceil(maxReceita * 1.2)]}
                width={52}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11 }}
                domain={[0, 100]}
                width={36}
              />
              <Tooltip content={<ChartTooltip />} />

              <Bar
                yAxisId="val"
                dataKey="receita"
                name="Receita"
                fill={BAR_COLOR}
                radius={[3, 3, 0, 0]}
                barSize={32}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={BAR_COLOR} />
                ))}
              </Bar>

              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="margin"
                name="Margem %"
                stroke={LINE_COLOR}
                strokeWidth={2}
                dot={{ r: 4, fill: LINE_COLOR }}
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
